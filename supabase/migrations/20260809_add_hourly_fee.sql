-- Add hourly fee fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'fixed' CHECK (fee_type IN ('fixed','hourly')),
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hours_per_month numeric(5,1) DEFAULT NULL;

COMMENT ON COLUMN students.fee_type IS 'fixed = flat monthly fee, hourly = hourly_rate × hours_per_month';
COMMENT ON COLUMN students.hourly_rate IS 'Rate per hour in Rs. Used when fee_type = hourly';
COMMENT ON COLUMN students.hours_per_month IS 'Total billable hours per month. Auto-derived from batch schedule or manually set.';
