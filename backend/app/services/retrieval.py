import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.app.services.embedding import embedding_service


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    document_title: str
    category: str
    page_number: int
    chunk_index: int
    content: str
    metadata: Dict[str, Any]
    dense_rank: Optional[int] = None
    sparse_rank: Optional[int] = None
    score: float = 0.0


class HybridRetrievalService:
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    async def dense_search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 20,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Pencarian semantik berbasis Cosine Similarity pgvector."""
        query_vector = embedding_service.get_query_embedding(query)

        filter_clause = "AND d.category = :category" if category else ""
        sql = text(f"""
            SELECT 
                c.id AS chunk_id,
                c.document_id,
                d.title AS document_title,
                d.category,
                c.page_number,
                c.chunk_index,
                c.content,
                c.metadata,
                1 - (c.embedding <=> CAST(:query_vector AS vector)) AS raw_score
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL {filter_clause}
            ORDER BY c.embedding <=> CAST(:query_vector AS vector) ASC
            LIMIT :top_k;
        """)

        params: Dict[str, Any] = {
            "query_vector": str(query_vector),
            "top_k": top_k
        }
        if category:
            params["category"] = category

        result = await db.execute(sql, params)
        rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def sparse_search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 20,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Pencarian leksikal berbasis PostgreSQL Full-Text Search (BM25 / ts_rank_cd)."""
        # Bersihkan karakter spesial yang berpotensi merusak sintaks tsquery
        clean_query = "".join([c if c.isalnum() or c.isspace() else " " for c in query]).strip()
        if not clean_query:
            return []

        filter_clause = "AND d.category = :category" if category else ""
        sql = text(f"""
            SELECT 
                c.id AS chunk_id,
                c.document_id,
                d.title AS document_title,
                d.category,
                c.page_number,
                c.chunk_index,
                c.content,
                c.metadata,
                ts_rank_cd(c.tsv_content, websearch_to_tsquery('indonesian', :clean_query)) AS raw_score
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.tsv_content @@ websearch_to_tsquery('indonesian', :clean_query) {filter_clause}
            ORDER BY raw_score DESC
            LIMIT :top_k;
        """)

        params: Dict[str, Any] = {
            "clean_query": clean_query,
            "top_k": top_k
        }
        if category:
            params["category"] = category

        result = await db.execute(sql, params)
        rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 5,
        candidate_k: int = 20,
        category: Optional[str] = None,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0
    ) -> List[RetrievedChunk]:
        """
        Hybrid Search:
        1. Menjalankan dense_search dan sparse_search secara paralel (asyncio.gather).
        2. Menggabungkan ranking keduanya menggunakan Reciprocal Rank Fusion (RRF).
        """
        # Eksekusi dense dan sparse secara berurutan pada session yang sama
        dense_results = await self.dense_search(
            query=query, db=db, top_k=candidate_k, category=category
        )
        sparse_results = await self.sparse_search(
            query=query, db=db, top_k=candidate_k, category=category
        )


        rrf_map: Dict[str, Dict[str, Any]] = {}

        # 1. Hitung skor RRF untuk hasil Dense
        for rank, item in enumerate(dense_results, start=1):
            chunk_id = str(item["chunk_id"])
            if chunk_id not in rrf_map:
                rrf_map[chunk_id] = {
                    "item": item,
                    "dense_rank": rank,
                    "sparse_rank": None,
                    "rrf_score": 0.0
                }
            rrf_map[chunk_id]["dense_rank"] = rank
            rrf_map[chunk_id]["rrf_score"] += dense_weight * (1.0 / (self.rrf_k + rank))

        # 2. Hitung skor RRF untuk hasil Sparse
        for rank, item in enumerate(sparse_results, start=1):
            chunk_id = str(item["chunk_id"])
            if chunk_id not in rrf_map:
                rrf_map[chunk_id] = {
                    "item": item,
                    "dense_rank": None,
                    "sparse_rank": rank,
                    "rrf_score": 0.0
                }
            rrf_map[chunk_id]["sparse_rank"] = rank
            rrf_map[chunk_id]["rrf_score"] += sparse_weight * (1.0 / (self.rrf_k + rank))

        # 3. Urutkan berdasarkan total RRF score tertinggi
        sorted_chunks = sorted(
            rrf_map.values(), 
            key=lambda x: x["rrf_score"], 
            reverse=True
        )[:top_k]

        final_results = []
        for entry in sorted_chunks:
            it = entry["item"]
            final_results.append(
                RetrievedChunk(
                    chunk_id=str(it["chunk_id"]),
                    document_id=str(it["document_id"]),
                    document_title=it["document_title"],
                    category=it["category"],
                    page_number=it["page_number"],
                    chunk_index=it["chunk_index"],
                    content=it["content"],
                    metadata=it["metadata"] or {},
                    dense_rank=entry["dense_rank"],
                    sparse_rank=entry["sparse_rank"],
                    score=round(entry["rrf_score"], 5)
                )
            )

        return final_results


retrieval_service = HybridRetrievalService()
