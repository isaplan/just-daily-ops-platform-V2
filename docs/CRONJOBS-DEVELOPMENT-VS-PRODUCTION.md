# Cron Jobs: Development vs Production

## Overview

This document explains how cron jobs work differently in development (local) vs production (Vercel).

---

## Development (Local)

### How It Works

- **Next.js dev server runs continuously** → Cron jobs CAN run continuously
- **`node-cron` library** → Uses in-process scheduling
- **Instrumentation hook** → Initializes cron manager on server startup
- **Requires**: Dev server must be running (`npm run dev`)

### Status

✅ **Cron jobs WILL run continuously** if:
- Dev server is running
- Instrumentation hook is enabled (`instrumentationHook: true` in `next.config.ts`)
- Cron manager initializes on startup

### Limitations

- ⚠️ Cron jobs stop when dev server stops
- ⚠️ Cron jobs don't run if server crashes or restarts
- ⚠️ Each dev server instance runs its own cron jobs (can cause duplicates if multiple instances)

---

## Production (Vercel)

### How It Works

- **Vercel uses serverless functions** → No persistent process
- **`node-cron` WON'T work** → Requires a running process
- **Vercel Cron Jobs** → Uses `vercel.json` configuration
- **API routes** → Vercel calls your API routes on schedule

### Status

✅ **Cron jobs WILL run continuously** using:
- `vercel.json` configuration (defines schedules)
- API routes that Vercel calls on schedule
- Vercel's cron infrastructure (reliable, scalable)

### Configuration

See `vercel.json` for cron job schedules:

```json
{
  "crons": [
    {
      "path": "/api/eitje/v2/cron?jobType=daily-data&action=run-now",
      "schedule": "0 * * * *"
    }
  ]
}
```

### How It Works

1. **Vercel reads `vercel.json`** → Finds cron job definitions
2. **Vercel schedules API calls** → Calls your API routes on schedule
3. **API route executes** → Calls `run-now` action to execute the job
4. **Job runs** → Syncs data, updates `lastRun` timestamp

### Advantages

- ✅ **Reliable** → Vercel's infrastructure handles scheduling
- ✅ **Scalable** → No server management needed
- ✅ **Free tier** → Includes cron jobs (with limits)
- ✅ **Automatic** → No manual setup required

---

## Key Differences

| Feature | Development (Local) | Production (Vercel) |
|---------|-------------------|-------------------|
| **Scheduling** | `node-cron` (in-process) | Vercel Cron (external) |
| **Requires** | Running dev server | `vercel.json` config |
| **Reliability** | Depends on dev server | Vercel infrastructure |
| **Scaling** | Single instance | Auto-scales |
| **Cost** | Free (local) | Free tier available |

---

## Migration Notes

### Current Implementation

- **Development**: Uses `node-cron` via `CronJobManager`
- **Production**: Uses Vercel Cron Jobs via `vercel.json`

### API Routes

Both environments use the same API routes:
- `/api/eitje/v2/cron` → Eitje cron management
- `/api/bork/v2/cron` → Bork cron management

### Action: `run-now`

- **Development**: Can be called manually or via `node-cron`
- **Production**: Called automatically by Vercel Cron Jobs

---

## Testing

### Development

```bash
# Start dev server
npm run dev

# Cron jobs will run automatically every hour
# Check logs for: "[Cron Job] Executing daily-data job at ..."
```

### Production

```bash
# Deploy to Vercel
vercel --prod

# Vercel will automatically call cron jobs on schedule
# Check Vercel logs for execution
```

---

## Troubleshooting

### Development: Cron jobs not running

1. ✅ Check dev server is running
2. ✅ Check `instrumentationHook: true` in `next.config.ts`
3. ✅ Check server logs for initialization message
4. ✅ Manually trigger: `curl -X POST http://localhost:3000/api/eitje/v2/cron -d '{"action":"run-now","jobType":"daily-data"}'`

### Production: Cron jobs not running

1. ✅ Check `vercel.json` exists and is valid
2. ✅ Check Vercel dashboard → Cron Jobs tab
3. ✅ Check API route logs in Vercel
4. ✅ Verify API route accepts GET requests (Vercel cron uses GET)
5. ✅ Check environment variables are set in Vercel

---

## Summary

- **Development**: Cron jobs run continuously IF dev server is running (using `node-cron`)
- **Production**: Cron jobs run continuously automatically (using Vercel Cron Jobs)
- **Both**: Use the same API routes, just different scheduling mechanisms


