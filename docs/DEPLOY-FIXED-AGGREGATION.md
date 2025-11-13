# Deploy Fixed Aggregation Edge Function

The `eitje-aggregate-data` edge function has been updated to match the working manual sync logic:
- Removed `team_id` complexity
- Groups by `date` and `environment_id` only
- Uses simple `.insert()` (matching working code)

## Deployment Steps

### 1. Deploy the Edge Function

```bash
npx supabase functions deploy eitje-aggregate-data
```

### 2. Test Aggregation for Missing Dates

After deployment, trigger aggregation for the missing date ranges:

#### For Labor Hours (Oct 11-30):
```json
{
  "endpoint": "time_registration_shifts",
  "startDate": "2025-10-11",
  "endDate": "2025-10-30"
}
```

#### For Revenue Days (Oct 9-29):
```json
{
  "endpoint": "revenue_days",
  "startDate": "2025-10-09",
  "endDate": "2025-10-29"
}
```

**How to trigger:**
1. Go to Supabase Dashboard → Edge Functions → `eitje-aggregate-data`
2. Click "Invoke function"
3. Paste the JSON above
4. Click "Invoke"

### 3. Verify Aggregation

Run the check script to verify:
```sql
-- Check missing aggregation (should return empty or fewer rows)
SELECT 
  'Labor Hours: Missing Aggregation' as check_type,
  r.date,
  COUNT(DISTINCT r.id) as raw_records_count,
  a.date as aggregated_date,
  CASE 
    WHEN a.date IS NULL THEN '❌ Not aggregated'
    ELSE '✅ Aggregated'
  END as status
FROM eitje_time_registration_shifts_raw r
LEFT JOIN eitje_labor_hours_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
WHERE r.date >= '2025-10-11' AND r.date <= '2025-10-30'
GROUP BY r.date, a.date
HAVING a.date IS NULL
ORDER BY r.date DESC;
```

## What Changed

### Before (Complex):
- Handled `team_id` separately
- Used manual SELECT → UPDATE/INSERT pattern
- More error-prone with NULL handling

### After (Simple, Matching Working Code):
- Groups all shifts by `date + environment_id` (ignores `team_id`)
- Uses simple `.insert()` 
- Matches the exact logic from `/api/eitje/aggregate`

## Notes

- If you get duplicate key errors when running multiple times, that's expected behavior (matches working code)
- The cron job will automatically trigger aggregation after each successful sync
- You may need to clean up duplicates manually if you run aggregation multiple times for the same date range



