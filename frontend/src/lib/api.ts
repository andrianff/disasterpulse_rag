import { CategoryOption, CitationSource, DocumentInfo, StreamEvent } from "@/types/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCategories(): Promise<CategoryOption[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/documents/categories`);
        if (!res.ok) throw new Error("Gagal mengambil data kategori");
        const data = await res.json();

        const categories: CategoryOption[] = [
            { value: null, label: "Semua Kategori" }
        ];

        if (data && data.categories) {
            data.categories.forEach((cat: { category: string; count: number }) => {
                let label = cat.category;
                if (cat.category === "sop_lapangan") label = "SOP Lapangan";
                else if (cat.category === "kuesioner") label = "Kuesioner";
                else if (cat.category === "laporan_riset") label = "Laporan Riset";

                categories.push({
                    value: cat.category,
                    label: `${label} (${cat.count})`,
                    document_count: cat.count,
                });
            });
        }

        return categories;
    } catch (err) {
        console.error("fetchCategories error:", err);
        return [{ value: null, label: "Semua Kategori" }];
    }
}

export async function fetchDocuments(category?: string | null): Promise<DocumentInfo[]> {
    try {
        const url = new URL(`${API_BASE_URL}/api/v1/documents`);
        if (category) {
            url.searchParams.append("category", category);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Gagal mengambil daftar dokumen");
        const data = await res.json();
        return data.documents || [];
    } catch (err) {
        console.error("fetchDocuments error:", err);
        return [];
    }
}

export async function streamChatQuery({
    query,
    conversationHistory = [],
    categoryFilter = null,
    onSources,
    onToken,
    onDone,
    onError,
    signal,
}: {
    query: string;
    conversationHistory?: { role: string; content: string }[];
    categoryFilter?: string | null;
    onSources: (sources: CitationSource[]) => void;
    onToken: (token: string) => void;
    onDone: () => void;
    onError: (errorMsg: string) => void;
    signal?: AbortSignal;
}): Promise<void> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                conversation_history: conversationHistory,
                category_filter: categoryFilter || null,
                top_k: 5,
            }),
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server merespons dengan status ${response.status}: ${errorText}`);
        }

        if (!response.body) {
            throw new Error("ReadableStream tidak didukung pada browser.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;

                const jsonStr = trimmed.substring(5).trim();
                try {
                    const event: StreamEvent = JSON.parse(jsonStr);

                    if (event.type === "sources" && event.sources) {
                        onSources(event.sources);
                    } else if (event.type === "token" && event.content) {
                        onToken(event.content);
                    } else if (event.type === "done") {
                        onDone();
                    } else if (event.type === "error" && event.error) {
                        onError(event.error);
                    }
                } catch (jsonErr) {
                    console.warn("Gagal parse chunk SSE:", jsonStr, jsonErr);
                }
            }
        }

        onDone();
    } catch (error: any) {
        if (error.name === "AbortError") {
            console.log("Chat stream dibatalkan oleh user.");
            return;
        }
        console.error("StreamChat error:", error);
        onError(error.message || "Terjadi kesalahan koneksi ke server.");
    }
}
