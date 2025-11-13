# Cron Jobs Data Flow

## Data Flow Overview

Yes, you are correct! The data flow is:

```
Cron Job → Raw Data Tables → (Manual/Auto) Aggregation → Aggregated Tables
```

### Detailed Flow

1. **Cron Job Executes** (Hourly)
   - Bork: Syncs yesterday's data for enabled locations
   - Eitje: Syncs yesterday's data for enabled endpoints
   - **Stores data in raw tables**: `bork_sales_data`, `eitje_time_registration_shifts`, etc.

2. **Aggregation** (✅ NOW AUTOMATIC)
   - ✅ **Automatic**: Aggregation happens automatically after successful cron syncs
   - **Bork**: After raw data is stored, `bork-aggregate-data` edge function is invoked automatically
   - **Eitje**: After raw data is stored, `eitje-aggregate-data` edge function is invoked automatically
   - **Manual Trigger**: Still available via `/api/bork/aggregate` or `/api/eitje/aggregate` endpoints if needed
   - **Error Handling**: If aggregation fails, sync is still marked as successful (non-blocking)
   
3. **Aggregated Data Storage**
   - Bork: `bork_sales_data` → `bork_sales_aggregated`
   - Eitje: Raw tables → `eitje_labor_hours_aggregated`, `eitje_revenue_days_aggregated`, etc.
   - PowerBI P&L: `powerbi_pnl_data` → `powerbi_pnl_aggregated` (has separate aggregation service)

4. **Display**
   - UI pages consume from aggregated tables (never raw data directly)

## Sync History

The sync history component shows:
- **Last 10 sync attempts** from `api_sync_logs` table
- **Success/Failure status** (completed, failed, running)
- **Number of records inserted** into raw tables
- **Duration** of sync operation
- **Error messages** (if any)
- **Location information**

Access via: `/finance/bork-api` → **Cronjob tab** → Sync History section at bottom

## Configuration UI

The Bork cron job configuration UI now has:
- **Status Toggle**: Start/Pause (controls `bork_sync_config.mode`)
  - ✅ **Fixed**: Now actually toggles cron jobs via `toggle_bork_cron_jobs()` function
- **Sync Frequency**: Every Hour, Every 6 Hours, Daily (controls `sync_interval_minutes`)
  - ✅ **Fixed**: Frequency selector now works and saves to database
- **Sync Hour**: For daily syncs (controls `sync_hour`)
- **Save Button**: Persists changes and toggles cron jobs automatically

## Current Status

- ✅ Sync history API and component created
- ✅ Bork configuration UI component with working controls
- ✅ Configuration APIs for Bork and Eitje
- ✅ Cron jobs respect config mode (active/paused)
- ✅ **Automatic aggregation after successful syncs** (NEW!)
  - `bork-aggregate-data` edge function automatically invoked
  - `eitje-aggregate-data` edge function automatically invoked
