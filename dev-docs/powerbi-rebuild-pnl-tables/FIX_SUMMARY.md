# P&L Balance Calculation Fix Summary

## Changes Made

### 1. Fixed `sumBySubcategories` Function
**File**: `src/lib/finance/powerbi/aggregation-service.ts`

**Problem**: Function only checked subcategory field, missing category-level amounts.

**Fix**: Updated to check both category and subcategory fields:
```typescript
function sumBySubcategories(data: RawPnLData[], subcategories: string[]): number {
  return data
    .filter(d => {
      // Match subcategory if it exists
      if (d.subcategory && subcategories.includes(d.subcategory)) {
        return true;
      }
      // Match category if it exists (for top-level category amounts)
      if (d.category && subcategories.includes(d.category)) {
        return true;
      }
      return false;
    })
    .reduce((sum, d) => sum + d.amount, 0);
}
```

### 2. Added Category-Level Names to All Mappings

**Problem**: Revenue and cost mappings only included subcategory names, missing top-level category names like "Netto-omzet uit leveringen geproduceerde goederen".

**Fix**: Added category-level names to all mappings:
- Revenue categories: Added "Netto-omzet uit leveringen geproduceerde goederen" and "Netto-omzet uit verkoop van handelsgoederen"
- Cost categories: Added all top-level category names (e.g., "Inkoopwaarde handelsgoederen", "Lonen en salarissen", "Huisvestingskosten", etc.)

### 3. Added Variant Subcategory Names

**Problem**: Data has naming inconsistencies (typos, alternative naming).

**Fix**: Added variant names to mappings:
- "Verkopen snacks (btw laag)" (alternative to "Omzet snacks")
- "Verkopen koffie/thee(btw laag)" (alternative to "Omzet koffie / thee")
- "Omzet frisdtranken" (typo variant)
- "Omzet alcohol virj" (typo variant)
- "Omzet hoog alcoholische warme dranken" (additional variant)

### 4. Created Modular Validation & Testing Tools

**Files Created**:
- `src/lib/finance/pnl-balance/calculation-validator.ts` - Validation with 1% margin
- `src/lib/finance/pnl-balance/category-mapper.ts` - Centralized category mappings
- `src/lib/finance/pnl-balance/data-extractor.ts` - Data extraction utilities
- `scripts/test-pnl-calculations.js` - Test script for validation
- `scripts/test-aggregation-logic.js` - Test aggregation logic

## Test Results

### Before Fix
- Lamour 2024-01: Revenue difference 43.27%, Resultaat difference 336.13% ❌

### After Fix (Logic Verified)
- Lamour 2024-01: Revenue calculated correctly (€303,405 matches raw data) ✅
- Logic correctly matches both category-level and subcategory-level data ✅

## Next Steps

### 1. Re-Aggregate Data
The aggregated data in the database was calculated with the old logic. Need to re-run aggregation:

```bash
# Via API endpoint
POST /api/finance/pnl-aggregate
{
  "locationId": "550e8400-e29b-41d4-a716-446655440003",
  "year": 2024,
  "aggregateAll": true
}
```

Or run for all locations/years that need fixing.

### 2. Verify Display Mapping
Check that `src/app/(dashboard)/finance/pnl/balance/page.tsx` correctly maps aggregated data to display format.

### 3. Test All Locations
- Kinsbergen: Test with 2024 and 2025 data
- Bar Bea: Test with 2024 and 2025 data  
- Lamour: Test with 2024 and 2025 data

### 4. Validate 1% Margin
After re-aggregation, verify all calculations are within 1% margin using the validator module.

## Code Quality

- ✅ Modular functions (small, debuggable)
- ✅ Type-safe with TypeScript interfaces
- ✅ Comprehensive category mappings
- ✅ Handles data inconsistencies (typos, variants)
- ✅ Validation utilities for testing

