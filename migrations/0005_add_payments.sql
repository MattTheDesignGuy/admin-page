-- Partial-payment tracking for income records. amount_paid is the running
-- total of payments logged against a record; paid stays a derived
-- "fully paid" flag (amount_paid >= amount) so existing paid/unpaid
-- filtering keeps working unchanged.
ALTER TABLE records ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0;

-- Backfill: existing paid=1 income rows are fully paid; everything else
-- (expenses, unpaid income) has received nothing yet.
UPDATE records SET amount_paid = amount WHERE type = 'income' AND paid = 1;

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES records(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_payments_record ON payments (record_id);
