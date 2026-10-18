import sys
import asyncio
from pathlib import Path

# Tambahkan root project ke sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from backend.app.core.database import AsyncSessionLocal
from backend.app.services.retrieval import retrieval_service
from backend.app.services.llm import llm_service


TEST_CASES = [
    {
        "title": "SKENARIO 1: Pertanyaan Faktual Berbasis Dokumen",
        "query": "Bagaimana aturan dan etika pengambilan foto responden saat wawancara di lapangan?",
        "category": "sop_lapangan"
    },
    {
        "title": "SKENARIO 2: Uji Anti-Halusinasi (Pertanyaan di Luar Dokumen)",
        "query": "Siapakah pemenang piala dunia sepak bola tahun 2022 di Qatar?",
        "category": None
    }
]


async def run_pipeline_test():
    print("=" * 75)
    print(" 🚀 PENGUJIAN END-TO-END RAG PIPELINE (RETRIEVAL + GEMINI STREAMING)")
    print("=" * 75)

    async with AsyncSessionLocal() as session:
        for case in TEST_CASES:
            print(f"\n>>> {case['title']}")
            print(f"Pertanyaan : '{case['query']}'")
            print(f"Filter     : {case['category'] or 'Semua Dokumen'}")
            print("-" * 75)

            # 1. Hybrid Retrieval
            retrieved_chunks = await retrieval_service.search(
                query=case["query"],
                db=session,
                top_k=4,
                category=case["category"]
            )

            # 2. Streaming LLM Generation
            print("Jawaban AI (Streaming):")
            sources_received = []

            async for payload in llm_service.stream_generate_answer(
                query=case["query"],
                retrieved_chunks=retrieved_chunks,
                temperature=0.1
            ):
                if payload.type == "sources":
                    sources_received = payload.sources or []
                elif payload.type == "token":
                    # Cetak token secara real-time ke console
                    sys.stdout.write(payload.content)
                    sys.stdout.flush()
                elif payload.type == "error":
                    print(f"\n[ERROR]: {payload.error}")
                elif payload.type == "done":
                    print("\n")

            # 3. Tampilkan Sitasi Sumber Dokumen
            if sources_received:
                print("📚 Referensi Sumber Dokumen:")
                for s in sources_received:
                    print(f"   [{s.citation_id}] {s.document_title} (Hal: {s.page_number}) - Skor: {s.score:.4f}")
            print("=" * 75)


if __name__ == "__main__":
    asyncio.run(run_pipeline_test())
