# Cron Jobs for Bork and Eitje Sync

This document describes the automated cron jobs that sync data from Bork and Eitje APIs.

## Overview

- **Bork Sync**: Runs every hour, syncs last 24 hours of sales data
- **Eitje Sync**: Runs every hour, syncs last 7 days of labor data

Both jobs respect their respective sync configuration tables and can be enabled/disabled independently.

## Setup

### 1. Apply Migration

```bash
supabase db push
```

This will:
- Create hourly cron jobs for Bork and Eitje
- Set up toggle functions to enable/disable jobs
- Jobs are **enabled by default**

### 2. Verify Jobs are Running

```bash
node scripts/manage-cron-jobs.js status
```

## Management

### Check Status

```bash
node scripts/manage-cron-jobs.js status
```

Shows:
- Current sync configuration (mode, intervals)
- Active/inactive cron jobs
- Enabled locations/endpoints

### Enable/Disable Jobs

```bash
# Enable Bork cron jobs
node scripts/manage-cron-jobs.js enable bork

# Disable Eitje cron jobs
node scripts/manage-cron-jobs.js disable eitje
```

### List All Jobs

```bash
node scripts/manage-cron-jobs.js list
```

## Configuration

### Bork Sync Configuration

The `bork_sync_config` table controls Bork sync behavior:

```sql
SELECT * FROM bork_sync_config;
```

- `mode`: `'active'` or `'paused'`
- `sync_interval_minutes`: Interval between syncs (default: 1440 = daily)
- `sync_hour`: Hour of day for sync (0-23)
- `enabled_locations`: Array of location UUIDs to sync

### Eitje Sync Configuration

The `eitje_sync_config` table controls Eitje sync behavior:

```sql
SELECT * FROM eitje_sync_config;
```

- `mode`: `'manual'`, `'backfill'`, or `'incremental'`
- `incremental_interval_minutes`: Interval for incremental syncs (default: 60)
- `worker_interval_minutes`: Worker check interval (default: 5)
- `quiet_hours_start` / `quiet_hours_end`: Hours when sync pauses (default: 02:00-06:00)
- `enabled_endpoints`: Array of endpoints to sync

## Cron Job Details

### Bork Incremental Sync
- **Schedule**: `0 * * * *` (every hour at minute 0)
- **Function**: `bork-incremental-sync`
- **Job Name**: `bork-incremental-sync-hourly`
- **Behavior**: Syncs last 24 hours of data, respects `bork_sync_config.mode`

### Eitje Incremental Sync
- **Schedule**: `0 * * * *` (every hour at minute 0)
- **Function**: `eitje-incremental-sync`
- **Job Name**: `eitje-incremental-sync-hourly`
- **Behavior**: Syncs last 7 days of data, respects `eitje_sync_config.mode` and quiet hours

## Manual Control via SQL

### Enable Bork Jobs
```sql
SELECT public.toggle_bork_cron_jobs(true);
```

### Disable Bork Jobs
```sql
SELECT public.toggle_bork_cron_jobs(false);
```

### Enable Eitje Jobs
```sql
SELECT public.toggle_eitje_cron_jobs(true);
```

### Disable Eitje Jobs
```sql
SELECT public.toggle_eitje_cron_jobs(false);
```

### Check Active Jobs
```sql
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%bork%' OR jobname LIKE '%eitje%';
```

## Troubleshooting

### Jobs Not Running

1. Check if cron extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Verify jobs are scheduled:
```sql
SELECT jobname, active, schedule FROM cron.job;
```

3. Check sync config:
```sql
SELECT * FROM bork_sync_config;
SELECT * FROM eitje_sync_config;
```

4. Check function logs in Supabase dashboard → Edge Functions → Logs

### Jobs Running but No Data

1. Verify API credentials are active:
```sql
SELECT * FROM api_credentials WHERE provider IN ('bork', 'eitje') AND is_active = true;
```

2. Check enabled locations/endpoints in sync config

3. Review edge function logs for errors

## Related Documentation

- [Bork API Integration](../src/lib/bork/README.md)
- [Eitje API Integration](../src/lib/eitje/README.md)
- [Database Endpoint Map](./finance/database.md)

