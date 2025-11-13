-- IMMEDIATE: Show JSONB structure from one record

-- 1. Show formatted JSONB from revenue_days_raw
SELECT 
  id,
  date,
  environment_id,
  jsonb_pretty(raw_data) as raw_data_json
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, id
LIMIT 1;

-- 2. Show all JSONB keys available
SELECT DISTINCT
  jsonb_object_keys(raw_data) as jsonb_key
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY jsonb_key;

-- 3. Show one record as JSON text (for copying)
SELECT 
  id,
  date,
  raw_data::text as raw_data_json_text
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, id
LIMIT 1;

