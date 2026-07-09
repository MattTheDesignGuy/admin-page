ALTER TABLE records ADD COLUMN file_hash TEXT;

CREATE INDEX idx_records_file_hash ON records (file_hash);
