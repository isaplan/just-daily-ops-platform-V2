# Deploy Fixed Aggregation Function

## Current Status
- ✅ Fixed: Replaced `onConflict` with manual INSERT/UPDATE
- ✅ Fixed: Added proper NULL handling for `team_id`
- ⏳ **Action Required**: Deploy the fixed function

## Deploy Steps

1. **Deploy the updated function:**
   ```bash
   npx supabase functions deploy eitje-aggregate-data
   ```

2. **Verify deployment:**
   - Go to Supabase Dashboard → Edge Functions → `eitje-aggregate-data`
   - Check "Overview" tab → Should show latest deployment time
   - Deployment ID should be newer than `vrucbxdudchboznunndz_f0d7aa77-cb5b-475f-b497-eef5c1a4fcc4_5`

3. **Trigger a test run:**
   - Option A: Wait for next cron job (hourly)
   - Option B: Manually trigger from SQL:
     ```sql
     SELECT * FROM public.trigger_eitje_incremental_sync();
     ```

4. **Check new logs:**
   - Go to "Logs" tab (not "Invocations")
   - Look for new entries after deployment
   - Should see:
     - ✅ "Successfully upserted X of Y labor hours records"
     - ✅ "Successfully upserted X of Y revenue records"
     - ❌ Should NOT see "no unique constraint" errors

5. **Verify data:**
   ```sql
   SELECT COUNT(*) FROM eitje_labor_hours_aggregated;
   SELECT COUNT(*) FROM eitje_revenue_days_aggregated;
   ```

## What Changed

**Before (Failed):**
```typescript
.upsert(aggregatedData, {
  onConflict: 'date,environment_id,team_id'  // ❌ Doesn't work with nullable columns
})
```

**After (Fixed):**
```typescript
// Manual SELECT → UPDATE or INSERT
// Properly handles NULL team_id with .is('team_id', null)
```

## Expected Behavior

After deployment, you should see:
- No more 500 errors
- Successful upsert messages in logs
- Data appearing in aggregated tables



