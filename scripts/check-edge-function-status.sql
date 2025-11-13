-- Quick check: Edge Function Status (After Midnight Test)
-- Run this in Supabase SQL Editor to check if midnight cron ran successfully
-- Best time to run: 15-20 minutes after midnight (00:15-00:20)

-- 1. Check recent sync logs from edge function calls (after midnight)
SELECT 
  'Recent API Sync Logs (After Midnight)' as check_type,
  COUNT(*) as count,
  MAX(started_at) as latest_sync,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM api_sync_logs
WHERE started_at >= CURRENT_DATE + INTERVAL '1 day'  -- After midnight
  AND (
    sync_type LIKE '%eitje%' 
    OR sync_type LIKE '%time_registration%'
    OR sync_type LIKE '%revenue%'
  );

-- 2. Show detailed recent syncs (after midnight)
SELECT 
  started_at,
  status,
  sync_type,
  records_processed,
  CASE 
    WHEN error_message IS NOT NULL THEN LEFT(error_message, 100)
    ELSE NULL
  END as error_preview,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM api_sync_logs
WHERE started_at >= CURRENT_DATE + INTERVAL '1 day'  -- After midnight
  AND (
    sync_type LIKE '%eitje%' 
    OR sync_type LIKE '%time_registration%'
    OR sync_type LIKE '%revenue%'
  )
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check sync state (shows what dates were last synced)
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  CASE 
    WHEN last_synced_date = CURRENT_DATE - 1 THEN '✅ Up to date (yesterday)'
    WHEN last_synced_date < CURRENT_DATE - 1 THEN '⚠️ Behind by ' || (CURRENT_DATE - 1 - last_synced_date) || ' day(s)'
    ELSE 'ℹ️ Status: ' || last_synced_date::text
  END as status,
  last_error
FROM eitje_sync_state
ORDER BY endpoint;

-- 4. Check recent raw data inserts (after midnight - indicates if sync is working)
SELECT 
  'time_registration_shifts_raw' as table_name,
  COUNT(*) as recent_records,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted_at
FROM eitje_time_registration_shifts_raw
WHERE created_at >= CURRENT_DATE + INTERVAL '1 day'  -- After midnight

UNION ALL

SELECT 
  'revenue_days_raw' as table_name,
  COUNT(*) as recent_records,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted_at
FROM eitje_revenue_days_raw
WHERE created_at >= CURRENT_DATE + INTERVAL '1 day';  -- After midnight

-- 5. Check aggregated data (indicates if aggregation is working)
SELECT 
  'labor_hours_aggregated' as table_name,
  COUNT(*) as records,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated
WHERE date >= CURRENT_DATE - 3

UNION ALL

SELECT 
  'revenue_days_aggregated' as table_name,
  COUNT(*) as records,
  MAX(date) as latest_date
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - 3;

