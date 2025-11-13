-- Check why Oct 30, 31, and today are missing from aggregation
-- This will help diagnose the issue

-- 1. Check if raw data exists for missing dates
SELECT 
  'Raw Labor Hours - Missing Dates' as check_type,
  date,
  COUNT(*) as raw_records_count,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record
FROM eitje_time_registration_shifts_raw
WHERE date IN ('2025-10-30', '2025-10-31', CURRENT_DATE)
GROUP BY date
ORDER BY date DESC;

SELECT 
  'Raw Revenue Days - Missing Dates' as check_type,
  date,
  COUNT(*) as raw_records_count,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record
FROM eitje_revenue_days_raw
WHERE date IN ('2025-10-30', '2025-10-31', CURRENT_DATE)
GROUP BY date
ORDER BY date DESC;

-- 2. Check if aggregated data exists for missing dates
SELECT 
  'Aggregated Labor Hours - Missing Dates' as check_type,
  date,
  COUNT(*) as aggregated_records_count,
  MAX(updated_at) as last_updated
FROM eitje_labor_hours_aggregated
WHERE date IN ('2025-10-30', '2025-10-31', CURRENT_DATE)
GROUP BY date
ORDER BY date DESC;

SELECT 
  'Aggregated Revenue Days - Missing Dates' as check_type,
  date,
  COUNT(*) as aggregated_records_count,
  MAX(updated_at) as last_updated
FROM eitje_revenue_days_aggregated
WHERE date IN ('2025-10-30', '2025-10-31', CURRENT_DATE)
GROUP BY date
ORDER BY date DESC;

-- 3. Check sync state - what were the last synced dates?
SELECT 
  'Sync State - Last Synced Dates' as check_type,
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error,
  updated_at
FROM eitje_sync_state
ORDER BY endpoint, updated_at DESC;

-- 4. Check sync logs for Oct 30, 31, and today
SELECT 
  'Sync Logs - Missing Dates Period' as check_type,
  id,
  sync_type,
  status,
  records_processed,
  start_date,
  end_date,
  started_at,
  completed_at,
  error_message,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM api_sync_logs
WHERE sync_type = 'eitje-incremental-sync'
  AND started_at >= '2025-10-30 00:00:00'
ORDER BY started_at DESC
LIMIT 20;

-- 5. Summary: Raw vs Aggregated for missing dates
SELECT 
  'Summary - Oct 30' as check_type,
  (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = '2025-10-30') as labor_raw,
  (SELECT COUNT(*) FROM eitje_labor_hours_aggregated WHERE date = '2025-10-30') as labor_agg,
  (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = '2025-10-30') as revenue_raw,
  (SELECT COUNT(*) FROM eitje_revenue_days_aggregated WHERE date = '2025-10-30') as revenue_agg;

SELECT 
  'Summary - Oct 31' as check_type,
  (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = '2025-10-31') as labor_raw,
  (SELECT COUNT(*) FROM eitje_labor_hours_aggregated WHERE date = '2025-10-31') as labor_agg,
  (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = '2025-10-31') as revenue_raw,
  (SELECT COUNT(*) FROM eitje_revenue_days_aggregated WHERE date = '2025-10-31') as revenue_agg;

SELECT 
  'Summary - Today' as check_type,
  (SELECT COUNT(*) FROM eitje_time_registration_shifts_raw WHERE date = CURRENT_DATE) as labor_raw,
  (SELECT COUNT(*) FROM eitje_labor_hours_aggregated WHERE date = CURRENT_DATE) as labor_agg,
  (SELECT COUNT(*) FROM eitje_revenue_days_raw WHERE date = CURRENT_DATE) as revenue_raw,
  (SELECT COUNT(*) FROM eitje_revenue_days_aggregated WHERE date = CURRENT_DATE) as revenue_agg;

-- 6. Check what the aggregation function was called with (from sync logs metadata if available)
-- This shows if aggregation was even attempted for these dates


