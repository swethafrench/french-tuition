-- Invoices table: one invoice per student per month
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month           text NOT NULL,                      -- YYYY-MM
  hours_attended  numeric(5,1) NOT NULL DEFAULT 0,    -- actual present sessions × hours
  hours_billed    numeric(5,1) NOT NULL DEFAULT 0,    -- may differ if teacher overrides
  hourly_rate     numeric(10,2) NOT NULL DEFAULT 0,
  amount          numeric(10,2) NOT NULL DEFAULT 0,   -- hours_billed × hourly_rate (or fixed)
  fee_type        text NOT NULL DEFAULT 'fixed',      -- 'fixed' | 'hourly'
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','paid','overdue')),
  sent_at         timestamptz,
  paid_at         timestamptz,
  payment_mode    text,
  upi_txn_id      text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (student_id, month)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS invoices_month_idx ON invoices(month);
CREATE INDEX IF NOT EXISTS invoices_student_idx ON invoices(student_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON invoices USING (true) WITH CHECK (true);
