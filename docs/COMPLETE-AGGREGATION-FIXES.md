# Complete Aggregation Fixes - Status

## ✅ COMPLETED

### 1. JSONB Extraction Fixed
- Updated all 3 aggregation functions to extract from `raw_data` JSONB when normalized columns are empty
- Added `extractValue()` helper with fallback logic
- Files updated:
  - `src/app/api/eitje/aggregate/route.ts`
  - `supabase/functions/eitje-aggregate-data/index.ts`
  - `src/lib/eitje/aggregation-service.ts`

### 2. Cents to Euros Conversion
- Revenue extraction now reads `amt_in_cents` from JSONB
- Converts to euros: `Math.round(revenueInCents / 100)`
- Applied to all revenue fields (except percentages which keep 2 decimals)

### 3. No Decimals Formatting
- All monetary values: `Math.round(value)` - no decimals
- Percentages: `Math.round(value * 100) / 100` - keep 2 decimals
- Applied to: total_revenue, avg_revenue_per_transaction, VAT fields, payment method fields, transaction metrics

## 🔄 IN PROGRESS

### 4. Show Names Instead of IDs
**Issue**: UI shows `environment_id` and `team_id` (numbers) instead of location/team names

**Solution**: Join with `eitje_environments` and `eitje_teams` tables

**Files to update**:
- `src/app/(dashboard)/finance/data/eitje-data/finance/page.tsx`
- `src/app/(dashboard)/finance/data/eitje-data/hours/page.tsx`
- `src/app/(dashboard)/finance/data/eitje-data/labor-costs/page.tsx`

**Query change needed**:
```typescript
.select(`
  id, 
  date, 
  environment_id,
  eitje_environments!inner(name),
  total_revenue, 
  ...
`)
```

### 5. Eitje Environments → Locations UUID Mapping
**Question**: Are Eitje environments mapped to locations UUID?

**Check**: From migration `20251015220315`, `eitje_environments` has:
- `eitje_environment_id INTEGER` (Eitje's ID)
- `location_id UUID REFERENCES public.locations(id)` (our locations table)

**Action**: Need to verify if mappings exist and if we should use them

### 6. Add Eitje Teams to Locations Database
**Question**: Should Eitje teams be added to locations database?

**Current structure**:
- `eitje_teams` has `eitje_team_id INTEGER` and `name TEXT`
- Teams are within environments (not direct locations)

**Decision needed**: How should teams relate to locations?

## 📋 TODO

1. **Update UI queries** to join with `eitje_environments` and `eitje_teams` for names
2. **Update UI formatting** - remove decimals from currency display (use `Math.round()`)
3. **Fix aggregation-service.ts** rounding issue (one remaining instance)
4. **Re-run aggregation** after all fixes to populate all fields
5. **Verify location mappings** exist for all Eitje environments
6. **Merge all Eitje aggregation changes to main** after completing above tasks
7. **Build Cursor Extension for Compliance Checks** (PARKED - Next task after merge to main)
   - Create VS Code/Cursor extension to intercept file saves and run pre/post-execution compliance checks
   - Hybrid approach: file save hook + file watcher + status bar indicator
   - Files: `.vscode-extension/package.json`, `.vscode-extension/src/extension.ts`, etc.
   - References: `docs/pre-post-execution-checks-implementation.md`, `.ai-rules-docs/ai-operating-constraints.md`

## 🚀 Next Steps

1. Fix remaining rounding in `src/lib/eitje/aggregation-service.ts` (line 663-687)
2. Update UI to show names with joins
3. Update currency formatting functions (no decimals)
4. Re-run aggregation: `SELECT public.trigger_eitje_incremental_sync();`
5. Test all pages show proper names and formatted values

