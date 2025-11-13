-- Check if aggregation is happening after cron syncs
-- This will help diagnose why today's data might not be aggregated

-- 1. Convert the timestamp from logs to readable date
-- Latest successful aggregation: 1762005055425000 (microseconds since epoch)
SELECT 
  'Latest Aggregation Timestamp' as check_type,
  to_timestamp(1762005055425000 / 1000000.0) as timestamp,
  to_timestamp(1762005055425000 / 1000000.0) AT TIME ZONE 'UTC' as utc_time;

-- 2. Check sync logs - when was the last successful incremental sync?
SELECT 
  'Latest Eitje Incremental Sync' as check_type,
  id,
  sync_type,
  status,
  records_processed,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
  error_message
FROM api_sync_logs
WHERE sync_type = 'eitje-incremental-sync'
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check what dates were synced (from eitje_sync_state)
SELECT 
  'Sync State - Last Synced Dates' as check_type,
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  updated_at,
  CASE 
    WHEN last_synced_date >= CURRENT_DATE THEN '✅ Today or future'
    WHEN last_synced_date = CURRENT_DATE - INTERVAL '1 day' THEN '⚠️ Yesterday'
    ELSE '❌ Older than yesterday'
  END as sync_status
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 4. Check if raw data exists for today but no aggregated data
SELECT 
  'Raw vs Aggregated - Labor Hours Today' as check_type,
  (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = CURRENT_DATE) as raw_count_today,
  (SELECT COUNT(*) FROM eitje_labor_hours_aggregated WHERE date = CURRENT_DATE) as aggregated_count_today,
  CASE 
    WHEN (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = CURRENT_DATE) > 0 
     AND (SELECT COUNT(*) FROM eitje_labor_hours_aggregated WHERE date = CURRENT_DATE) = 0 
    THEN '❌ Raw exists but not aggregated'
    WHEN (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = CURRENT_DATE) = 0 
    THEN '⚠️ No raw data for today'
    ELSE '✅ Aggregated'
  END as status;

SELECT 
  'Raw vs Aggregated - Revenue Days Today' as check_type,
  (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = CURRENT_DATE) as raw_count_today,
  (SELECT COUNT(*) FROM eitje_revenue_days_aggregated WHERE date = CURRENT_DATE) as aggregated_count_today,
  CASE 
    WHEN (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = CURRENT_DATE) > 0 
     AND (SELECT COUNT(*) FROM eitje_revenue_days_aggregated WHERE date = CURRENT_DATE) = 0 
    THEN '❌ Raw exists but not aggregated'
    WHEN (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = CURRENT_DATE) = 0 
    THEN '⚠️ No raw data for today'
    ELSE '✅ Aggregated'
  END as status;

-- 5. Check the last 3 days of raw vs aggregated
SELECT 
  'Recent Raw Data' as check_type,
  date,
  COUNT(*) as raw_records,
  MAX(created_at) as latest_raw_record
FROM eitje_time_registration_shifts_raw
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY date
ORDER BY date DESC;

SELECT 
  'Recent Aggregated Labor Hours' as check_type,
  date,
  COUNT(*) as aggregated_records,
  MAX(updated_at) as latest_aggregated_update
FROM eitje_labor_hours_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY date
ORDER BY date DESC;

-- 6. Check cron job execution times (from pg_cron if available)
-- This shows when cron actually ran
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%eitje%';

