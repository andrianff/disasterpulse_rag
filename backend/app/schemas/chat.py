from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class CitationSource(BaseModel):
    citation_id: int = Field(..., description="ID sitasi yang dirujuk dalam teks jawaban, misal [1], [2]")
    document_title: str
    category: str
    page_number: int
    chunk_index: int
    score: float
    snippet: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Pertanyaan dari pengguna")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Riwayat percakapan sebelumnya")
    category_filter: Optional[str] = Field(
        default=None, 
        description="Filter kategori dokumen: 'kuesioner', 'sop_lapangan', 'laporan_riset', atau null untuk semua"
    )
    top_k: int = Field(default=5, ge=1, le=15, description="Jumlah potongan dokumen yang dijadikan referensi")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0, description="Kreativitas model (0.0-0.3 untuk jawaban faktual berbasis RAG)")
    stream: bool = Field(default=True, description="Apakah jawaban dikirim secara streaming token per token")


class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: List[CitationSource]


class StreamTokenPayload(BaseModel):
    type: Literal["token", "sources", "done", "error"]
    content: Optional[str] = None
    sources: Optional[List[CitationSource]] = None
    error: Optional[str] = None
