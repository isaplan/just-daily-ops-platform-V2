-- Check what data is available in raw tables and JSONB structure

-- 1. Check revenue_days_raw - See JSONB structure and normalized columns
SELECT 
  id,
  date,
  environment_id,
  -- Normalized columns
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
  -- JSONB structure (showing as JSON)
  raw_data::text as raw_data_json
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, id
LIMIT 3;

-- 2. Check time_registration_shifts_raw - See JSONB structure
SELECT 
  id,
  date,
  environment_id,
  team_id,
  user_id,
  -- Normalized columns
  hours_worked,
  hours,
  total_hours,
  break_minutes,
  breaks,
  wage_cost,
  start_time,
  end_time,
  -- JSONB structure (showing as JSON)
  raw_data::text as raw_data_json
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, id
LIMIT 3;

-- 3. Check which normalized columns are actually populated in revenue_days_raw
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_revenue IS NOT NULL THEN 1 END) as has_total_revenue,
  COUNT(CASE WHEN revenue IS NOT NULL THEN 1 END) as has_revenue,
  COUNT(CASE WHEN net_revenue IS NOT NULL THEN 1 END) as has_net_revenue,
  COUNT(CASE WHEN gross_revenue IS NOT NULL THEN 1 END) as has_gross_revenue,
  COUNT(CASE WHEN vat_amount IS NOT NULL THEN 1 END) as has_vat_amount,
  COUNT(CASE WHEN vat_percentage IS NOT NULL THEN 1 END) as has_vat_percentage,
  COUNT(CASE WHEN cash_revenue IS NOT NULL THEN 1 END) as has_cash_revenue,
  COUNT(CASE WHEN card_revenue IS NOT NULL THEN 1 END) as has_card_revenue,
  COUNT(CASE WHEN digital_revenue IS NOT NULL THEN 1 END) as has_digital_revenue,
  COUNT(CASE WHEN currency IS NOT NULL THEN 1 END) as has_currency
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 4. Check what's in the JSONB raw_data for revenue
SELECT 
  id,
  date,
  environment_id,
  -- Show JSONB keys
  jsonb_object_keys(raw_data) as jsonb_keys
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 1;

-- 5. See a full JSONB example
SELECT 
  raw_data
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 1;

