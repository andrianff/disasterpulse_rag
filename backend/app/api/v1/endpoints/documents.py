import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.core.database import get_db
from backend.app.models import Document, DocumentChunk

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/categories",
    response_model=List[Dict[str, Any]],
    summary="Daftar Kategori Dokumen yang Tersedia"
)
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Mengambil daftar kategori dokumen dan jumlah dokumen di dalamnya."""
    try:
        query = (
            select(
                Document.category,
                func.count(Document.id).label("doc_count")
            )
            .group_by(Document.category)
            .order_by(Document.category)
        )
        result = await db.execute(query)
        categories = []
        for row in result.all():
            label_map = {
                "sop_lapangan": "SOP & Pedoman Lapangan",
                "laporan_pkl": "Buku Laporan Riset PKL",
                "manajemen_operasional": "Manajemen & Operasional"
            }
            categories.append({
                "value": row.category,
                "label": label_map.get(row.category, row.category.replace("_", " ").title()),
                "document_count": row.doc_count
            })
        return categories
    except Exception as e:
        logger.error(f"Gagal mengambil kategori dokumen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "",
    summary="Daftar Semua Dokumen & Statistik Chunk"
)
async def list_documents(db: AsyncSession = Depends(get_db)):
    """Mengambil daftar semua dokumen riset beserta statistik halaman dan chunk-nya."""
    try:
        query = (
            select(
                Document.id,
                Document.title,
                Document.filename,
                Document.category,
                Document.total_pages,
                Document.created_at,
                func.count(DocumentChunk.id).label("total_chunks")
            )
            .outerjoin(DocumentChunk, Document.id == DocumentChunk.document_id)
            .group_by(Document.id)
            .order_by(Document.category, Document.title)
        )
        result = await db.execute(query)
        docs = []
        for row in result.all():
            docs.append({
                "id": str(row.id),
                "title": row.title,
                "filename": row.filename,
                "category": row.category,
                "total_pages": row.total_pages,
                "total_chunks": row.total_chunks,
                "created_at": row.created_at.isoformat() if row.created_at else None
            })
        return docs
    except Exception as e:
        logger.error(f"Gagal mengambil daftar dokumen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
