import os
import sys
import asyncio
from pathlib import Path
from sqlalchemy import select

# Tambahkan root project ke sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.services.ingestion import ingestion_pipeline


def detect_category(filename: str) -> str:
    """Menentukan kategori dokumen berdasarkan nama file."""
    fn_lower = filename.lower()
    if "kuesioner" in fn_lower:
        return "kuesioner"
    elif "pedoman" in fn_lower or "sop" in fn_lower:
        return "sop_lapangan"
    return "laporan_riset"


async def main():
    seeds_dir = BASE_DIR / "backend" / "data" / "seeds"
    if not seeds_dir.exists():
        print(f"Folder {seeds_dir} tidak ditemukan!")
        return

    pdf_files = sorted(list(seeds_dir.glob("*.pdf")))
    print(f"Ditemukan {len(pdf_files)} file PDF untuk di-ingest.\n")

    async with AsyncSessionLocal() as session:
        for idx, pdf_path in enumerate(pdf_files, start=1):
            filename = pdf_path.name
            title = pdf_path.stem
            category = detect_category(filename)

            # Cek apakah file sudah pernah di-ingest
            stmt = select(Document).where(Document.filename == filename)
            res = await session.execute(stmt)
            existing_doc = res.scalar_one_or_none()

            if existing_doc and existing_doc.status == "indexed":
                print(f"[{idx}/{len(pdf_files)}] SKIP: '{filename}' sudah terindeks.")
                continue

            print(f"[{idx}/{len(pdf_files)}] Memproses '{filename}' (Kategori: {category})...")

            try:
                doc = await ingestion_pipeline.ingest_document(
                    file_path=str(pdf_path),
                    title=title,
                    category=category,
                    db=session
                )
                print(f"  -> SUKSES! Document ID: {doc.id}")
                print(f"  -> Total Halaman: {doc.total_pages}")
            except Exception as e:
                print(f"  -> GAGAL memproses '{filename}': {e}")

        # Tampilkan ringkasan data di database
        total_docs_res = await session.execute(select(Document))
        all_docs = total_docs_res.scalars().all()
        print("\n================ RINGKASAN DATABASE ================")
        print(f"Total Dokumen Terdaftar: {len(all_docs)}")

        for d in all_docs:
            chunk_count_res = await session.execute(
                select(DocumentChunk).where(DocumentChunk.document_id == d.id)
            )
            chunks = chunk_count_res.scalars().all()
            print(f"- {d.title[:40]:<40} | Kategori: {d.category:<15} | Hal: {d.total_pages:<3} | Chunks: {len(chunks):<4} | Status: {d.status}")
        print("====================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
