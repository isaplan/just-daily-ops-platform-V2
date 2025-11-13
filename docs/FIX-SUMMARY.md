# Fix Summary: Empty Aggregated Tables

## Problem
- Edge function `eitje-aggregate-data` was returning HTTP 500
- Aggregated tables remained empty despite having log entries

## Root Cause
**Schema Mismatch**: The `eitje_labor_hours_aggregated` table has a unique constraint on `(date, environment_id, team_id)`, but:
1. The aggregation code wasn't extracting `team_id` from raw data
2. The aggregation wasn't including `team_id` in the records
3. The `onConflict` clause was using `'date,environment_id'` instead of `'date,environment_id,team_id'`

## Fixes Applied

### 1. Added `team_id` Extraction
```typescript
const teamId = rawDataObj?.team?.id || 
               rawDataObj?.team_id || 
               record.team_id ||
               rawDataObj?.teamId ||
               null;
```

### 2. Included `team_id` in Aggregation Key
```typescript
const key = `${date}-${environmentId}-${teamId || 'null'}`;
```

### 3. Added `team_id` to Aggregated Records
```typescript
return {
  date: group.date,
  environment_id: group.environment_id,
  team_id: group.team_id, // ✅ Now included
  // ... other fields
};
```

### 4. Fixed `onConflict` Clause
```typescript
.upsert(aggregatedData, {
  onConflict: 'date,environment_id,team_id' // ✅ Fixed
})
```

### 5. Enhanced Error Logging
- Added detailed error logging with codes, messages, details, hints
- Added sample record logging to verify structure
- Added validation for missing `date` fields
- Better handling of raw_data (object vs string)

## Next Steps

1. **Deploy the fixed function:**
   ```bash
   npx supabase functions deploy eitje-aggregate-data
   ```

2. **Check logs** - Should now show:
   - "Sample aggregated record" with `team_id` included
   - "Successfully upserted X records"
   - No more 500 errors

3. **Verify data** - Run:
   ```sql
   SELECT COUNT(*) FROM eitje_labor_hours_aggregated;
   SELECT COUNT(*) FROM eitje_revenue_days_aggregated;
   ```

## Note
- `team_id` can be `null` (not all shifts have teams)
- The unique constraint allows `null` values
- Revenue days table only has `(date, environment_id)` - no `team_id` needed



