# 📊 Registry Update Guide

## Quick Start

Update the registry **once per day** to keep file protection current:

```bash
# Easiest way (from project root)
npm run registry:update
```

---

## 🎯 Three Ways to Update

### **Option 1: NPM Script (Recommended)**
```bash
npm run registry:update
```
- **Pros:** Easiest, works from anywhere in project
- **Location:** Runs from `package.json` scripts
- **Time:** ~300ms
- **Cost:** ~$0.003 (Haiku model)

### **Option 2: Bash Wrapper**
```bash
./tools/compliance/update-registry.sh
```
- **Pros:** Standalone executable, no npm needed
- **Location:** `tools/compliance/update-registry.sh`
- **Time:** ~300ms
- **Cost:** ~$0.003 (Haiku model)

### **Option 3: Direct Node**
```bash
node tools/compliance/registry-auto-updater-v2.js
```
- **Pros:** Maximum control
- **Location:** `tools/compliance/registry-auto-updater-v2.js`
- **Time:** ~300ms
- **Cost:** ~$0.003 (Haiku model)

---

## 📊 What It Does

When you run the registry updater:

1. **Scans** all 487 files in `src/` directory
2. **Calculates** checksums for each file
3. **Detects** changes (new/updated/removed files)
4. **Regenerates** registry files:
   - `api-routes.json` (104 files)
   - `pages.json` (82 files)
   - `components.json` (296 files)
   - `services.json` (5 files)
   - `hooks.json` (0 files)
   - `modules.json` (0 files)
   - `index.json` (summary)
5. **Updates** protection status (`"touch_again": false`)
6. **Reports** summary statistics

---

## ✅ Current Registry Status

**Last Updated:** November 20, 2025

```json
{
  "total_functions": 487,
  "by_status": {
    "completed": 419,
    "in-progress": 68
  },
  "protected": 416
}
```

---

## 💰 Cost Breakdown

**Using Haiku Model (Recommended):**
- Input: ~2,000 tokens × $0.80/1M = $0.0016
- Output: ~500 tokens × $2.40/1M = $0.0012
- **Total: ~$0.003 per update**

**Frequency:** Once per day = **$0.003/day** = **$0.09/month** = **$1.08/year**

---

## 🔍 How AI Uses This Registry

### Before Modifying a File

```bash
# I search the existing registry:
grep -r "src/app/api/bork/route.ts" function-registry/

# If found with "touch_again": false
# → I ask you for permission before proceeding
```

### No AI Automation

- ❌ AI does NOT run the updater
- ❌ AI does NOT trigger auto-updates
- ✅ AI only checks existing registry (grep command)
- ✅ You manually trigger updates once per day

---

## 📝 Daily Workflow

1. **Morning:** Start coding (I check registry for each file)
2. **Throughout day:** Make as many changes as needed
3. **End of day:** Run one command:
   ```bash
   npm run registry:update
   ```
4. **Result:** Registry updated, all completed files protected for tomorrow

---

## 🛡️ Files Protected

After running the updater, these files are protected from accidental deletion:

- ✅ All 416 "completed" files marked as `"touch_again": false`
- ✅ 104 API routes
- ✅ 82 pages
- ✅ 296 components
- ✅ 5 services

If I try to modify a protected file, I ask your permission first.

---

## 📁 Files Created

- `package.json` - Added `registry:update` npm script
- `tools/compliance/update-registry.sh` - Bash wrapper script
- Updated `.cursor/rules/` with manual trigger documentation

---

## 🎯 Key Points

1. **Run once per day** - Not after every change (saves tokens)
2. **Choose any method** - npm script, bash script, or direct node
3. **No AI involved** - You control when registry updates
4. **AI still checks** - Before every file modification
5. **Costs $0.003** - Practically free with Haiku model
6. **Takes ~300ms** - Very fast operation

---

**Recommendation:** Add to your end-of-day routine:
```bash
npm run registry:update
```

Then commit the updated `function-registry/` files to keep protection status in git history.




