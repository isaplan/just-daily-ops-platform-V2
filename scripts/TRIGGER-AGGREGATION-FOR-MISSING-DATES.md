# Trigger Aggregation for Missing Dates

This guide helps you trigger aggregation for all missing dates identified by the gap check.

## Quick Trigger Script

You can trigger aggregation manually via Supabase Dashboard:

### Step 1: Labor Hours (Oct 11-30, 2025)

1. Go to **Supabase Dashboard** → **Edge Functions** → **eitje-aggregate-data**
2. Click **"Invoke function"**
3. Use this payload:
```json
{
  "endpoint": "time_registration_shifts",
  "startDate": "2025-10-11",
  "endDate": "2025-10-30"
}
```
4. Click **"Invoke"**
5. Check the logs for success/errors

### Step 2: Revenue Days (Oct 9-29, 2025)

1. Go to **Supabase Dashboard** → **Edge Functions** → **eitje-aggregate-data**
2. Click **"Invoke function"**
3. Use this payload:
```json
{
  "endpoint": "revenue_days",
  "startDate": "2025-10-09",
  "endDate": "2025-10-29"
}
```
4. Click **"Invoke"**
5. Check the logs for success/errors

## Verify Results

After triggering, run the gap check SQL again to verify aggregation:

```sql
-- Labor Hours gap check
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

-- Revenue Days gap check
SELECT 
  'Revenue Days: Missing Aggregation' as check_type,
  r.date,
  COUNT(DISTINCT r.id) as raw_records_count,
  a.date as aggregated_date,
  CASE 
    WHEN a.date IS NULL THEN '❌ Not aggregated'
    ELSE '✅ Aggregated'
  END as status
FROM eitje_revenue_days_raw r
LEFT JOIN eitje_revenue_days_aggregated a 
  ON r.date = a.date 
  AND COALESCE(r.environment_id, 0) = COALESCE(a.environment_id, 0)
WHERE r.date >= '2025-10-09' AND r.date <= '2025-10-29'
GROUP BY r.date, a.date
HAVING a.date IS NULL
ORDER BY r.date DESC;
```

## Expected Results

After successful aggregation:
- **Labor Hours**: Should show 0 or significantly fewer "❌ Not aggregated" rows
- **Revenue Days**: Should show 0 or significantly fewer "❌ Not aggregated" rows

## Troubleshooting

If aggregation fails:
1. Check edge function logs in Supabase Dashboard
2. Verify raw data exists for the date range
3. Check for unique constraint violations (may indicate duplicates)
4. Verify `environment_id` is present in raw data



