# Quick Fix: Missing Aggregated Data

## Problem
Aggregated tables show **0 records** even though raw data exists.

## Root Causes (Check These)

### 1. Edge Function Not Deployed ⚠️ MOST LIKELY
The `eitje-aggregate-data` edge function doesn't exist in Supabase.

**Fix:**
```bash
npx supabase functions deploy eitje-aggregate-data
```

**Verify:**
- Go to Supabase Dashboard → Edge Functions
- Check that `eitje-aggregate-data` appears in the list

---

### 2. Aggregation Not Being Triggered
The `eitje-incremental-sync` function calls aggregation, but it might be failing silently.

**Check:**
- Go to Supabase Dashboard → Edge Functions → `eitje-incremental-sync` → Logs
- Look for messages like: `"Triggering aggregation for..."`
- Check for errors after that message

---

### 3. Aggregation Function Errors
The function might be running but failing.

**Check:**
- Go to Supabase Dashboard → Edge Functions → `eitje-aggregate-data` → Logs
- Look for error messages

**Common errors:**
- Missing tables (aggregated tables don't exist)
- Missing columns in raw data
- RLS policies blocking inserts

---

### 4. Raw Data Doesn't Have Required Fields
The aggregation function expects certain fields in `raw_data`.

**Check:** Run this SQL:
```sql
SELECT 
  id,
  date,
  raw_data->>'environment' as has_environment,
  raw_data->'environment'->>'id' as environment_id
FROM eitje_time_registration_shifts_raw
LIMIT 5;
```

If `environment_id` is NULL, that's the problem.

---

## Step-by-Step Fix

1. **Deploy the edge function** (if not deployed):
   ```bash
   npx supabase functions deploy eitje-aggregate-data
   ```

2. **Verify it's deployed:**
   - Supabase Dashboard → Edge Functions → `eitje-aggregate-data` should exist

3. **Manually trigger aggregation** to test:
   ```bash
   curl -X POST https://YOUR_PROJECT_URL/functions/v1/eitje-aggregate-data \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "endpoint": "time_registration_shifts",
       "startDate": "2025-10-30",
       "endDate": "2025-10-30"
     }'
   ```

4. **Check logs** for errors:
   - Supabase Dashboard → Edge Functions → `eitje-aggregate-data` → Logs

5. **Re-run the data flow check:**
   - Run `scripts/CHECK-EITJE-DATA-FLOW.sql` again
   - Aggregated tables should now have data

---

## Expected Flow After Fix

1. ✅ Cron runs → `eitje-incremental-sync` syncs raw data
2. ✅ `eitje-incremental-sync` calls `eitje-aggregate-data`
3. ✅ `eitje-aggregate-data` processes raw data
4. ✅ Aggregated data appears in tables
5. ✅ UI can read from aggregated tables



