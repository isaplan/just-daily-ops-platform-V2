# Deploy Eitje Aggregate Data Edge Function

## Why This Is Needed

The `eitje-incremental-sync` function calls `eitje-aggregate-data` after syncing raw data, but this edge function didn't exist yet. I've created it now.

## Deployment Steps

### 1. Deploy the Edge Function

```bash
npx supabase functions deploy eitje-aggregate-data
```

### 2. Verify Deployment

- Go to Supabase Dashboard → Edge Functions
- Check that `eitje-aggregate-data` appears in the list
- Status should be "DEPLOYED"

### 3. Test the Function

After deployment, you can test it manually:

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

### 4. Check Data Flow

Run the SQL script to verify data is flowing correctly:

```bash
# In Supabase SQL Editor, run:
# scripts/CHECK-EITJE-DATA-FLOW.sql
```

This will show:
- Recent raw data inserts
- Aggregated data records
- Any gaps between raw and aggregated data

## What This Function Does

1. **Reads raw data** from `eitje_time_registration_shifts_raw` or `eitje_revenue_days_raw`
2. **Groups by date and environment_id**
3. **Calculates aggregated metrics**:
   - For labor hours: total hours, wage costs, employee counts, averages
   - For revenue: total revenue, transaction counts, averages
4. **Upserts to aggregated tables**:
   - `eitje_labor_hours_aggregated`
   - `eitje_revenue_days_aggregated`

## Automatic Flow

After deployment:
1. ✅ Cron job runs hourly → calls `eitje-incremental-sync`
2. ✅ `eitje-incremental-sync` syncs raw data → stores to raw tables
3. ✅ `eitje-incremental-sync` calls `eitje-aggregate-data` → processes raw data
4. ✅ `eitje-aggregate-data` aggregates → stores to aggregated tables
5. ✅ UI reads from aggregated tables → fast dashboard loading

## Next Steps After Deployment

1. Trigger a manual sync to test the full flow
2. Check edge function logs for both functions
3. Verify aggregated tables have data
4. Check UI to see if data appears

