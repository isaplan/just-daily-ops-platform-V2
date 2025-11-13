# Check Edge Function Logs and Test Setup

## Phase 1: Check Current Edge Function Logs

### Step 1: Access Supabase Dashboard Logs

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/vrucbxdudchboznunndz
2. Navigate to **Edge Functions** → **`eitje-incremental-sync`**
3. Click on **"Logs"** tab (or "Invocations")

### Step 2: Look for Key Log Messages

**What to look for:**
- ✅ **Success indicator**: `Calling manual sync API (SAME flow): https://[url]/api/eitje/sync`
  - This shows which URL it's using
- ✅ **HTTP status**: Should see `200` responses
- ❌ **Error indicators**: 
  - `404 Not Found` → URL incorrect
  - `500 Internal Server Error` → API route issue
  - `Failed to fetch` → Network/connectivity issue

**Check recent invocations:**
- Should see hourly invocations if cron is running
- Look at the most recent ones (last 2-3 hours)

### Step 3: Check What URL It's Using

In the logs, find the line that says:
```
[eitje-incremental-sync] Calling manual sync API (SAME flow): https://[url]/api/eitje/sync
```

**Possible URLs:**
- `https://just-daily-ops-platform.vercel.app/api/eitje/sync` (hardcoded fallback)
- Your actual Vercel URL (if secret is set)
- `http://localhost:3000/api/eitje/sync` (development fallback - won't work)

### Step 4: Check API Sync Logs Table

Run this SQL in Supabase SQL Editor:

```sql
-- Check recent sync activity from edge function
SELECT 
  id,
  started_at,
  status,
  sync_type,
  records_processed,
  error_message,
  completed_at
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '6 hours'
  AND (
    sync_type LIKE '%eitje%' 
    OR sync_type LIKE '%time_registration%'
    OR sync_type LIKE '%revenue%'
  )
ORDER BY started_at DESC
LIMIT 20;
```

This shows if the edge function is successfully calling your API.

---

## Phase 2: Manual Test (If Logs Don't Show Success)

### Step 1: Trigger Edge Function Manually

1. In Supabase Dashboard → Edge Functions → `eitje-incremental-sync`
2. Click **"Test"** button (or "Invoke")
3. Request body: `{}`
4. Click **"Run"** or **"Invoke"**

### Step 2: Watch Real-Time Logs

While the function runs:
- Watch the logs tab for real-time output
- Look for the URL it's trying to call
- Check for any errors

### Step 3: Verify the Response

**Success indicators:**
- HTTP status: `200`
- Response body contains endpoint results
- No error messages in logs

**Failure indicators:**
- HTTP status: `404`, `500`, or `502`
- Error message in response
- Logs show connection errors

---

## Phase 3: Fix URL Issue (If Needed)

### If URL is Wrong or Missing

**Option A: Set Edge Function Secret (Recommended)**

1. Supabase Dashboard → Edge Functions → Settings → Secrets
2. Click **"Add new secret"**
3. Name: `NEXT_PUBLIC_SITE_URL`
4. Value: Your actual Vercel URL (check Vercel Dashboard → Domains)
5. Click **"Save"**
6. Wait 1-2 minutes for secret to propagate
7. Re-test the edge function

**Option B: Verify Hardcoded URL is Correct**

Check if `https://just-daily-ops-platform.vercel.app` is your actual Vercel URL:
1. Go to Vercel Dashboard
2. Check **Domains** section
3. If different, either:
   - Set the secret with correct URL (Option A), OR
   - Update the hardcoded fallback in `supabase/functions/eitje-incremental-sync/index.ts`

---

## Phase 4: Verify End-to-End Flow

After confirming logs show success:

### Step 1: Check Raw Data

```sql
-- Check if new raw data was inserted recently
SELECT 
  'time_registration_shifts' as endpoint,
  COUNT(*) as total_records,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted
FROM eitje_time_registration_shifts_raw
WHERE created_at >= NOW() - INTERVAL '2 hours'

UNION ALL

SELECT 
  'revenue_days' as endpoint,
  COUNT(*) as total_records,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted
FROM eitje_revenue_days_raw
WHERE created_at >= NOW() - INTERVAL '2 hours';
```

### Step 2: Check Aggregated Data

```sql
-- Check if aggregation ran
SELECT 
  'labor_hours' as table_name,
  COUNT(*) as records,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated
WHERE date >= CURRENT_DATE - 2

UNION ALL

SELECT 
  'revenue_days' as table_name,
  COUNT(*) as records,
  MAX(date) as latest_date
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - 2;
```

### Step 3: Check Sync State

```sql
-- Verify sync state was updated
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced,
  last_error
FROM eitje_sync_state
ORDER BY updated_at DESC;
```

---

## Expected Results

✅ **Everything Working:**
- Edge function logs show: `Calling manual sync API (SAME flow): https://[correct-url]/api/eitje/sync`
- HTTP status `200` in logs
- `api_sync_logs` shows recent completed syncs
- Raw data tables have new records
- Aggregated data tables have new records
- `eitje_sync_state` shows updated `last_synced_date`

❌ **Something Wrong:**
- Edge function logs show wrong URL or connection errors
- HTTP status `404` or `500`
- No recent entries in `api_sync_logs`
- No new raw or aggregated data
- Sync state not updating

---

## Next Steps Based on Results

**If logs show success:**
- ✅ Setup is working!
- Monitor for next cron run (hourly)
- Check if data is flowing correctly

**If logs show errors:**
- Fix URL issue (Phase 3)
- Check Vercel deployment is active
- Verify `/api/eitje/sync` route is accessible
- Check API route logs in Vercel Dashboard

**If no logs at all:**
- Check cron job is active in Supabase
- Verify edge function is deployed
- Check if cron schedule is correct


