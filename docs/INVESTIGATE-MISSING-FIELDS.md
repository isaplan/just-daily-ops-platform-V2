# Investigation: Missing Fields in Aggregated Data

## Problem
Not all fields in `eitje_revenue_days_aggregated` have values, even though data exists.

## Root Cause
The aggregation logic reads from normalized columns first, but:
1. **Normalized columns may be NULL/0** because the sync process (`sync-endpoint/route.ts` and `eitje-api-sync/index.ts`) only extracts a few basic fields:
   - `total_revenue`, `revenue_excl_vat`, `revenue_incl_vat`, `vat_amount`, `transaction_count`
   - Missing: payment methods (cash, card, digital), VAT percentage, currency details, etc.

2. **Fallback to JSONB is incomplete** - The aggregation code tries normalized columns but doesn't properly fall back to `raw_data` JSONB when those are empty.

## Solution Steps

### Step 1: Check JSONB Structure
Run `scripts/SHOW-JSONB-STRUCTURE.sql` to see what's actually in `raw_data` JSONB.

### Step 2: Update Aggregation Logic
Update both aggregation functions to properly extract from `raw_data` JSONB when normalized columns are NULL/0:

- `src/app/api/eitje/aggregate/route.ts` - `processRevenueDays()`
- `supabase/functions/eitje-aggregate-data/index.ts` - `aggregateRevenueDays()`
- `src/lib/eitje/aggregation-service.ts` - `aggregateRevenueDays()`

### Step 3: Update Sync Process (Optional, for future syncs)
Update `transformRecord()` in `sync-endpoint/route.ts` to extract more fields:
- Payment methods: `cash_revenue`, `card_revenue`, `digital_revenue`, `other_revenue`
- VAT: `vat_percentage`
- Currency
- Transaction details

## Hours Table
The hours/labor-costs tables use `eitje_labor_hours_aggregated` which already has proper fallback logic. Check if all fields are being extracted correctly.

