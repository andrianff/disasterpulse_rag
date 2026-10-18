import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.schemas.chat import ChatRequest, ChatResponse, StreamTokenPayload
from backend.app.services.retrieval import retrieval_service
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def sse_event_generator(
    query: str,
    retrieved_chunks: list,
    history: list,
    temperature: float
) -> AsyncGenerator[str, None]:
    """
    Generator yang mengonversi StreamTokenPayload menjadi format
    standar Server-Sent Events (SSE): 'data: {json}\n\n'
    """
    try:
        async for payload in llm_service.stream_generate_answer(
            query=query,
            retrieved_chunks=retrieved_chunks,
            history=history,
            temperature=temperature
        ):
            # Kirim data dalam format SSE
            yield f"data: {payload.model_dump_json()}\n\n"
    except Exception as e:
        logger.error(f"Error pada SSE generator: {str(e)}")
        error_payload = StreamTokenPayload(type="error", error=str(e))
        yield f"data: {error_payload.model_dump_json()}\n\n"


@router.post(
    "/stream",
    summary="Tanya Jawab RAG dengan Real-time Streaming (SSE)",
    description="Endpoint utama untuk frontend interaktif dengan Server-Sent Events (SSE) token per token."
)
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Retrieval chunks menggunakan Hybrid Search + RRF
        retrieved_chunks = await retrieval_service.search(
            query=request.query,
            db=db,
            top_k=request.top_k,
            category=request.category_filter
        )

        # 2. Kembalikan response streaming dengan media_type text/event-stream
        return StreamingResponse(
            sse_event_generator(
                query=request.query,
                retrieved_chunks=retrieved_chunks,
                history=request.history,
                temperature=request.temperature
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream; charset=utf-8",
                "X-Accel-Buffering": "no"  # Mencegah Nginx melakukan buffering
            }
        )
    except Exception as e:
        logger.error(f"Error pada endpoint /stream: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat memproses pertanyaan: {str(e)}"
        )


@router.post(
    "",
    response_model=ChatResponse,
    summary="Tanya Jawab RAG (Non-Streaming)",
    description="Mengembalikan jawaban lengkap sekaligus beserta daftar sitasi dokumen."
)
async def chat_non_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    try:
        retrieved_chunks = await retrieval_service.search(
            query=request.query,
            db=db,
            top_k=request.top_k,
            category=request.category_filter
        )

        response = await llm_service.generate_answer(
            query=request.query,
            retrieved_chunks=retrieved_chunks,
            history=request.history,
            temperature=request.temperature
        )
        return response
    except Exception as e:
        logger.error(f"Error pada endpoint chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat memproses jawaban: {str(e)}"
        )
