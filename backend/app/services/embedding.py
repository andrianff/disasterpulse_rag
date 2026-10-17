from typing import List
import google.generativeai as genai
from backend.app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

class EmbeddingService:
    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """Menghasilkan embedding 768-dim untuk teks tunggal."""
        result = genai.embed_content(
            model=settings.EMBEDDING_MODEL,
            content=text,
            output_dimensionality=settings.EMBEDDING_DIM,
            task_type="retrieval_document"
        )
        return result["embedding"]
    
    @staticmethod
    def get_query_embedding(query: str) -> List[float]:
        """Menghasilkan embedding untuk query pencarian pengguna."""
        result = genai.embed_content(
            model=settings.EMBEDDING_MODEL,
            content=query,
            output_dimensionality=settings.EMBEDDING_DIM,
            task_type="retrieval_query"
        )
        return result["embedding"]

    @staticmethod
    def get_embeddings_batch(texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """Menghasilkan embedding secara batch untuk efisiensi kuota API."""
        embeddings: List[List[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            result = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=batch,
                output_dimensionality=settings.EMBEDDING_DIM,
                task_type="retrieval_document"
            )
            embeddings.extend(result["embedding"])
        
        return embeddings

embedding_service = EmbeddingService()