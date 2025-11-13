-- Diagnose why aggregated data is missing
-- Run this in Supabase SQL Editor

-- 1. Check if raw data exists (should show results from query 1)
-- If this is empty, no raw data = nothing to aggregate
SELECT 
  'Total Raw Time Registration Records (all time)' as check_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM eitje_time_registration_shifts_raw

UNION ALL

SELECT 
  'Total Raw Revenue Days Records (all time)' as check_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM eitje_revenue_days_raw;

-- 2. Check if aggregation edge function has been called
-- Look for logs/invocations (check edge function logs in dashboard)
-- This query checks if there's any indication aggregation ran
SELECT 
  'Note' as info,
  'Check Supabase Dashboard → Edge Functions → eitje-aggregate-data → Logs' as instruction;

-- 3. Check sync state to see what dates were synced
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 4. Check if aggregation edge function exists/is deployed
-- (This requires checking the Supabase Dashboard, not SQL)
SELECT 
  'Note' as info,
  'Verify eitje-aggregate-data edge function is deployed in Supabase Dashboard' as instruction;

-- 5. Check edge function logs from api_sync_logs (if aggregation creates logs)
SELECT 
  sync_type,
  status,
  started_at,
  error_message
FROM api_sync_logs
WHERE sync_type LIKE '%aggregate%' OR sync_type LIKE '%aggregat%'
ORDER BY started_at DESC
LIMIT 10;



