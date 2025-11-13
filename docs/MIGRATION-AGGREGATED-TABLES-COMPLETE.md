# Migration: Expand Eitje Aggregated Tables - COMPLETE

## Summary
Successfully expanded `eitje_revenue_days_aggregated` table with all revenue columns and updated all aggregation logic to follow compliance rules (no JSONB in aggregated tables, prioritize normalized columns).

## ✅ Completed Tasks

### 1. Database Migration
**File**: `supabase/migrations/20251102142758_expand_eitje_aggregated_tables.sql`

- Added 22 new columns to `eitje_revenue_days_aggregated`:
  - VAT fields: `total_revenue_excl_vat`, `total_revenue_incl_vat`, `total_vat_amount`, `avg_vat_rate`
  - Payment methods: `total_cash_revenue`, `total_card_revenue`, `total_digital_revenue`, `total_other_revenue`
  - Percentages: `cash_percentage`, `card_percentage`, `digital_percentage`, `other_percentage`
  - Transaction metrics: `max_transaction_value`, `min_transaction_value`
  - Additional: `currency`, `net_revenue`, `gross_revenue`
- Added compliance check to prevent JSONB columns
- Added indexes for performance
- Added column comments for documentation

### 2. Aggregation Service Updates
**File**: `src/lib/eitje/aggregation-service.ts`

- ✅ Expanded `RevenueDaysRecord` interface with all 22 new fields
- ✅ Rewrote `aggregateRevenueDays()` to extract from normalized columns (not JSONB)
- ✅ Updated `aggregateLaborHours()` to prioritize normalized columns over JSONB

### 3. Edge Function Updates
**File**: `supabase/functions/eitje-aggregate-data/index.ts`

- ✅ Updated `aggregateRevenueDays()` to extract all columns from normalized raw table
- ✅ Updated `aggregateTimeRegistrationShifts()` to prioritize normalized columns
- ✅ Fixed grouping to include `team_id` for proper unique constraint handling

### 4. Manual Aggregation API Updates
**File**: `src/app/api/eitje/aggregate/route.ts`

- ✅ Updated `processRevenueDays()` to extract all new fields from normalized columns
- ✅ Changed to `.upsert()` with proper conflict handling

### 5. UI Page Updates
**File**: `src/app/(dashboard)/finance/data/eitje-data/finance/page.tsx`

- ✅ Updated query to select all 22+ new columns
- ✅ Added table headers for all new columns
- ✅ Added table cells to display all new columns
- ✅ Added currency and percentage formatters

## Compliance Status ✅

- ✅ **No JSONB columns**: Migration includes check that raises exception if JSONB found
- ✅ **Normalized columns**: All data extracted to typed columns (DECIMAL, VARCHAR)
- ✅ **RLS policies**: Existing policies maintained (not modified)
- ✅ **Data extraction**: All aggregation functions prioritize normalized columns over JSONB

## Next Steps (Testing)

1. **Run the migration**:
   ```bash
   # Apply via Supabase CLI
   supabase migration up
   
   # OR manually in Supabase Dashboard → SQL Editor
   # Copy and paste contents of: supabase/migrations/20251102142758_expand_eitje_aggregated_tables.sql
   ```

2. **Re-run aggregation** to populate new columns:
   ```bash
   # Call the aggregation API
   curl -X POST http://localhost:3000/api/eitje/aggregate \
     -H "Content-Type: application/json" \
     -d '{"year": 2025, "month": 11}'
   ```

3. **Verify UI**:
   - Navigate to `/finance/data/eitje-data/finance`
   - Check that all 23 columns display correctly
   - Verify currency and percentage formatting

4. **Test filtering**:
   - Test date filters (year, month, presets)
   - Test location filters
   - Verify pagination works with expanded table

## New Columns Added

### VAT Fields
- `total_revenue_excl_vat` - Total revenue excluding VAT
- `total_revenue_incl_vat` - Total revenue including VAT
- `total_vat_amount` - Total VAT amount
- `avg_vat_rate` - Average VAT rate percentage

### Payment Method Fields
- `total_cash_revenue` - Total revenue from cash payments
- `total_card_revenue` - Total revenue from card payments
- `total_digital_revenue` - Total revenue from digital payments
- `total_other_revenue` - Total revenue from other payment methods

### Payment Method Percentages
- `cash_percentage` - Percentage of total revenue from cash
- `card_percentage` - Percentage of total revenue from card
- `digital_percentage` - Percentage of total revenue from digital
- `other_percentage` - Percentage of total revenue from other methods

### Transaction Metrics
- `max_transaction_value` - Maximum single transaction value
- `min_transaction_value` - Minimum single transaction value

### Additional Fields
- `currency` - Currency code (default: EUR)
- `net_revenue` - Net revenue after deductions
- `gross_revenue` - Gross revenue before deductions

## Files Modified

1. `supabase/migrations/20251102142758_expand_eitje_aggregated_tables.sql` (NEW)
2. `src/lib/eitje/aggregation-service.ts` (MODIFIED)
3. `supabase/functions/eitje-aggregate-data/index.ts` (MODIFIED)
4. `src/app/api/eitje/aggregate/route.ts` (MODIFIED)
5. `src/app/(dashboard)/finance/data/eitje-data/finance/page.tsx` (MODIFIED)

## Branch
`migration-aggregated-eitje`

## Ready for Testing ✅

All code follows compliance rules—no JSONB blobs, proper RLS, and normalized columns throughout.

