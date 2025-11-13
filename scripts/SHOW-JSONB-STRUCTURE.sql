-- Show JSONB structure from raw tables
-- This will help us see what data is actually available in raw_data

-- 1. Get one revenue_days_raw record with formatted JSONB
SELECT 
  id,
  date,
  environment_id,
  eitje_id,
  -- Show normalized columns (may be NULL/0)
  total_revenue,
  revenue,
  net_revenue,
  gross_revenue,
  vat_amount,
  vat_percentage,
  cash_revenue,
  card_revenue,
  digital_revenue,
  currency,
  transaction_count,
  -- Show full JSONB structure (formatted as JSON text)
  jsonb_pretty(raw_data) as raw_data_json_formatted
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, id
LIMIT 1;

-- 2. Check all JSONB keys available in raw_data
SELECT DISTINCT
  jsonb_object_keys(raw_data) as jsonb_key
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY jsonb_key;

-- 3. Show sample raw_data structure (non-formatted, for copying)
SELECT 
  id,
  date,
  environment_id,
  raw_data::text as raw_data_json
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, id
LIMIT 1;

-- 4. Check time_registration_shifts_raw JSONB structure
SELECT 
  id,
  date,
  environment_id,
  team_id,
  user_id,
  hours_worked,
  break_minutes,
  wage_cost,
  jsonb_pretty(raw_data) as raw_data_json_formatted
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, id
LIMIT 1;

-- 5. Check what keys exist in time_registration_shifts_raw JSONB
SELECT DISTINCT
  jsonb_object_keys(raw_data) as jsonb_key
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY jsonb_key;

