import os
import re
import uuid
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import tiktoken
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.services.embedding import embedding_service


class IngestionPipeline:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Estimasi token bahasa Indonesia menggunakan tokenizer cl100k_base
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    def extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Mengekstrak teks halaman demi halaman dari dokumen PDF."""
        doc = fitz.open(file_path)
        pages_content = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if text:
                pages_content.append({
                    "page_number": page_num + 1,
                    "text": text
                })
        doc.close()
        return pages_content

    def extract_metadata_from_text(self, text: str) -> Dict[str, Any]:
        """Ekstraksi metadata heuristik (lokasi/wilayah bencana umum)."""
        metadata: Dict[str, Any] = {}
        # Contoh pattern deteksi wilayah Indonesia
        locations = ["Aceh", "Banda Aceh", "Aceh Utara", "Pidie", "Baktiya", "Sumatera", "Jawa", "Sulawesi"]
        detected_locs = [loc for loc in locations if re.search(rf"\b{re.escape(loc)}\b", text, re.IGNORECASE)]
        if detected_locs:
            metadata["locations"] = detected_locs
        return metadata

    def split_text_into_chunks(self, text: str) -> List[str]:
        """Recursive chunking dengan token limit dan overlap."""
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(tokens):
            end = min(start + self.chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            chunks.append(chunk_text.strip())
            if end == len(tokens):
                break
            start += (self.chunk_size - self.chunk_overlap)
        return chunks

    async def ingest_document(
        self,
        file_path: str,
        title: str,
        category: str,
        db: AsyncSession
    ) -> Document:
        """Memproses PDF: ekstraksi, chunking, embedding, dan persistensi ke database."""
        file_size = os.path.getsize(file_path)
        filename = os.path.basename(file_path)

        # 1. Simpan dokumen master
        doc_record = Document(
            title=title,
            filename=filename,
            category=category,
            file_size_bytes=file_size,
            status="processing"
        )
        db.add(doc_record)
        await db.flush()  # Dapatkan ID dokumen sebelum membuat chunks

        try:
            # 2. Ekstrak halaman PDF
            pages = self.extract_text_from_pdf(file_path)
            doc_record.total_pages = len(pages)

            all_chunks_data = []
            chunk_texts_for_embedding = []
            global_chunk_idx = 0

            # 3. Chunking per halaman agar page_number akurat untuk sitasi UI
            for p in pages:
                page_chunks = self.split_text_into_chunks(p["text"])
                for chunk_text in page_chunks:
                    meta = self.extract_metadata_from_text(chunk_text)
                    meta["page"] = p["page_number"]
                    token_count = self.count_tokens(chunk_text)

                    all_chunks_data.append({
                        "chunk_index": global_chunk_idx,
                        "page_number": p["page_number"],
                        "content": chunk_text,
                        "token_count": token_count,
                        "metadata": meta
                    })
                    chunk_texts_for_embedding.append(chunk_text)
                    global_chunk_idx += 1

            # 4. Generate Embeddings secara batch
            if chunk_texts_for_embedding:
                embeddings = embedding_service.get_embeddings_batch(chunk_texts_for_embedding)

                # 5. Buat entitas DocumentChunk
                for data, emb in zip(all_chunks_data, embeddings):
                    chunk_entity = DocumentChunk(
                        document_id=doc_record.id,
                        chunk_index=data["chunk_index"],
                        page_number=data["page_number"],
                        content=data["content"],
                        token_count=data["token_count"],
                        metadata_=data["metadata"],
                        embedding=emb
                    )
                    db.add(chunk_entity)

            doc_record.status = "indexed"
            await db.commit()
            await db.refresh(doc_record)
            return doc_record

        except Exception as e:
            await db.rollback()
            doc_record.status = "failed"
            await db.commit()
            raise e


ingestion_pipeline = IngestionPipeline()
