-- Only meaningful for income records; expenses are unaffected.
-- Defaults to paid so existing rows and normal uploads keep counting
-- toward FY totals unless explicitly marked unpaid.
ALTER TABLE records ADD COLUMN paid INTEGER NOT NULL DEFAULT 1;
