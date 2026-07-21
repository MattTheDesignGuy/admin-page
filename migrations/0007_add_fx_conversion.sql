-- Foreign-currency audit trail for records billed in a currency other than
-- AUD. `amount`/`gst_amount` stay the AUD ledger value everything else in
-- the app already assumes; these columns record what was actually charged
-- and the rate used, so the conversion can be substantiated at tax time.
-- NULL means the record was always AUD (the vast majority of rows).
ALTER TABLE records ADD COLUMN original_currency TEXT;
ALTER TABLE records ADD COLUMN original_amount REAL;
ALTER TABLE records ADD COLUMN fx_rate REAL;
ALTER TABLE records ADD COLUMN fx_rate_date TEXT;
