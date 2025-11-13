# Trigger Aggregation via Supabase Dashboard (Test Button)

## Step-by-Step Instructions

### Step 1: Navigate to Edge Function

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `vrucbxdudchboznunndz`
3. Go to **Edge Functions** (left sidebar)
4. Click on **`eitje-aggregate-data`**

### Step 2: Trigger Labor Hours Aggregation (Oct 11-30)

1. In the `eitje-aggregate-data` function page, you'll see a **"Test"** button or tab
2. Click **"Test"** (or look for an area to enter JSON payload)
3. In the request body/JSON field, paste this:

```json
{
  "endpoint": "time_registration_shifts",
  "startDate": "2025-10-11",
  "endDate": "2025-10-30"
}
```

4. Click **"Run"** or **"Test"** button
5. Wait for the response (may take 10-30 seconds)
6. Check the response - should show `"success": true`

### Step 3: Trigger Revenue Days Aggregation (Oct 9-29)

1. Still in the same `eitje-aggregate-data` function page
2. Click **"Test"** again
3. Replace the JSON with:

```json
{
  "endpoint": "revenue_days",
  "startDate": "2025-10-09",
  "endDate": "2025-10-29"
}
```

4. Click **"Run"** or **"Test"** button
5. Wait for the response (may take 10-30 seconds)
6. Check the response - should show `"success": true`

### Step 4: Verify Aggregation Worked

After both invocations complete, verify the results:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run these queries:

```sql
-- Check Labor Hours aggregation
SELECT 
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_labor_hours_aggregated
WHERE date >= '2025-10-11' AND date <= '2025-10-30';

-- Check Revenue Days aggregation
SELECT 
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM eitje_revenue_days_aggregated
WHERE date >= '2025-10-09' AND date <= '2025-10-29';
```

3. Both should show records with dates matching the ranges

### Step 5: Run Gap Check Again

Run your gap check SQL to verify all missing dates are now aggregated:

```sql
-- Labor Hours gap check (should return fewer or zero rows)
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

## Alternative: Check Function Logs

If the Test button shows the function is running but you're not sure of results:

1. Go to **Edge Functions** → **`eitje-aggregate-data`**
2. Click on **"Logs"** tab
3. Look for recent invocations - should show:
   - `"Aggregating time_registration_shifts from 2025-10-11 to 2025-10-30"`
   - `"Created X aggregated labor hours records"`
   - `"Successfully processed time registration shifts"`

## Troubleshooting

If you see errors:

1. **"Missing required parameters"**: Make sure JSON is valid and includes all three fields
2. **"Failed to fetch raw data"**: Check that raw data exists in the date range
3. **"Failed to insert aggregated data"**: Check edge function logs for detailed error
4. **Duplicate key errors**: This is expected if you run multiple times - data will still be aggregated

If Test button doesn't work:
- Try refreshing the page
- Check that the function is deployed (status shows "Deployed")
- Try using the Supabase CLI: `npx supabase functions invoke eitje-aggregate-data --body '{"endpoint":"time_registration_shifts","startDate":"2025-10-11","endDate":"2025-10-30"}'`



