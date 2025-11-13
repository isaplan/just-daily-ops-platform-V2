# P&L Data Mapping Analysis

## Problem Identified

From test results, there's a 43% difference in revenue and 336% difference in resultaat.

### Lamour 2024-01 Example:
- **Raw Data Revenue**: €305,226
- **Aggregated Revenue**: €173,166
- **Difference**: €132,060 (43.27%)

### Root Cause:
The `sumBySubcategories` function only looks at `subcategory` field, but raw data has amounts at both:
1. **Category level**: "Netto-omzet groepen" (€171,362)
2. **Subcategory level**: Individual GL accounts under categories

## Current Logic Issues

### Revenue Calculation
- Currently only sums subcategories matching "Omzet snacks", "Omzet lunch", etc.
- Misses category-level amounts for "Netto-omzet groepen" and "Netto-omzet uit leveringen geproduceerde goederen"

### Solution Needed
1. Sum by category name when it matches revenue categories
2. Sum by subcategory when it matches revenue subcategories
3. Handle both positive and negative amounts correctly

## Category Structure in Raw Data

### Revenue Categories Found:
- `Netto-omzet groepen` (category) - €171,362
- `Netto-omzet uit leveringen geproduceerde goederen` (category) - €194,120
- `Netto-omzet uit verkoop van handelsgoederen` (category) - Various amounts
- Plus subcategories with "Omzet..." names

### Cost Categories Found:
- `Inkoopwaarde handelsgoederen` (category) - Various negative amounts
- `Lonen en salarissen` (category) - Negative amounts
- Plus many other cost categories

## Fix Strategy

1. **Update `sumBySubcategories`** to also check category field
2. **Add category-level matching** for top-level revenue/cost categories
3. **Verify all categories** are mapped correctly
4. **Test with all locations** after fix

