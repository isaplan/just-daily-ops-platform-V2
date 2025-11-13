-- Eitje Cronjob Diagnostic Script
-- Run this to check the current state of the cronjob setup

\echo '=== 1. SYNC CONFIGURATION ==='
SELECT 
  'Config Mode' as check_name,
  mode as value,
  CASE 
    WHEN mode = 'incremental' THEN '✅ Cronjob will run'
    WHEN mode = 'manual' THEN '⚠️  Cronjob will skip (manual mode)'
    ELSE '❌ Invalid mode'
  END as status
FROM eitje_sync_config
LIMIT 1;

SELECT 
  'Enabled Endpoints' as check_name,
  array_to_string(enabled_endpoints, ', ') as value,
  CASE 
    WHEN array_length(enabled_endpoints, 1) > 0 THEN '✅ Endpoints configured'
    ELSE '⚠️  No endpoints enabled'
  END as status
FROM eitje_sync_config
LIMIT 1;

\echo ''
\echo '=== 2. CRON JOB STATUS ==='
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status
FROM cron.job 
WHERE jobname LIKE '%eitje%';

\echo ''
\echo '=== 3. API CREDENTIALS ==='
SELECT 
  provider,
  is_active,
  CASE 
    WHEN is_active THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status,
  base_url,
  CASE 
    WHEN additional_config ? 'partner_username' THEN '✅'
    ELSE '❌'
  END as has_partner_username,
  CASE 
    WHEN additional_config ? 'partner_password' THEN '✅'
    ELSE '❌'
  END as has_partner_password,
  CASE 
    WHEN additional_config ? 'api_username' THEN '✅'
    ELSE '❌'
  END as has_api_username,
  CASE 
    WHEN additional_config ? 'api_password' THEN '✅'
    ELSE '❌'
  END as has_api_password
FROM api_credentials
WHERE provider = 'eitje';

\echo ''
\echo '=== 4. SYNC STATE (Last Synced Dates) ==='
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  CASE 
    WHEN last_error IS NULL THEN '✅ No errors'
    ELSE '⚠️  ' || last_error
  END as error_status
FROM eitje_sync_state
ORDER BY last_successful_sync_at DESC NULLS LAST;

\echo ''
\echo '=== 5. RECENT SYNC LOGS ==='
SELECT 
  sync_type,
  status,
  started_at,
  completed_at,
  CASE 
    WHEN status = 'completed' THEN '✅'
    WHEN status = 'failed' THEN '❌'
    WHEN status = 'pending' THEN '⏳'
    ELSE status
  END as status_icon
FROM api_sync_logs
WHERE sync_type = 'eitje-incremental-sync'
ORDER BY started_at DESC
LIMIT 5;

\echo ''
\echo '=== 6. DATA COUNTS ==='
SELECT 
  'Raw: time_registration_shifts' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as last_inserted
FROM eitje_time_registration_shifts_raw
UNION ALL
SELECT 
  'Raw: planning_shifts',
  COUNT(*),
  MAX(created_at)
FROM eitje_planning_shifts_raw
UNION ALL
SELECT 
  'Raw: revenue_days',
  COUNT(*),
  MAX(created_at)
FROM eitje_revenue_days_raw
UNION ALL
SELECT 
  'Processed: time_registration_shifts',
  COUNT(*),
  MAX(updated_at)
FROM eitje_time_registration_shifts
UNION ALL
SELECT 
  'Processed: planning_shifts',
  COUNT(*),
  MAX(updated_at)
FROM eitje_planning_shifts
UNION ALL
SELECT 
  'Processed: revenue_days',
  COUNT(*),
  MAX(updated_at)
FROM eitje_revenue_days;

\echo ''
\echo '=== RECOMMENDATIONS ==='
\echo 'If mode is not "incremental", run:'
\echo '  UPDATE eitje_sync_config SET mode = ''incremental'';'
\echo ''
\echo 'If cron job is not active, run:'
\echo '  SELECT public.toggle_eitje_cron_jobs(true);'
\echo ''
\echo 'To test manually:'
\echo '  SELECT * FROM public.trigger_eitje_incremental_sync();'
