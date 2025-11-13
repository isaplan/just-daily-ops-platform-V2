-- Check latest aggregated data from Eitje cron
-- This will show the most recent aggregated dates and sync timestamps

-- 1. Latest aggregated dates
SELECT 
  'Labor Hours Latest' as check_type,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  MAX(updated_at) as last_updated
FROM eitje_labor_hours_aggregated;

SELECT 
  'Revenue Days Latest' as check_type,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  MAX(updated_at) as last_updated
FROM eitje_revenue_days_aggregated;

-- 2. Today's date (for reference)
SELECT 
  'Today (UTC)' as check_type,
  CURRENT_DATE as today,
  CURRENT_TIMESTAMP as current_time;

-- 3. Check if today's data exists in aggregated tables
SELECT 
  'Labor Hours Today' as check_type,
  COUNT(*) as records_today,
  MAX(updated_at) as last_updated_today
FROM eitje_labor_hours_aggregated
WHERE date = CURRENT_DATE;

SELECT 
  'Revenue Days Today' as check_type,
  COUNT(*) as records_today,
  MAX(updated_at) as last_updated_today
FROM eitje_revenue_days_aggregated
WHERE date = CURRENT_DATE;

-- 4. Check raw data for today (to see if raw data exists but not aggregated)
SELECT 
  'Raw Labor Hours Today' as check_type,
  COUNT(*) as raw_records_today,
  MAX(created_at) as latest_raw_record
FROM eitje_time_registration_shifts_raw
WHERE date = CURRENT_DATE;

SELECT 
  'Raw Revenue Days Today' as check_type,
  COUNT(*) as raw_records_today,
  MAX(created_at) as latest_raw_record
FROM eitje_revenue_days_raw
WHERE date = CURRENT_DATE;

-- 5. Latest sync logs from api_sync_logs (shows when cron ran)
SELECT 
  'Latest Sync Logs' as check_type,
  id,
  sync_type,
  status,
  records_processed,
  started_at,
  completed_at,
  error_message,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM api_sync_logs
WHERE sync_type LIKE '%eitje%'
ORDER BY started_at DESC
LIMIT 10;

-- 6. Check eitje_sync_state for last synced dates
SELECT 
  'Sync State - Last Synced Dates' as check_type,
  endpoint,
  last_synced_date,
  updated_at
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 7. Recent aggregated records (last 5 days)
SELECT 
  'Recent Labor Hours Aggregated' as check_type,
  date,
  environment_id,
  total_hours_worked,
  employee_count,
  updated_at
FROM eitje_labor_hours_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY date DESC, updated_at DESC
LIMIT 20;

SELECT 
  'Recent Revenue Days Aggregated' as check_type,
  date,
  environment_id,
  total_revenue,
  transaction_count,
  updated_at
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY date DESC, updated_at DESC
LIMIT 20;

