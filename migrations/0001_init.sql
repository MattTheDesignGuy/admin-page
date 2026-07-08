CREATE TABLE records (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  gst_status TEXT NOT NULL CHECK (gst_status IN ('free', 'amount')),
  gst_amount REAL NOT NULL DEFAULT 0,
  category TEXT,
  reference TEXT,
  file_key TEXT,
  file_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_records_type_date ON records (type, date);
CREATE INDEX idx_records_date ON records (date);
