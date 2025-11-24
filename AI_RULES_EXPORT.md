# 📦 COMPREHENSIVE AI RULES & CURSOR RULES EXPORT

**Export Date:** 2025-11-20  
**Project:** just-daily-ops-platform-V2  
**Purpose:** Complete backup and reference of all AI rules, cursor rules, compliance systems, and related documentation

---

## 📋 TABLE OF CONTENTS

1. [Cursor Rules Directory Structure](#cursor-rules-directory-structure)
2. [All Rule Files (.mdc)](#all-rule-files-mdc)
3. [Compliance System Documentation](#compliance-system-documentation)
4. [Registry Automation Guide](#registry-automation-guide)
5. [Key Compliance Scripts](#key-compliance-scripts)
6. [File Locations Reference](#file-locations-reference)

---

## 📁 CURSOR RULES DIRECTORY STRUCTURE

```
.cursor/rules/
├── README.md                              # Main documentation
├── 00-0-0-registry-protection.mdc         # Registry protection (HIGHEST PRIORITY)
├── 00-0-project-goals.mdc                 # Project goals & migration context
├── 00-critical-rules.mdc                  # Core compliance rules
├── 01-development-standards.mdc           # React, Next.js, MVVM standards
├── 02-code-reuse.mdc                      # Code reuse & migration source
├── 03-performance-ssr.mdc                 # Performance & SSR optimization
├── 04-aggregated-database-workflow.mdc    # Database workflow rules
├── compliance-rules.mdc                   # Legacy compliance rules
└── project-task-description.mdc           # Project task description
```

---

## 📄 ALL RULE FILES (.mdc)

### 1. README.md - Main Documentation

See: `.cursor/rules/README.md` (305 lines)

**Summary:**
- Overview of branch-aware compliance system
- File descriptions and priorities
- How rules guide AI behavior
- Branch-aware protection (Main vs Feature)
- Permission logging workflow
- Token optimization details
- GitHub Actions integration
- Success metrics and troubleshooting

---

### 2. 00-0-0-registry-protection.mdc

**Priority:** 🔴 ABSOLUTE HIGHEST (loaded first)  
**Lines:** ~142

**Key Content:**
- 🚨 CRITICAL: NEVER DELETE compliance logs
- ✅ MANDATORY WORKFLOW (Manual - Low Token Cost)
- Registry status: 482 files tracked, 413 protected
- Update frequency: Automated every 3 hours via GitHub Actions
- Absolute prohibitions

**Full Content:**
```markdown
---
alwaysApply: true
---

# 🔒 REGISTRY PROTECTION - MANDATORY CHECKS (MANUAL - NO AUTOMATION)

## 🚨 CRITICAL: NEVER DELETE OR EMPTY THESE FILES

### **Compliance Logs (NEVER TOUCH):**
- ❌ `function-registry/` directory - Tracks all completed files (482 files, 413 protected)
- ❌ `function-registry/index.json` - Registry index and summary
- ❌ `function-registry/*.json` - Type-specific registries (api-routes, pages, components, services)
- ❌ `tools/compliance/progress-log.json` - Tracks development progress
- ❌ `tools/compliance/ai-tracking-system.json` - Tracks AI sessions
- ❌ NEVER empty or delete registry files
- ❌ NEVER modify these files except to ADD entries after feature completion

**If Composer or any AI suggests deleting/cleaning these → REJECT immediately**

---

## ✅ MANDATORY WORKFLOW (MANUAL - LOW TOKEN COST)

### **1. BEFORE Modifying ANY File:**

**Check the registry manually:**
```bash
# Quick grep check if file is protected (NO scripts needed)
grep -r "path/to/file" function-registry/
```

**Look for:**
- `"touch_again": false` = **STOP, ASK USER PERMISSION**
- `"status": "completed"` = **STOP, ASK USER PERMISSION**
- File not in registry = OK to modify freely

**If protected (`touch_again: false`):**
1. STOP immediately
2. Show user: "⚠️ This file is marked as completed. Do you want me to modify it?"
3. WAIT for explicit "yes" or "go ahead"
4. Only proceed after permission

---

### **2. Registry Updates (Automated Every 3 Hours):**

**Automatic Updates:**
- ✅ GitHub Actions runs every 3 hours (0am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm)
- ✅ Skips 3-10am window (early morning - no updates)
- ✅ Auto-commits to main if changes detected
- ✅ No AI involved

**To Check Latest Registry Status:**
```bash
cat function-registry/index.json | jq '.summary'
```

**Manual Options (if needed):**
```bash
# Option A: NPM Script
npm run registry:update

# Option B: Bash Script
./tools/compliance/update-registry.sh

# Option C: Direct Node
node tools/compliance/registry-auto-updater-v2.js
```

**This will:**
- Scan all 487 files in src/
- Update protection status
- Mark completed files as `"touch_again": false`
- Generate summary report

**Note:** Automation runs via GitHub Actions every 3 hours - no manual action needed!

---

## 🚫 ABSOLUTE PROHIBITIONS

### **NEVER:**
- ❌ Delete or empty registry files
- ❌ Modify files with `"touch_again": false` without user permission
- ❌ Remove entries from the registry
- ❌ Bypass registry checks
- ❌ Assume permission to touch completed files
- ❌ Run scripts before/after EVERY change (too expensive)

### **ALWAYS:**
- ✅ Check registry manually before modifying files (simple grep)
- ✅ Ask permission for protected files
- ✅ Remind user to update registry once per day (user runs it, not AI)
- ✅ Show user which files are protected when asked

---

## 📊 REGISTRY STATUS

**Current Registry:**
- **482 files** tracked
- **413 files** protected (`touch_again: false`)
- **415 files** completed

**Registry Structure:**
```
function-registry/
├── index.json          (Summary)
├── api-routes.json     (104 routes)
├── pages.json          (79 pages)
├── components.json     (294 components)
├── services.json       (5 services)
├── hooks.json          (0 hooks)
└── modules.json        (0 modules)
```

---

## ⏰ UPDATE FREQUENCY (AUTOMATED)

**Automated Schedule:**
- ✅ GitHub Actions runs **every 3 hours** (fully automated)
- ✅ Skips **3-10am window** (early morning)
- ✅ Auto-commits changes to main branch
- ✅ **NO manual action needed**
- ✅ **NO AI involvement**

**Manual Triggers Available:**
If needed urgently, run: `npm run registry:update`

**Why 3 hours?**
- Detects new files quickly
- Updates completed status regularly
- Balances protection with token cost
- Skips early morning (quiet hours)

---

**Priority:** 🔴 HIGHEST - This rule comes before ALL other rules  
**Token Cost:** ~200 tokens/response (vs ~2,000 for automated scripts)  
**Registry Update:** Once per day (user runs manually, NOT AI)
```

---

### 3. 00-0-project-goals.mdc

**Priority:** 🔴 HIGHEST (loaded second)  
**Lines:** ~217

**Key Content:**
- Technical architecture (MongoDB + GraphQL + MVVM migration)
- Project structure explanation (`src/`, `src-v1/`, `old-pages-sql-scripts/`)
- Migration process with UI/UX preservation requirement
- Migration examples and checklist

**Full Content:** See `.cursor/rules/00-0-project-goals.mdc`

---

### 4. 00-critical-rules.mdc

**Priority:** 🔴 HIGHEST (loaded third)  
**Lines:** ~439

**Key Content:**
- RULE #0: Understand → Clarify → Confirm → Build
- Mandatory verification with evidence
- Branch-aware registry protection
- Permission logging (commit message + JSON file)
- Absolute prohibitions (size limits, no bypass flags)
- Loop prevention
- Registry update automation

**Full Content:** See `.cursor/rules/00-critical-rules.mdc`

---

### 5. 01-development-standards.mdc

**Priority:** 🟡 HIGH  
**Lines:** ~185

**Key Content:**
- React standards (PascalCase, TypeScript, hooks)
- Tailwind CSS standards (utilities, cva, theme values)
- Next.js standards (Server/Client Components, App Router)
- MVVM pattern (Model-View-ViewModel architecture)
- MVVM + SSR Hybrid Pattern (critical for performance)
- shadcn/ui standards (always use when available)

**Full Content:** See `.cursor/rules/01-development-standards.mdc`

---

### 6. 02-code-reuse.mdc

**Priority:** 🟢 MEDIUM  
**Lines:** ~85

**Key Content:**
- Search before creating (existing utilities, hooks, components)
- Migration source of truth (`src-v1/` only)
- Project utility locations
- Priority order (Reuse > Extend > Build)

**Full Content:** See `.cursor/rules/02-code-reuse.mdc`

---

### 7. 03-performance-ssr.mdc

**Priority:** 🟡 HIGH  
**Lines:** ~265

**Key Content:**
- Database pagination (mandatory)
- Caching strategy (ISR + React Query)
- Server Component decision tree
- MongoDB index verification
- Performance targets
- Common performance mistakes
- Implementation checklist

**Full Content:** See `.cursor/rules/03-performance-ssr.mdc`

---

### 8. 04-aggregated-database-workflow.mdc

**Priority:** 🔴 HIGHEST  
**Lines:** ~140

**Key Content:**
- Workflow principle: Always use aggregated collections for GraphQL
- Aggregated collections (products_aggregated, bork_aggregated, eitje_aggregated)
- Raw data collections (only for cron jobs)
- Migration checklist
- Common mistakes
- Current status and exceptions

**Full Content:** See `.cursor/rules/04-aggregated-database-workflow.mdc`

---

### 9. compliance-rules.mdc

**Priority:** 🟡 HIGH  
**Lines:** ~361

**Key Content:**
- RULE #0: Understand → Clarify → Confirm → Build
- Absolute prohibitions (registry protection, size limits, no bypass flags)
- Mandatory registry check (manual - no scripts)
- Registry update (automated every 3 hours)
- Development standards
- Incremental changes pattern
- Code reuse
- Violation severities
- Workflow enforcement

**Full Content:** See `.cursor/rules/compliance-rules.mdc`

---

### 10. project-task-description.mdc

**Priority:** 🟢 MEDIUM  
**Lines:** ~23

**Key Content:**
- Pre/post-execution check workflow
- Mandatory post-execution check

**Full Content:** See `.cursor/rules/project-task-description.mdc`

---

## 📚 COMPLIANCE SYSTEM DOCUMENTATION

### Registry Automation Guide

**File:** `REGISTRY_AUTOMATION_GUIDE.md`  
**Lines:** ~320

**Key Content:**
- Quick overview of automated system
- How it works (schedule, skip window)
- Current status
- Manual triggers
- Workflow details
- Local options (backup)
- Logs and monitoring
- Protection status
- How AI uses the registry
- Cost breakdown
- Configuration
- Troubleshooting

**Full Content:** See `REGISTRY_AUTOMATION_GUIDE.md`

---

## 🔧 KEY COMPLIANCE SCRIPTS

### Registry Auto-Updater V2

**File:** `tools/compliance/registry-auto-updater-v2.js`  
**Type:** Node.js script  
**Purpose:** Scans codebase and updates function registry

**Key Features:**
- Paginated registry (splits by type: api-routes, pages, components, services, hooks, modules)
- Optimized metadata (50% reduction)
- Backward compatible
- Generates checksums for change detection
- Updates protection status automatically

**Usage:**
```bash
# Via NPM script
npm run registry:update

# Direct execution
node tools/compliance/registry-auto-updater-v2.js

# Via bash wrapper
./tools/compliance/update-registry.sh
```

**Class Structure:**
```javascript
class RegistryAutoUpdaterV2 {
  constructor()
  async update()
  ensureRegistryDir()
  loadRegistries()
  scanSourceFiles()
  categorizeFile(filePath)
  calculateChecksum(filePath)
  updateRegistry()
  saveRegistries()
  generateIndex()
  // ... more methods
}
```

---

### Update Registry Shell Script

**File:** `tools/compliance/update-registry.sh`  
**Type:** Bash script  
**Purpose:** Wrapper to execute registry updater

**Content:**
```bash
#!/bin/bash

# This script runs the registry auto-updater.
# It's designed to be triggered manually or via a simple cron job.

# Navigate to the project root
cd "$(dirname "$0")/../../.."

echo ""
echo "🔄 Running Registry Auto-Updater V2..."
echo "------------------------------------"

# Execute the Node.js script
node tools/compliance/registry-auto-updater-v2.js

# Check exit status of the node command
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Registry updated successfully!"
  echo "📝 Files are now protected in function-registry/"
else
  echo ""
  echo "❌ Registry update failed!"
  echo "Please check the logs above for errors."
  exit 1
fi

echo "------------------------------------"
echo ""
```

---

### Registry Cron Scheduler

**File:** `tools/compliance/registry-cron-scheduler.js`  
**Type:** Node.js script (optional local cron)  
**Purpose:** Local cron scheduler for registry updates (backup option)

**Features:**
- Runs every 3 hours
- Skips 3-10am window
- Logs to `tools/compliance/registry-cron.log`

**Usage:**
```bash
npm run registry:schedule
```

---

### GitHub Actions Workflow

**File:** `.github/workflows/registry-update.yml`  
**Type:** GitHub Actions workflow  
**Purpose:** Automated registry updates via GitHub Actions

**Schedule:**
- Every 3 hours: `0 0,3,6,9,12,15,18,21 * * *`
- Skips 3-10am window
- Auto-commits if changes detected

**Key Steps:**
1. Checkout repository
2. Set up Node.js
3. Install dependencies
4. Run registry updater
5. Check for changes
6. Create commit and push if changes detected

---

## 📍 FILE LOCATIONS REFERENCE

### Cursor Rules
```
.cursor/rules/
├── README.md
├── 00-0-0-registry-protection.mdc
├── 00-0-project-goals.mdc
├── 00-critical-rules.mdc
├── 01-development-standards.mdc
├── 02-code-reuse.mdc
├── 03-performance-ssr.mdc
├── 04-aggregated-database-workflow.mdc
├── compliance-rules.mdc
└── project-task-description.mdc
```

### Compliance System
```
tools/compliance/
├── registry-auto-updater-v2.js      # Main updater script
├── update-registry.sh                # Bash wrapper
├── registry-cron-scheduler.js        # Local cron (optional)
├── progress-log.json                 # Development progress
├── ai-tracking-system.json           # AI session tracking
└── function-registry/                # Registry directory
    ├── index.json                    # Summary
    ├── api-routes.json               # API routes registry
    ├── pages.json                    # Pages registry
    ├── components.json               # Components registry
    ├── services.json                 # Services registry
    ├── hooks.json                    # Hooks registry
    └── modules.json                  # Modules registry
```

### GitHub Actions
```
.github/workflows/
└── registry-update.yml               # Automated registry updates
```

### Documentation
```
/
├── REGISTRY_AUTOMATION_GUIDE.md      # Registry automation docs
└── AI_RULES_EXPORT.md                # This file
```

---

## 🎯 QUICK REFERENCE

### Priority Order (Load Order)
1. **00-0-0-registry-protection.mdc** - Registry protection (ABSOLUTE HIGHEST)
2. **00-0-project-goals.mdc** - Project goals & migration (HIGHEST)
3. **00-critical-rules.mdc** - Core compliance rules (HIGHEST)
4. **01-development-standards.mdc** - Development standards (HIGH)
5. **02-code-reuse.mdc** - Code reuse (MEDIUM)
6. **03-performance-ssr.mdc** - Performance & SSR (HIGH)
7. **04-aggregated-database-workflow.mdc** - Database workflow (HIGHEST)
8. **compliance-rules.mdc** - Legacy compliance (HIGH)
9. **project-task-description.mdc** - Task description (MEDIUM)

### Key Commands
```bash
# Check registry status
cat function-registry/index.json | jq '.summary'

# Manual registry update
npm run registry:update

# Check if file is protected
grep -r "path/to/file" function-registry/

# View registry automation guide
cat REGISTRY_AUTOMATION_GUIDE.md
```

### Registry Status
- **Total Files Tracked:** 482
- **Protected Files:** 413 (`touch_again: false`)
- **Completed Files:** 415
- **Update Frequency:** Every 3 hours (automated via GitHub Actions)
- **Skip Window:** 3-10am UTC

---

## 📝 NOTES

### Token Optimization
- **Old approach:** ~2,000 tokens per response (automated scripts)
- **New approach:** ~200 tokens per response (manual grep checks)
- **Savings:** ~90% reduction in token usage
- **Registry updates:** Fully automated via GitHub Actions (zero token cost)

### Protection System
- **Main branch:** HARD BLOCK (zero exceptions for protected files)
- **Feature branch:** ASK PERMISSION (C1 workflow)
- **Permission logging:** Both commit message and `.ai-compliance-permissions.json`

### Size Limits
- **Max 120 lines changed per file** per task
- **Max 20 lines deleted per file**
- **No full file replacements** (>80% of lines changed)

---

## 🔄 VERSION HISTORY

**Version 3.1** (Current)
- Added `00-0-0-registry-protection.mdc` (protects compliance system)
- Populated registry with 482 files (413 protected)
- Removed automated script execution (saves tokens)
- Manual registry checks only (grep before changes)
- Token optimization: ~80% reduction
- Registry updates ONCE PER DAY (user runs manually, NOT AI)
- Registry split into type-specific files
- Use Haiku model for registry updates (cheapest option)

**Version 3.0**
- Branch-aware protection system
- GitHub Actions automation
- Permission logging system

**Version 2.0**
- Modular rule files
- Performance optimizations

**Version 1.0**
- Initial compliance system
- Single rule file

---

## 📞 SUPPORT

For questions or issues:
1. Check `.cursor/rules/README.md` for troubleshooting
2. Review `REGISTRY_AUTOMATION_GUIDE.md` for automation details
3. Check GitHub Actions logs for registry update issues
4. Verify registry status: `cat function-registry/index.json | jq '.summary'`

---

**Export Generated:** 2025-11-20  
**Total Files Exported:** 10 rule files + 1 documentation + 1 automation guide + key scripts  
**Status:** ✅ Complete



