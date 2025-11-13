# Diagnose Empty Tables

## Quick Checklist

Run `scripts/CHECK-COMPLETE-DATA-FLOW.sql` in Supabase SQL Editor to check:

### 1. ✅ Credentials Exist?
- Check Query 1: Should show at least 1 active Eitje credential
- **If 0**: Go to Eitje API page → Save credentials

### 2. ✅ Sync Config Set to "Incremental"?
- Check Query 2: Should show `mode = 'incremental'`
- **If 'manual'**: Go to Eitje API page → Cronjob tab → Set to "Incremental" → Save

### 3. ✅ Cron Job Running?
- Check Query 3 (sync_state): Should show recent `last_successful_sync_at`
- **If empty**: Cron hasn't run yet or failed
- Check Supabase Dashboard → Database → Extensions → `pg_cron` enabled?

### 4. ✅ API Called Successfully?
- Check Query 5 (sync logs): Look for recent entries with `status = 'completed'`
- **If all 'failed'**: Check `error_message` column

### 5. ✅ Raw Data Stored?
- Check Query 4: Should show records in raw tables
- **If 0**: API calls are failing or returning no data

---

## Common Issues & Fixes

### Issue: Sync config is "manual"
**Fix**: 
1. Go to `/finance/eitje-api` → Cronjob tab
2. Change mode to "Incremental"
3. Click Save
4. Wait for next cron run (hourly at :00)

### Issue: No credentials
**Fix**:
1. Go to `/finance/eitje-api` → API Connection tab
2. Enter credentials
3. Click Save
4. Verify with "Test Connection"

### Issue: Cron job not scheduled
**Fix**:
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run migration: `supabase/migrations/20250131000003_create_eitje_incremental_cron_job.sql`
4. Or manually schedule:
```sql
SELECT cron.schedule(
  'eitje-incremental-sync-hourly',
  '0 * * * *',
  $$
  SELECT * FROM public.trigger_eitje_incremental_sync();
  $$
);
```

### Issue: API returns empty data
**Possible causes**:
- Eitje API has no data for those dates
- Date range is wrong (syncs yesterday by default)
- API credentials are invalid
- API endpoint changed

**Debug**:
- Check edge function logs: `eitje-incremental-sync` → Logs
- Look for "Fetched 0 records" messages
- Verify date range in logs

### Issue: Edge function errors
**Debug**:
1. Go to Supabase Dashboard → Edge Functions → `eitje-incremental-sync` → Logs
2. Look for error messages
3. Check if `eitje-aggregate-data` is deployed (needed for aggregation)

---

## Manual Test

If cron isn't working, trigger manually:

```sql
SELECT * FROM public.trigger_eitje_incremental_sync();
```

Then check:
1. Edge function logs
2. Raw data tables (should have new records)
3. Sync state (should update)
4. Sync logs (should show success)

---

## Next Steps After Fix

Once raw data appears:
1. ✅ Raw tables populated
2. ⏭️ Deploy `eitje-aggregate-data` edge function
3. ⏭️ Wait for aggregation to run (or trigger manually)
4. ⏭️ Check aggregated tables



