-- Check aggregation issues
-- Run this in Supabase SQL Editor

-- 1. Check if aggregated tables exist and their schema
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
ORDER BY table_name, ordinal_position;

-- 2. Check primary keys/unique constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
ORDER BY tc.table_name, kcu.ordinal_position;

-- 3. Check raw data structure (sample)
SELECT 
  'time_registration_shifts' as source,
  id,
  date,
  environment_id,
  raw_data->'environment'->>'id' as env_id_from_raw,
  raw_data->'user'->>'id' as user_id_from_raw,
  raw_data->>'start' as start_time,
  raw_data->>'end' as end_time
FROM eitje_time_registration_shifts_raw
LIMIT 3

UNION ALL

SELECT 
  'revenue_days' as source,
  id::text,
  date,
  environment_id::text,
  raw_data->'environment'->>'id' as env_id_from_raw,
  NULL as user_id_from_raw,
  NULL as start_time,
  NULL as end_time
FROM eitje_revenue_days_raw
LIMIT 3;

-- 4. Check RLS policies (might block inserts)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated');

-- 5. Sample raw data to verify structure
SELECT 
  'Sample raw time_registration_shifts' as check_type,
  id,
  date,
  environment_id,
  raw_data::text
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 1;



