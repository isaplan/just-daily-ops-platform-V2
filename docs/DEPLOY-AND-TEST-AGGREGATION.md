# Deploy and Test Aggregation

## Current Status
- ✅ Raw data is being synced (cron job working)
- ❌ Aggregated data is empty (0 records)
- ❌ Aggregation edge function not called yet

## Step 1: Deploy the Edge Function

```bash
npx supabase functions deploy eitje-aggregate-data
```

**Verify deployment:**
- Go to Supabase Dashboard → Edge Functions
- Check that `eitje-aggregate-data` appears in the list
- Status should be "DEPLOYED"

---

## Step 2: Test Aggregation Manually

### Option A: Via Supabase Dashboard
1. Go to Edge Functions → `eitje-aggregate-data`
2. Click "Invoke" button
3. Enter test payload:
```json
{
  "endpoint": "time_registration_shifts",
  "startDate": "2025-10-30",
  "endDate": "2025-10-30"
}
```
4. Click "Invoke"
5. Check logs for results

### Option B: Via curl
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

---

## Step 3: Verify Aggregation Worked

After manual test, run this SQL:
```sql
SELECT 
  COUNT(*) as total_records,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated;
```

Should show records if aggregation worked.

---

## Step 4: Verify Automatic Aggregation

After the next cron run (next hour :00), check:
1. Edge function logs for `eitje-incremental-sync` - should show "Triggering aggregation..."
2. Edge function logs for `eitje-aggregate-data` - should show aggregation running
3. Aggregated tables should have new records

---

## Troubleshooting

If manual test fails:
- Check edge function logs for errors
- Verify raw data exists for the date range
- Check if aggregated tables exist (run migration if needed)
- Verify RLS policies allow inserts



