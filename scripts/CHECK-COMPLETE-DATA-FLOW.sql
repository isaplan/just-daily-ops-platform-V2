-- Complete data flow check: From credentials → sync → raw → aggregated
-- Run this in Supabase SQL Editor

-- 1. Check if Eitje credentials exist
SELECT 
  'Eitje Credentials' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM api_credentials
WHERE provider = 'eitje';

-- 2. Check sync configuration
SELECT 
  'Sync Config' as check_type,
  mode,
  enabled_endpoints,
  updated_at
FROM eitje_sync_config
LIMIT 1;

-- 3. Check sync state (what dates were synced)
SELECT 
  'Sync State' as check_type,
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 4. Check raw data totals (all time)
SELECT 
  'Raw Time Registration (all time)' as source,
  COUNT(*) as total_records,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_time_registration_shifts_raw

UNION ALL

SELECT 
  'Raw Revenue Days (all time)' as source,
  COUNT(*) as total_records,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_revenue_days_raw;

-- 5. Check recent sync logs (last 24 hours)
SELECT 
  'Recent Sync Logs' as check_type,
  started_at,
  completed_at,
  status,
  sync_type,
  error_message
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
  AND (sync_type LIKE '%eitje%' OR sync_type LIKE '%time_registration%' OR sync_type LIKE '%revenue%')
ORDER BY started_at DESC
LIMIT 10;

-- 6. Check aggregated data (all time)
SELECT 
  'Aggregated Labor Hours (all time)' as source,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated

UNION ALL

SELECT 
  'Aggregated Revenue Days (all time)' as source,
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_revenue_days_aggregated;



