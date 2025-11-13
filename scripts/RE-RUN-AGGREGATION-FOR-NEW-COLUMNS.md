# Re-run Aggregation for New Columns

After running the migration, you need to re-run aggregation to populate the new columns with data.

## Option 1: Re-run Aggregation via API (Recommended)

### For Recent Date Range (Last Month)
```bash
# Get current date info
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)

# Call aggregation API
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d "{
    \"year\": ${CURRENT_YEAR},
    \"month\": ${CURRENT_MONTH}
  }"
```

### For Specific Date Range
```bash
# Aggregate October 2025
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2025,
    "month": 10
  }'
```

## Option 2: Re-run Aggregation via Supabase Edge Function

```bash
# Manual trigger via Supabase Dashboard
# Go to: Edge Functions → eitje-aggregate-data → Invoke

# Or via curl (replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY)
curl -X POST https://YOUR_PROJECT_URL/functions/v1/eitje-aggregate-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "revenue_days",
    "startDate": "2025-10-01",
    "endDate": "2025-11-01"
  }'
```

## Option 3: Use Aggregation Service Directly

If you have access to the codebase, you can call the aggregation service:

```typescript
import { aggregateRevenueDays } from '@/lib/eitje/aggregation-service';

await aggregateRevenueDays({
  startDate: '2025-10-01',
  endDate: '2025-11-01'
});
```

## Verification

After re-running aggregation, check that new columns are populated:

```sql
-- Check if new columns have data
SELECT 
  date,
  environment_id,
  total_revenue,
  total_revenue_excl_vat,
  total_vat_amount,
  total_cash_revenue,
  total_card_revenue,
  cash_percentage,
  currency
FROM eitje_revenue_days_aggregated
WHERE date >= '2025-10-01'
ORDER BY date DESC, environment_id
LIMIT 10;
```

If columns show `0` or `NULL`, the raw data may not have these fields populated in normalized columns yet. Check the raw table:

```sql
-- Check what columns are populated in raw data
SELECT 
  date,
  environment_id,
  total_revenue,
  net_revenue,
  gross_revenue,
  vat_amount,
  cash_revenue,
  card_revenue,
  digital_revenue,
  currency
FROM eitje_revenue_days_raw
WHERE date >= '2025-10-01'
LIMIT 5;
```

## Notes

- Aggregation will extract from normalized columns first (compliance)
- If normalized columns are empty, values will default to 0
- Re-aggregation will update existing records (via upsert)
- Only records that exist in raw table will be aggregated

