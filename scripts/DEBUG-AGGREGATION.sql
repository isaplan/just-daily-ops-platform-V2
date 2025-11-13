-- Debug aggregation: Check what's happening
-- Run this after aggregation edge function runs

-- 1. Check edge function logs for errors
-- Go to Supabase Dashboard → Edge Functions → eitje-aggregate-data → Logs
-- Look for errors, warnings, or successful upserts

-- 2. Verify raw data exists and structure
SELECT 
  'Time Registration Raw' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as unique_dates,
  COUNT(DISTINCT environment_id) as unique_environments,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
  'Revenue Days Raw' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as unique_dates,
  COUNT(DISTINCT environment_id) as unique_environments,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_revenue_days_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- 3. Check raw data structure (see if environment_id exists)
SELECT 
  'Sample time_registration structure' as check_type,
  id,
  date,
  environment_id,
  CASE 
    WHEN raw_data::text LIKE '%"environment"%' THEN 'Has environment in raw_data'
    ELSE 'No environment in raw_data'
  END as has_environment,
  CASE 
    WHEN raw_data::text LIKE '%"start"%' THEN 'Has start'
    ELSE 'No start'
  END as has_start,
  CASE 
    WHEN raw_data::text LIKE '%"end"%' THEN 'Has end'
    ELSE 'No end'
  END as has_end
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 3;

-- 4. Check aggregated tables (should have data after aggregation)
SELECT 
  'Aggregated Labor Hours' as check_type,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  SUM(total_hours_worked) as total_hours
FROM eitje_labor_hours_aggregated

UNION ALL

SELECT 
  'Aggregated Revenue Days' as check_type,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  SUM(total_revenue) as total_revenue_sum
FROM eitje_revenue_days_aggregated;

-- 5. Check for RLS policies that might block inserts
-- (Run this if aggregation logs show successful upsert but no data)
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN cmd = 'INSERT' THEN '⚠️ INSERT policy exists - might block'
    WHEN cmd = 'ALL' THEN '⚠️ ALL policy exists - might block'
    ELSE '✅ No blocking policy'
  END as status
FROM pg_policies
WHERE tablename IN ('eitje_labor_hours_aggregated', 'eitje_revenue_days_aggregated')
  AND cmd IN ('INSERT', 'ALL');



