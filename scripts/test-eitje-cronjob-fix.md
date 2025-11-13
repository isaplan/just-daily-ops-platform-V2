# Test Eitje Cronjob Fix

## Bug Fixed
The eitje-incremental-sync function had a critical bug where it was using `GET` requests with a request body. This is invalid HTTP - GET requests should use query parameters instead.

### What was changed:
- **Before**: `fetch(url, { method: 'GET', body: JSON.stringify({...}) })`
- **After**: `fetch(url + '?filters[start_date]=...', { method: 'GET' })`

## Pre-Deployment Checklist

### 1. Check Sync Configuration Mode
```sql
SELECT 
  mode,
  incremental_interval_minutes,
  enabled_endpoints,
  updated_at
FROM eitje_sync_config;
```

**Expected**: `mode` should be `'incremental'` for the cronjob to run.
**If `mode` = `'manual'`**, the cronjob will skip syncing. Update with:
```sql
UPDATE eitje_sync_config 
SET mode = 'incremental' 
WHERE id = (SELECT id FROM eitje_sync_config LIMIT 1);
```

### 2. Verify Cron Job is Active
```sql
SELECT 
  jobname, 
  schedule, 
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%eitje%';
```

**Expected**: Should show `eitje-incremental-sync-hourly` with `active = true`

### 3. Check API Credentials
```sql
SELECT 
  provider,
  is_active,
  base_url,
  additional_config -> 'partner_username' as partner_username,
  additional_config -> 'api_username' as api_username
FROM api_credentials
WHERE provider = 'eitje';
```

**Expected**: `is_active = true` and all credentials populated

## Deployment Steps

### 1. Deploy the Fixed Function
```bash
cd /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform
supabase functions deploy eitje-incremental-sync
```

### 2. Test Manually First
Test the function manually to ensure it works:
```bash
curl -X POST \
  'https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Or via SQL:
```sql
SELECT * FROM public.trigger_eitje_incremental_sync();
```

### 3. Monitor the Logs
Check the Supabase dashboard:
- Go to **Edge Functions** → **eitje-incremental-sync** → **Logs**
- Look for successful sync messages
- Should see processing and aggregation logs

### 4. Verify Data is Being Synced
```sql
-- Check if data is coming in
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error
FROM eitje_sync_state
ORDER BY last_successful_sync_at DESC;

-- Check raw data
SELECT COUNT(*) as count FROM eitje_time_registration_shifts_raw;
SELECT COUNT(*) as count FROM eitje_planning_shifts_raw;
SELECT COUNT(*) as count FROM eitje_revenue_days_raw;

-- Check processed data
SELECT COUNT(*) as count FROM eitje_time_registration_shifts;
SELECT COUNT(*) as count FROM eitje_planning_shifts;
SELECT COUNT(*) as count FROM eitje_revenue_days;
```

## Troubleshooting

### If cronjob still doesn't run:

1. **Check sync mode**:
   ```sql
   UPDATE eitje_sync_config SET mode = 'incremental';
   ```

2. **Check cron job is enabled**:
   ```sql
   SELECT public.toggle_eitje_cron_jobs(true);
   ```

3. **Manually trigger to test**:
   ```sql
   SELECT * FROM public.trigger_eitje_incremental_sync();
   ```

4. **Check edge function logs** in Supabase dashboard

### If API returns errors:

1. Verify credentials are correct
2. Check if date range is valid (max 7 days for shifts)
3. Look for specific error messages in logs

## Expected Behavior After Fix

1. **Hourly cronjob runs** at minute 0 of every hour
2. **Syncs yesterday's data** incrementally (or catches up on missed days)
3. **Automatically triggers**:
   - `eitje-process-data` to unpack raw JSONB → processed tables
   - `eitje-aggregate-data` to aggregate → final tables
4. **Updates `eitje_sync_state`** with last synced date
5. **No errors in logs**
