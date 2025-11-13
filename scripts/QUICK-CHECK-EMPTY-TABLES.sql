-- Quick check: Why are tables empty?
-- Run this in Supabase SQL Editor

-- 1. Check if cron job is scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  jobname LIKE '%eitje%' as is_eitje_job
FROM cron.job
WHERE jobname LIKE '%eitje%';

-- 2. Check recent cron job runs (last 24 hours)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%eitje%')
  AND start_time >= NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC
LIMIT 10;

-- 3. Check sync config mode
SELECT 
  mode,
  enabled_endpoints,
  updated_at,
  CASE 
    WHEN mode = 'incremental' THEN '✅ Sync enabled'
    ELSE '❌ Sync disabled (manual mode)'
  END as status
FROM eitje_sync_config
LIMIT 1;

-- 4. Check credentials
SELECT 
  provider,
  is_active,
  base_url,
  CASE 
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status
FROM api_credentials
WHERE provider = 'eitje';

-- 5. Check sync state (what dates were synced)
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  CASE 
    WHEN last_successful_sync_at IS NULL THEN '❌ Never synced'
    WHEN last_successful_sync_at < NOW() - INTERVAL '2 hours' THEN '⚠️ Stale (>2h old)'
    ELSE '✅ Recent'
  END as status
FROM eitje_sync_state
ORDER BY updated_at DESC;

-- 6. Check sync logs (last 24 hours)
SELECT 
  started_at,
  completed_at,
  status,
  sync_type,
  LEFT(error_message, 100) as error_preview
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
  AND sync_type LIKE '%eitje%'
ORDER BY started_at DESC
LIMIT 5;



