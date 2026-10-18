import logging
from typing import List, AsyncGenerator, Optional
import google.generativeai as genai

from backend.app.core.config import settings
from backend.app.schemas.chat import (
    ChatMessage, 
    CitationSource, 
    ChatResponse, 
    StreamTokenPayload
)
from backend.app.services.retrieval import RetrievedChunk

logger = logging.getLogger(__name__)

# Konfigurasi Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """Anda adalah "DisasterPulse AI", asisten riset intelijen tanggap darurat bencana untuk survei BPS (Badan Pusat Statistik) dan penanggulangan dampak bencana di Indonesia.

ATURAN UTAMA (WAJIB DIPATUHI):
1. Jawab pertanyaan pengguna secara akurat, lugas, profesional, dan terstruktur HANYA berdasarkan KONTEN REFERENSI DOKUMEN yang disediakan di bawah ini.
2. WAJIB menyertakan sitasi dalam teks menggunakan format kurung siku seperti [1], [2], dst. pada setiap fakta penting, data angka, atau rujukan yang Anda berikan. Angka sitasi harus sesuai dengan nomor indeks dokumen pada daftar referensi.
3. ANTI-HALUSINASI: JANGAN PERNAH mengarang jawaban atau menggunakan informasi di luar dokumen referensi yang diberikan.
4. Jika dokumen referensi TIDAK memuat informasi yang cukup untuk menjawab pertanyaan secara pasti, nyatakan secara transparan: "Berdasarkan dokumen yang tersedia, informasi mengenai hal tersebut tidak ditemukan."
5. Gunakan format Markdown yang rapi (poin-poin, penekanan bold, atau tabel ringkas jika relevan) agar mudah dibaca oleh tim lapangan.
"""


class LLMGenerationService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.LLM_MODEL
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=SYSTEM_PROMPT
        )

    def _build_context_prompt(self, query: str, retrieved_chunks: List[RetrievedChunk]) -> str:
        """Menyusun teks konteks dokumen referensi untuk dikirim ke LLM."""
        if not retrieved_chunks:
            return f"Pertanyaan: {query}\n\n(Catatan: Tidak ada dokumen referensi yang relevan ditemukan di database)"

        context_blocks = []
        for idx, chunk in enumerate(retrieved_chunks, start=1):
            category_tag = chunk.category.upper().replace("_", " ")
            block = (
                f"[{idx}] Dokumen: {chunk.document_title}\n"
                f"    Kategori : {category_tag}\n"
                f"    Halaman  : {chunk.page_number} (Chunk #{chunk.chunk_index})\n"
                f"    Konten:\n{chunk.content.strip()}\n"
                f"--------------------------------------------------"
            )
            context_blocks.append(block)

        context_text = "\n".join(context_blocks)
        prompt = (
            f"KONTEN REFERENSI DOKUMEN:\n"
            f"{context_text}\n\n"
            f"INSTRUKSI: Gunakan referensi dokumen [1], [2], dst. di atas untuk menjawab pertanyaan berikut dengan menyertakan sitasi [X].\n\n"
            f"Pertanyaan Pengguna: {query}"
        )
        return prompt

    def _format_history_and_prompt(
        self, 
        prompt: str, 
        history: Optional[List[ChatMessage]] = None
    ) -> List[dict]:
        """Mengonversi chat history ke format percakapan Gemini."""
        contents = []
        if history:
            for msg in history:
                role = "model" if msg.role == "assistant" else "user"
                contents.append({"role": role, "parts": [msg.content]})

        contents.append({"role": "user", "parts": [prompt]})
        return contents

    def _extract_citation_sources(self, retrieved_chunks: List[RetrievedChunk]) -> List[CitationSource]:
        """Mengekstrak metadata sitasi sumber dokumen."""
        sources = []
        for idx, chunk in enumerate(retrieved_chunks, start=1):
            snippet = chunk.content[:220].replace("\n", " ").strip()
            sources.append(
                CitationSource(
                    citation_id=idx,
                    document_title=chunk.document_title,
                    category=chunk.category,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    score=chunk.score,
                    snippet=f"{snippet}..."
                )
            )
        return sources

    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        history: Optional[List[ChatMessage]] = None,
        temperature: float = 0.2
    ) -> ChatResponse:
        """Menghasilkan jawaban lengkap RAG tanpa streaming."""
        prompt = self._build_context_prompt(query, retrieved_chunks)
        contents = self._format_history_and_prompt(prompt, history)
        sources = self._extract_citation_sources(retrieved_chunks)

        try:
            response = await self.model.generate_content_async(
                contents=contents,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=2048,
                )
            )
            answer_text = response.text if response.text else "Maaf, respon tidak dapat dihasilkan."
            return ChatResponse(
                query=query,
                answer=answer_text,
                sources=sources
            )
        except Exception as e:
            logger.error(f"Error pada generate_answer: {str(e)}")
            raise

    async def stream_generate_answer(
        self,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        history: Optional[List[ChatMessage]] = None,
        temperature: float = 0.2
    ) -> AsyncGenerator[StreamTokenPayload, None]:
        """Menghasilkan streaming token per token secara real-time via AsyncGenerator."""
        prompt = self._build_context_prompt(query, retrieved_chunks)
        contents = self._format_history_and_prompt(prompt, history)
        sources = self._extract_citation_sources(retrieved_chunks)

        # 1. Kirim metadata sitasi terlebih dahulu ke klien
        yield StreamTokenPayload(type="sources", sources=sources)

        # 2. Stream potongan jawaban dari Gemini
        try:
            response = await self.model.generate_content_async(
                contents=contents,
                stream=True,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=2048,
                )
            )

            async for chunk in response:
                if chunk.text:
                    yield StreamTokenPayload(type="token", content=chunk.text)

            # 3. Kirim sinyal selesai
            yield StreamTokenPayload(type="done")

        except Exception as e:
            logger.error(f"Error streaming LLM: {str(e)}")
            yield StreamTokenPayload(type="error", error=str(e))


llm_service = LLMGenerationService()
