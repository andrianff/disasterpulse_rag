import time
from typing import List
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from backend.app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


class EmbeddingService:
    @staticmethod
    def get_embedding(text: str, max_retries: int = 5) -> List[float]:
        """Menghasilkan embedding 768-dim untuk teks tunggal dengan auto-retry."""
        for attempt in range(max_retries):
            try:
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=text,
                    output_dimensionality=settings.EMBEDDING_DIM,
                    task_type="retrieval_document"
                )
                return result["embedding"]
            except ResourceExhausted as e:
                wait_time = 20 * (attempt + 1)
                print(f"[RateLimit 429] Kuota Gemini penuh. Menunggu {wait_time}s sebelum mencoba lagi...")
                time.sleep(wait_time)
        raise RuntimeError("Gagal mendapatkan embedding setelah beberapa kali mencoba.")

    @staticmethod
    def get_query_embedding(query: str, max_retries: int = 3) -> List[float]:
        """Menghasilkan embedding untuk query pencarian pengguna."""
        for attempt in range(max_retries):
            try:
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=query,
                    output_dimensionality=settings.EMBEDDING_DIM,
                    task_type="retrieval_query"
                )
                return result["embedding"]
            except ResourceExhausted:
                time.sleep(10)
        raise RuntimeError("Gagal mendapatkan query embedding.")

    @staticmethod
    def get_embeddings_batch(
        texts: List[str], 
        batch_size: int = 50, 
        max_retries: int = 5
    ) -> List[List[float]]:
        """Menghasilkan embedding secara batch dengan auto-retry rate-limit."""
        embeddings: List[List[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            success = False
            for attempt in range(max_retries):
                try:
                    result = genai.embed_content(
                        model=settings.EMBEDDING_MODEL,
                        content=batch,
                        output_dimensionality=settings.EMBEDDING_DIM,
                        task_type="retrieval_document"
                    )
                    embeddings.extend(result["embedding"])
                    success = True
                    # Jeda sopan 1 detik antar-batch agar tidak melebihi kuota per menit
                    time.sleep(1.0)
                    break
                except ResourceExhausted:
                    wait_time = 20 * (attempt + 1)
                    print(f"  [RateLimit 429] Batch {i//batch_size + 1}: Menunggu {wait_time} detik karena batas kuota per menit...")
                    time.sleep(wait_time)
            
            if not success:
                raise RuntimeError(f"Gagal memproses batch ke-{i//batch_size + 1} setelah {max_retries} percobaan.")

        return embeddings


embedding_service = EmbeddingService()
