# 🤖 Registry Automation Guide

## Quick Overview

Registry updates are now **fully automated via GitHub Actions**:

- ⏰ **Every 3 hours** (0am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm)
- 🛑 **Skips 3-10am** (early morning window)
- 🔄 **Auto-commits** if changes detected
- 💰 **Zero cost** to you (runs on GitHub)
- 🚫 **No AI involved**

**You don't need to do anything - it just works!**

---

## 🔄 How It Works

### Automated Schedule

```
GitHub Actions triggers automatically:
0am   ✅ Update (skip window starts in 3 hours)
3am   ❌ SKIP (3-10am window)
6am   ❌ SKIP (3-10am window)
9am   ❌ SKIP (3-10am window)
12pm  ✅ Update (window ended)
3pm   ✅ Update
6pm   ✅ Update
9pm   ✅ Update
```

**Update times:** 0am, 12pm, 3pm, 6pm, 9pm UTC

### What Each Update Does

1. Checkout latest code from main branch
2. Install dependencies
3. **Check current hour** - Skip if 3-10am
4. Run: `npm run registry:update`
5. Scan all 487 files
6. Detect new/changed/removed files
7. Update checksums
8. Auto-commit if changes detected
9. Push to main branch

### Skip Window Logic

**Why skip 3-10am?**
- Quiet hours - minimal new files
- Reduces unnecessary commits
- Saves resources
- Early morning when few people working

**If update triggered at 2:59am:**
- Updates run
- Registry commits to main
- Next scheduled: 3am (but skipped)
- Next actual run: 12pm

---

## 📊 Current Status

```
✅ GitHub Actions workflow: .github/workflows/registry-update.yml
✅ Cron schedule: Every 3 hours
✅ Skip window: 3-10am UTC
✅ Auto-commit: Enabled
✅ Status: ACTIVE
```

---

## 🛠️ Manual Triggers (Optional)

If you need an update RIGHT NOW (don't want to wait 3 hours):

### Option 1: GitHub Actions UI
1. Go to repository
2. Actions tab
3. "Registry Update - Every 3 Hours"
4. Click "Run workflow"
5. Choose branch
6. Click "Run workflow"

### Option 2: Command Line
```bash
npm run registry:update
```

### Option 3: Check Current Status
```bash
cat function-registry/index.json | jq '.summary'
```

---

## 📈 Workflow Details

### File Location
`.github/workflows/registry-update.yml`

### Trigger Times
- **Schedule:** Cron format `0 0,3,6,9,12,15,18,21 * * *`
- **Manually:** Via GitHub Actions UI or `workflow_dispatch`

### Skip Logic
```yaml
if: |
  github.event_name == 'workflow_dispatch' ||
  (skip 3-10am UTC)
```

### Actions
1. Checkout code
2. Setup Node 18
3. Install dependencies
4. Check hour (skip if 3-10am)
5. Run registry updater
6. Commit if changed
7. Push to main

---

## 💻 Local Options (Backup)

If GitHub Actions is unavailable, you can still trigger locally:

### Option A: NPM Script
```bash
npm run registry:update
```
- Instant
- Single run
- No logging

### Option B: Bash Script
```bash
./tools/compliance/update-registry.sh
```
- Instant
- Single run
- Better output

### Option C: Node Cron (Advanced)
```bash
npm run registry:schedule
```
- Runs in background
- Repeats every 3 hours
- Logs to: `tools/compliance/registry-cron.log`
- Config: `tools/compliance/registry-cron-config.json`

---

## 📝 Logs and Monitoring

### GitHub Actions Logs
1. Go to repository Actions tab
2. Select "Registry Update - Every 3 Hours"
3. Click on failed/successful run
4. View detailed logs

### Local Cron Logs (if running npm run registry:schedule)
```bash
# View logs
cat tools/compliance/registry-cron.log

# Follow logs
tail -f tools/compliance/registry-cron.log
```

### Registry Status Anytime
```bash
# Check current status
cat function-registry/index.json | jq '.summary'

# See last update time
cat function-registry/index.json | jq '.last_updated'

# Full details
cat function-registry/index.json | jq '.'
```

---

## 🔐 Protection Status

After each update, registry shows:

```json
{
  "total_functions": 487,
  "by_status": {
    "completed": 419,
    "in-progress": 68
  },
  "protected": 416,
  "last_updated": "2025-11-20T20:15:00.000Z"
}
```

**Protected** files (416 total):
- Have `"touch_again": false`
- AI will ask permission before modifying
- Tracked in version control (git commits show when updated)

---

## 🚀 How AI Uses the Registry

### During Your Coding
1. You ask me to modify a file
2. I search the registry: `grep -r "file" function-registry/`
3. If protected (`"touch_again": false`) → I ask your permission
4. If not protected → I proceed freely

### Registry Auto-Updates
- Every 3 hours: GitHub Actions runs updater
- Detects new files you created
- Marks completed files as protected
- Commits changes to main

### No AI Overhead
- AI doesn't trigger updater
- AI doesn't manage schedule
- AI only checks existing registry
- Saves maximum tokens

---

## 💰 Cost Breakdown

### GitHub Actions
- **Free tier:** 2,000 minutes/month
- **Our usage:** ~5 minutes per update × 5 runs/day × 30 days = 750 minutes
- **Cost:** Free ✅

### Alternative: Local Cron (PM2)
```bash
# Install PM2
npm install -g pm2

# Start scheduler in background
pm2 start tools/compliance/registry-cron-scheduler.js --name registry

# View logs
pm2 logs registry

# Stop
pm2 stop registry
```

**Cost:** Only runs when you want it (local machine)

---

## ⚙️ Configuration

### GitHub Actions (.github/workflows/registry-update.yml)
```yaml
# Edit these settings:
- cron: '0 0,3,6,9,12,15,18,21 * * *'  # Schedule
skipStart: 3   # Skip 3am
skipEnd: 10    # Until 10am
```

### Local Cron (tools/compliance/registry-cron-config.json)
```json
{
  "interval": 10800000,  // 3 hours in milliseconds
  "skipStart": 3,        // 3am
  "skipEnd": 10,         // 10am
  "timezone": "UTC",
  "enabled": true
}
```

---

## 🎯 Summary

| Feature | Status | Details |
|---------|--------|---------|
| **Automation** | ✅ Active | GitHub Actions every 3 hours |
| **Skip Window** | ✅ Configured | 3-10am UTC (early morning) |
| **Auto-Commit** | ✅ Enabled | Changes committed to main |
| **Cost** | ✅ Free | GitHub free tier |
| **AI Overhead** | ✅ Zero | AI doesn't trigger updates |
| **Manual Trigger** | ✅ Available | `npm run registry:update` |
| **Monitoring** | ✅ Available | GitHub Actions logs |

---

## 📞 Troubleshooting

### Updates not running?
1. Check GitHub Actions is enabled: Settings → Actions
2. Verify workflow file exists: `.github/workflows/registry-update.yml`
3. Check Actions tab for errors
4. Manual trigger: `npm run registry:update`

### Registry not updating?
1. Check Actions tab for failures
2. View detailed logs
3. Run manually: `npm run registry:update`
4. Verify `registry-auto-updater-v2.js` exists

### Skip window not working?
1. Check your timezone (workflow uses UTC)
2. Verify GitHub Actions logs show skip message
3. Manually trigger if needed

---

**The system is fully automated - no action needed from you!** 🎉


