import sys
import asyncio
from pathlib import Path

# Tambahkan root project ke sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from backend.app.core.database import AsyncSessionLocal
from backend.app.services.retrieval import retrieval_service


TEST_QUERIES = [
    {
        "query": "kuesioner pendataan fasilitas air bersih dan sanitasi di posko",
        "category": "kuesioner",
        "description": "Mencari instrumen survei sanitasi & air bersih"
    },
    {
        "query": "SOP tata cara pengisian kuesioner dan etika wawancara responden",
        "category": "sop_lapangan",
        "description": "Mencari pedoman teknis wawancara pencacah lapangan"
    },
    {
        "query": "dampak gempa bumi terhadap infrastruktur perumahan penduduk",
        "category": None,  # Pencarian lintas seluruh dokumen
        "description": "Mencari analisis dampak kerusakan pemukiman akibat bencana"
    }
]


async def run_evaluation():
    print("=" * 75)
    print(" 🔍 EVALUASI HYBRID RETRIEVAL & RECIPROCAL RANK FUSION (RRF)")
    print("=" * 75)

    async with AsyncSessionLocal() as session:
        for idx, item in enumerate(TEST_QUERIES, start=1):
            q = item["query"]
            cat = item["category"]
            desc = item["description"]

            print(f"\n[{idx}] QUERY: '{q}'")
            print(f"    Target: {desc}")
            print(f"    Filter Kategori: {cat if cat else 'SEMUA KATEGORI'}")
            print("-" * 75)

            results = await retrieval_service.search(
                query=q,
                db=session,
                top_k=3,
                candidate_k=20,
                category=cat
            )

            if not results:
                print("    (Tidak ada dokumen yang cocok)")
                continue

            for rank, r in enumerate(results, start=1):
                dense_info = f"Rank {r.dense_rank}" if r.dense_rank else "-"
                sparse_info = f"Rank {r.sparse_rank}" if r.sparse_rank else "-"
                snippet = r.content[:160].replace("\n", " ").strip()

                print(f"  #{rank} [Score RRF: {r.score:.5f}]")
                print(f"      Dokumen : {r.document_title} (Hal: {r.page_number}) | Kat: {r.category}")
                print(f"      Ranking : Dense ({dense_info}) | Sparse ({sparse_info})")
                print(f"      Cuplikan: \"{snippet}...\"\n")

    print("=" * 75)
    print("✅ Evaluasi Selesai.")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(run_evaluation())
