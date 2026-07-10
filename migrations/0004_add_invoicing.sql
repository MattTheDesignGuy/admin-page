CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL UNIQUE,
  attention TEXT,
  address_lines TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id),
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  reference TEXT,
  line_items TEXT NOT NULL,
  deposit REAL NOT NULL DEFAULT 0,
  deposit_label TEXT,
  subtotal REAL NOT NULL,
  gst_total REAL NOT NULL,
  total REAL NOT NULL,
  amount_due REAL NOT NULL,
  file_key TEXT NOT NULL,
  record_id TEXT NOT NULL REFERENCES records(id),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_invoices_number ON invoices (invoice_number);
