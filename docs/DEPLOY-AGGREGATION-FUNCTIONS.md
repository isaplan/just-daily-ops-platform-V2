# Deploy Aggregation Edge Functions

## Quick Deploy (Using Supabase Dashboard)

### Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vrucbxdudchboznunndz
2. Navigate to **Edge Functions** in the left sidebar
3. For each function:

#### Deploy `bork-aggregate-data`:
- Click **"Create a new function"** or find it if it exists
- Name: `bork-aggregate-data`
- Copy the entire content from `supabase/functions/bork-aggregate-data/index.ts`
- Paste into the code editor
- Click **"Deploy"**

#### Deploy `eitje-aggregate-data`:
- Click **"Create a new function"**
- Name: `eitje-aggregate-data`
- Copy the entire content from `supabase/functions/eitje-aggregate-data/index.ts`
- Paste into the code editor
- Click **"Deploy"**

---

## Option 2: Using Supabase CLI (If Installed)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref vrucbxdudchboznunndz

# Deploy both functions
supabase functions deploy bork-aggregate-data
supabase functions deploy eitje-aggregate-data
```

---

## Verify Deployment

After deployment, verify the functions:

1. In Supabase Dashboard → Edge Functions
2. You should see both functions listed:
   - `bork-aggregate-data`
   - `eitje-aggregate-data`
3. Test by triggering a cron job sync - aggregation should happen automatically!

---

## What These Functions Do

### `bork-aggregate-data`
- Automatically invoked after Bork cron job syncs raw data
- Aggregates `bork_sales_data` → `bork_sales_aggregated`
- Calculates: total revenue, quantity, transactions, averages

### `eitje-aggregate-data`
- Automatically invoked after Eitje cron job syncs raw data
- Aggregates Eitje endpoints:
  - `time_registration_shifts` → `eitje_time_registration_shifts_aggregated`
  - `revenue_days` → `eitje_revenue_days_aggregated`
  - `planning_shifts` → (to be implemented)

---

## Important Notes

- These functions are automatically called by the cron job syncs
- If aggregation fails, the sync still succeeds (non-blocking)
- Check function logs in Supabase Dashboard for any errors

