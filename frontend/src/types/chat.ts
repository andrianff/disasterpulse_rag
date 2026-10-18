export interface CitationSource {
    citation_id: number;
    document_title: string;
    category: string;
    page_number: number;
    chunk_index: number;
    score: number;
    snippet: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: CitationSource[];
    isStreaming?: boolean;
    timestamp: Date;
}

export interface CategoryOption {
    value: string | null;
    label: string;
    document_count?: number;
}

export interface DocumentInfo {
    id: string;
    title: string;
    filename: string;
    category: string;
    total_pages: number;
    file_size_bytes: number;
    status: string;
}

export interface StreamEvent {
    type: "sources" | "token" | "done" | "error";
    content?: string | null;
    sources?: CitationSource[] | null;
    error?: string | null;
}
