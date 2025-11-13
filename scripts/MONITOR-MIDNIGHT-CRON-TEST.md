# Monitor Midnight Cron Test (New Flow)

## Situation
- ✅ Edge function is deployed with new flow (calls `/api/eitje/sync`)
- ✅ Old invocations existed but shut down (before new flow)
- ⏰ Next cron run: **24:00 (midnight)**
- 🎯 Goal: Verify the new flow works correctly

---

## After Midnight: Quick Verification Checklist

### Step 1: Check Edge Function Logs (5-10 minutes after midnight)

**Location:** Supabase Dashboard → Edge Functions → `eitje-incremental-sync` → Logs

**What to look for:**

✅ **Success indicators:**
```
[eitje-incremental-sync] Calling manual sync API (SAME flow): https://[url]/api/eitje/sync
[eitje-incremental-sync] Manual sync API response: 200
```

❌ **Failure indicators:**
```
[eitje-incremental-sync] Manual sync API error: 404
[eitje-incremental-sync] Manual sync API error: 500
Failed to fetch
```

**Key information:**
- Note the URL it's calling (should be your Vercel URL)
- Check HTTP status code (should be 200)
- Look for any error messages

---

### Step 2: Check API Sync Logs (5-10 minutes after midnight)

Run this SQL in Supabase SQL Editor:

```sql
-- Check syncs triggered by edge function after midnight
SELECT 
  id,
  started_at,
  status,
  sync_type,
  records_processed,
  error_message,
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
```

**What to expect:**
- 2 syncs (one for `time_registration_shifts`, one for `revenue_days`)
- Status should be `completed`
- Should show `records_processed` > 0
- `duration_seconds` should be reasonable (< 60 seconds)

---

### Step 3: Check Raw Data Inserted (10-15 minutes after midnight)

```sql
-- Check if new raw data was inserted
SELECT 
  'time_registration_shifts_raw' as table_name,
  COUNT(*) as records_inserted,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted_at
FROM eitje_time_registration_shifts_raw
WHERE created_at >= CURRENT_DATE + INTERVAL '1 day'

UNION ALL

SELECT 
  'revenue_days_raw' as table_name,
  COUNT(*) as records_inserted,
  MAX(date) as latest_date,
  MAX(created_at) as last_inserted_at
FROM eitje_revenue_days_raw
WHERE created_at >= CURRENT_DATE + INTERVAL '1 day';
```

**What to expect:**
- Should show records inserted after midnight
- `latest_date` should be yesterday's date (since it syncs up to yesterday)

---

### Step 4: Check Aggregated Data (15-20 minutes after midnight)

Aggregation should auto-trigger after sync completes. Check:

```sql
-- Check if aggregation ran
SELECT 
  'labor_hours_aggregated' as table_name,
  COUNT(*) as total_records,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated
WHERE date >= CURRENT_DATE - 1  -- Yesterday and today

UNION ALL

SELECT 
  'revenue_days_aggregated' as table_name,
  COUNT(*) as total_records,
  MAX(date) as latest_date
FROM eitje_revenue_days_aggregated
WHERE date >= CURRENT_DATE - 1  -- Yesterday and today;
```

**What to expect:**
- New aggregated records should appear
- `latest_date` should be yesterday's date

---

### Step 5: Check Sync State Updated (20 minutes after midnight)

```sql
-- Verify sync state was updated
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
```

**What to expect:**
- `last_synced_date` should be yesterday's date
- `last_successful_sync_at` should be after midnight
- `last_error` should be NULL
- `records_synced` should show the number of records processed

---

## Quick One-Click Check Script

Run this complete check script after midnight:

**File:** `scripts/check-edge-function-status.sql`

Copy it into Supabase SQL Editor - it does all checks above in one go.

---

## Troubleshooting Based on Results

### Scenario 1: Edge Function Logs Show 404

**Problem:** Wrong URL or API route not accessible

**Check:**
- What URL is shown in logs?
- Is it your actual Vercel URL?
- Is `/api/eitje/sync` publicly accessible?

**Fix:**
- Set edge function secret: `NEXT_PUBLIC_SITE_URL` = your Vercel URL
- Or verify the hardcoded fallback URL is correct

---

### Scenario 2: Edge Function Logs Show 500

**Problem:** API route is accessible but failing

**Check:**
- Vercel function logs for `/api/eitje/sync`
- Error message in edge function logs
- Check if service role key is working

**Fix:**
- Check Vercel deployment logs
- Verify environment variables in Vercel
- Test `/api/eitje/sync` manually via Postman/curl

---

### Scenario 3: Edge Function Succeeds but No Data

**Problem:** API route works but data not being inserted

**Check:**
- API sync logs - do they show `completed`?
- Error messages in `api_sync_logs.error_message`
- Check if Eitje API is returning data

**Fix:**
- Check API route logs in Vercel
- Verify Eitje API credentials are correct
- Test Eitje API directly

---

### Scenario 4: Data Synced but Not Aggregated

**Problem:** Sync works but aggregation not triggering

**Check:**
- Edge function logs for aggregation trigger messages
- `eitje-aggregate-data` function logs
- Check if aggregation is enabled

**Fix:**
- Manually trigger aggregation for missing dates
- Check aggregation edge function logs for errors

---

## Expected Timeline

**24:00** - Cron triggers edge function
**24:00-24:02** - Edge function calls `/api/eitje/sync`
**24:02-24:05** - API route fetches data from Eitje
**24:05-24:06** - Data inserted into raw tables
**24:06-24:10** - Aggregation auto-triggers
**24:10-24:15** - Aggregation completes

**Best time to check:** 24:15-24:20 (15-20 minutes after midnight)

---

## Next Steps After Verification

**If everything works:**
- ✅ Setup is complete!
- Monitor hourly cron runs
- Check data daily to ensure it's flowing

**If issues found:**
- Follow troubleshooting steps above
- Fix URL/API route issues
- Test again on next cron run (or manually trigger)

---

## Manual Trigger (If You Can't Wait)

If you want to test before midnight:

1. Go to Supabase Dashboard → Edge Functions → `eitje-incremental-sync`
2. Click **"Test"** button
3. Request body: `{}`
4. Click **"Invoke"**
5. Watch logs in real-time
6. Follow steps above (no need to wait until midnight)

This will use the same code path as the cron, so results should be identical.


