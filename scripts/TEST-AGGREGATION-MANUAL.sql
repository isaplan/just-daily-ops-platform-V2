-- Manually test aggregation by calling the edge function
-- This simulates what the cron job should do after syncing

-- First, check what raw data we have to aggregate
SELECT 
  'Raw Data Summary' as check_type,
  'time_registration_shifts' as endpoint,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_time_registration_shifts_raw

UNION ALL

SELECT 
  'Raw Data Summary' as check_type,
  'revenue_days' as endpoint,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_revenue_days_raw;

-- Note: To manually trigger aggregation, you need to:
-- 1. Deploy the edge function first: npx supabase functions deploy eitje-aggregate-data
-- 2. Then call it via HTTP or from another edge function
-- 3. Or use the Supabase Dashboard → Edge Functions → Invoke



