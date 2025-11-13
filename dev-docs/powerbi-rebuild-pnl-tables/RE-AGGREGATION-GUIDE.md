# P&L Re-Aggregation Guide

## Overview

After fixing the aggregation calculation logic, all existing aggregated data needs to be re-aggregated to reflect the corrected calculations.

## Quick Start

### Option 1: Using API Endpoint (Recommended)

1. **Start Next.js development server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, run the re-aggregation script:**
   ```bash
   node scripts/re-aggregate-pnl-direct.js
   ```

   This will automatically re-aggregate all locations and years.

### Option 2: Manual API Calls

For specific locations/years, use curl:

```bash
# Re-aggregate all months for a location/year
curl -X POST http://localhost:3000/api/finance/pnl-aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "550e8400-e29b-41d4-a716-446655440003",
    "year": 2024,
    "aggregateAll": true
  }'
```

### Option 3: Direct from Application

If you have a UI for triggering aggregation, use:
- **Endpoint**: `POST /api/finance/pnl-aggregate`
- **Body**: 
  ```json
  {
    "locationId": "uuid",
    "year": 2024,
    "aggregateAll": true
  }
  ```

## Location UUIDs

- **Van Kinsbergen**: `550e8400-e29b-41d4-a716-446655440001`
- **Bar Bea**: `550e8400-e29b-41d4-a716-446655440002`
- **L'Amour Toujours**: `550e8400-e29b-41d4-a716-446655440003`

## Verification

After re-aggregation, verify the data:

```bash
# Test with validation script
node scripts/test-pnl-calculations.js lamour 2024 1
```

The validation should show:
- ✅ Resultaat within 1% margin
- ✅ Revenue matches raw data
- ✅ All categories correctly calculated

## What Gets Re-Aggregated

The re-aggregation process:
1. Reads raw data from `powerbi_pnl_data`
2. Applies corrected calculation logic
3. Stores results in `powerbi_pnl_aggregated`
4. Stores subcategory breakdowns in `powerbi_pnl_aggregated_subcategories`

## Troubleshooting

### Server Not Running
```
❌ Next.js server is not running!
```
**Solution**: Start the server with `npm run dev`

### API Errors
Check the Next.js server logs for detailed error messages. Common issues:
- Database connection problems
- Missing raw data for location/year/month
- Permission issues

### Partial Aggregation
If aggregation fails for some months:
1. Check raw data exists: `SELECT * FROM powerbi_pnl_data WHERE location_id = '...' AND year = 2024`
2. Retry specific month: `POST /api/finance/pnl-aggregate` with `month: 1` instead of `aggregateAll: true`

## Expected Results

After successful re-aggregation:
- Revenue calculations should match raw data totals
- Resultaat calculations should be within 1% margin
- All 3 locations should have correct aggregated data
- Subcategory breakdowns should be stored correctly

## Related Documentation

- [Data Mapping Reference](../../docs/finance/data-mapping.md) - SSoT for category mappings
- [Fix Summary](./FIX_SUMMARY.md) - Details of what was fixed
- [Aggregation Service](../../src/lib/finance/powerbi/aggregation-service.ts) - Implementation

