# Fixed: JSONB Extraction for Missing Fields

## Problem Identified
Not all fields in `eitje_revenue_days_aggregated` had values because:
1. **Normalized columns in raw table are often NULL/0** - The sync process only extracts basic fields
2. **Aggregation didn't fallback to JSONB** - Code prioritized normalized columns but didn't check `raw_data` JSONB when normalized columns were empty

## Solution Applied
Updated all three aggregation functions to properly extract from `raw_data` JSONB when normalized columns are empty:

### Files Updated:
1. **`src/app/api/eitje/aggregate/route.ts`** - `processRevenueDays()`
2. **`supabase/functions/eitje-aggregate-data/index.ts`** - `aggregateRevenueDays()`
3. **`src/lib/eitje/aggregation-service.ts`** - `aggregateRevenueDays()`

### Changes:
- Added `extractValue()` helper that:
  - First tries normalized columns
  - Falls back to `raw_data` JSONB using multiple path patterns
  - Handles nested paths like `payment_methods.cash`
- Now extracts:
  - Revenue fields (revenue, net, gross, VAT)
  - Payment methods (cash, card, digital, other)
  - Transaction counts
  - Currency

## Next Steps

### 1. Check JSONB Structure
Run `scripts/SHOW-JSONB-STRUCTURE.sql` in Supabase SQL Editor to see:
- What keys exist in `raw_data` JSONB
- Full JSON structure of one record
- This will help verify the extraction paths are correct

### 2. Re-run Aggregation
After verifying JSONB structure, re-run aggregation to populate fields from JSONB:

```bash
# Via API
curl -X POST http://localhost:3000/api/eitje/aggregate \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "revenue_days", "year": 2025, "month": 11}'
```

Or use SQL trigger:
```sql
SELECT public.trigger_eitje_incremental_sync();
```

### 3. Verify Results
Run `scripts/ANALYZE-MISSING-FIELDS.sql` to check:
- Which normalized columns are populated
- Which aggregated columns now have values
- Coverage percentages

## Hours Table
The hours/labor-costs aggregation (`aggregateLaborHours`) already has proper fallback logic using `extractFieldValue()` helper. It should be working correctly.

## Notes
- The extraction paths are flexible and try multiple common field names
- If you see fields still missing after re-aggregation, we may need to adjust the JSONB path patterns based on the actual JSONB structure

