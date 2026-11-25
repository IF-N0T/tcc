CREATE TABLE IF NOT EXISTS documents (
 id BIGSERIAL PRIMARY KEY,
 filename TEXT NOT NULL,
 mime_type VARCHAR(100) NOT NULL,
 file_size BIGINT NOT NULL CHECK(file_size > 0),
 processor VARCHAR(60) NOT NULL,
 sha256 CHAR(64) NOT NULL,
 hex_preview TEXT NOT NULL,
 base64_preview TEXT NOT NULL,
 generated_text TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 file_data BYTEA NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
