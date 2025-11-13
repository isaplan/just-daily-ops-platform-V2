# Manual Sync for Missing Dates (Oct 30, 31, Today)

## Problem
The cron job only syncs up to **yesterday** (by design), but Oct 30 and 31 are missing from aggregation.

## Solution
Manually trigger the edge function for the missing dates.

## Steps

### 1. Check Current Sync State
Run this in SQL Editor to see last synced dates:
```sql
SELECT 
  endpoint,
  last_synced_date,
  last_successful_sync_at,
  records_synced
FROM eitje_sync_state
ORDER BY endpoint;
```

### 2. Manually Trigger Sync for Missing Dates

#### Option A: Via Supabase Dashboard
1. Go to Edge Functions → `eitje-incremental-sync`
2. Click "Test" 
3. Leave body empty `{}` - it will check sync state and sync missing dates automatically

#### Option B: Manual Aggregation Only (if raw data already exists)

If raw data exists but isn't aggregated, just trigger aggregation:

**For Labor Hours (Oct 30-31):**
1. Go to Edge Functions → `eitje-aggregate-data`
2. Click "Test"
3. Use this JSON:
```json
{
  "endpoint": "time_registration_shifts",
  "startDate": "2025-10-30",
  "endDate": "2025-10-31"
}
```

**For Revenue Days (Oct 30-31):**
1. Same function, use this JSON:
```json
{
  "endpoint": "revenue_days",
  "startDate": "2025-10-30",
  "endDate": "2025-10-31"
}
```

### 3. Verify Results
Run `scripts/CHECK-MISSING-OCT-30-31-TODAY.sql` to verify data is now aggregated.

## Root Cause
The incremental sync logic syncs up to yesterday only. If a sync fails for a specific date, it stops and doesn't retry that date until the next cron run. The fix I deployed earlier should help, but we need to manually backfill the missing dates.

## For Today's Data
Today (Nov 1) won't be synced until tomorrow (Nov 2) at 00:00, because the cron only syncs completed days. This is expected behavior - you'll see today's data aggregated tomorrow morning.


