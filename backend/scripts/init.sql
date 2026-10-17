-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Master Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'laporan_riset', 'kuesioner', 'sop_lapangan'
    file_size_bytes BIGINT NOT NULL,
    total_pages INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'processing', -- 'processing', 'indexed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks & Vector Store Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    page_number INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. {"province": "Aceh", "subdistrict": "Baktiya"}
    embedding vector(768), -- 768 dimensi untuk Google text-embedding-004
    tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('indonesian', content)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP    
);

-- 4. Performance Indexes
-- HNSW Vector Index untuk Dense Retrieval (Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- GIN Index untuk Sparse / Full-Text Search (Lexical BM25/FTS)
CREATE INDEX IF NOT EXISTS idx_chunks_tsv_gin ON document_chunks USING gin (tsv_content);

-- Foreign Key Index
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);

-- GIN Index untuk Filter Metadata JSONB
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin ON document_chunks USING gin (metadata);
