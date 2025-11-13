# Deploy Eitje Incremental Sync - Step by Step Guide

## Step 1: Deploy Database Migration

### What to do:
1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the SQL below
4. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

### SQL to Run:

```sql
-- Create eitje_sync_state table for tracking incremental sync progress
-- This table tracks the last successfully synced date for each endpoint
-- Enables incremental sync (hour-by-hour) instead of always syncing yesterday

CREATE TABLE IF NOT EXISTS eitje_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL, -- 'time_registration_shifts', 'revenue_days', etc.
  last_successful_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_date DATE NOT NULL, -- Last date fully synced (required, no NULL)
  records_synced INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- Index for fast lookups by endpoint
CREATE INDEX IF NOT EXISTS idx_eitje_sync_state_endpoint 
ON eitje_sync_state(endpoint);

-- Index for monitoring (last successful sync)
CREATE INDEX IF NOT EXISTS idx_eitje_sync_state_last_sync 
ON eitje_sync_state(last_successful_sync_at);

-- Enable RLS
ALTER TABLE eitje_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role (edge functions) to manage sync state
CREATE POLICY "Service role can manage eitje sync state"
ON eitje_sync_state FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to read sync state
CREATE POLICY "Authenticated users can read eitje sync state"
ON eitje_sync_state FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE eitje_sync_state IS 
  'Tracks incremental sync state for Eitje endpoints. Stores last successfully synced date per endpoint to enable hour-by-hour incremental sync.';

COMMENT ON COLUMN eitje_sync_state.endpoint IS 
  'Eitje API endpoint name (e.g., time_registration_shifts, revenue_days)';

COMMENT ON COLUMN eitje_sync_state.last_synced_date IS 
  'Last date that was fully synced for this endpoint. Next sync will start from the day after this date.';

COMMENT ON COLUMN eitje_sync_state.last_error IS 
  'Last error message if sync failed, NULL if last sync succeeded.';
```

### Verify it worked:
After running, check if table was created:
```sql
SELECT * FROM eitje_sync_state;
```
Should return empty result (no rows yet, but table exists).

---

## Step 2: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

1. **Open terminal** in your project directory
2. **Run this command:**
   ```bash
   npx supabase functions deploy eitje-incremental-sync
   ```

3. **Wait for deployment** - you'll see output like:
   ```
   Deploying function eitje-incremental-sync...
   Function deployed successfully!
   ```

### Option B: Using Supabase Dashboard

1. Open **Supabase Dashboard** → **Edge Functions**
2. Click on **eitje-incremental-sync**
3. Click **Deploy** or **Update**
4. If asked, confirm the deployment

---

## Step 3: Verify Deployment

### Check Edge Function Logs:
1. Go to **Supabase Dashboard** → **Edge Functions** → **eitje-incremental-sync**
2. Click on **Logs** tab
3. Look for recent invocations (should show when cron runs)

### Test Manually (Optional):
You can manually trigger the edge function to test:
```bash
curl -X POST https://vrucbxdudchboznunndz.supabase.co/functions/v1/eitje-incremental-sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use Supabase Dashboard → Edge Functions → eitje-incremental-sync → **Invoke**

---

## Step 4: Monitor First Run

### What to expect:
1. **First cron run** (next hour at :00) will:
   - Detect no sync state exists
   - Sync yesterday's data
   - Create sync state entries

2. **Check sync state** after first run:
   ```sql
   SELECT 
     endpoint,
     last_synced_date,
     last_successful_sync_at,
     records_synced,
     last_error
   FROM eitje_sync_state
   ORDER BY endpoint;
   ```

3. **Second cron run** (next hour) will:
   - Use sync state to determine date range
   - Sync only new data (incremental)

---

## Troubleshooting

### Migration failed?
- Check if table already exists: `SELECT * FROM information_schema.tables WHERE table_name = 'eitje_sync_state';`
- If exists, you can skip the CREATE TABLE part, just run the indexes and policies

### Edge function not deploying?
- Make sure you're logged in: `npx supabase login`
- Check Supabase CLI version: `npx supabase --version`
- Try deploying from project root directory

### Cron not running?
- Verify cron job is scheduled: Run SQL from `scripts/schedule-eitje-cron-only.sql`
- Check cron job is active: `SELECT * FROM cron.job WHERE jobname = 'eitje-incremental-sync-hourly';`

---

## Success Indicators

✅ **Migration successful**: Table `eitje_sync_state` exists  
✅ **Edge function deployed**: Shows in Supabase Dashboard → Edge Functions  
✅ **First sync works**: Sync state table has entries after first cron run  
✅ **Incremental works**: Second cron run syncs only new day  

---

## Quick Reference

**SQL Migration File**: `supabase/migrations/20250131000004_create_eitje_sync_state.sql`  
**Edge Function**: `supabase/functions/eitje-incremental-sync/index.ts`  
**Feature Branch**: `feature/eitje-cron-hourly`

