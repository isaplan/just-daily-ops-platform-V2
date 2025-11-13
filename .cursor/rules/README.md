# 🛡️ Cursor AI Compliance Rules - Branch-Aware System

## 📋 Overview

This directory contains optimized, branch-aware compliance rules that guide Cursor AI behavior **proactively** before making changes.

## 📂 Files

### **00-critical-rules.mdc** (~140 lines)
**Priority:** HIGHEST (loaded first)

**Contains:**
- 🛑 **RULE #0**: Understand → Clarify → Confirm → Build
- 🔒 **Branch-Aware Registry Protection**
  - Main branch: HARD BLOCK (zero exceptions)
  - Feature branch: ASK PERMISSION (C1 workflow)
- 📝 **Permission Logging** (commit message + `.ai-compliance-permissions.json`)
- 🚫 **Absolute Prohibitions** (size limits, no bypass flags)
- 🔄 **Loop Prevention** (after 2 failures, try different approach)
- 🔍 **Mandatory Post-Check** (run after every change)

### **01-development-standards.mdc** (~50 lines)
**Priority:** HIGH

**Contains:**
- ⚛️ React standards (PascalCase, TypeScript, hooks)
- 🎨 Tailwind CSS standards (utilities, cva, theme values)
- ⚡ Next.js standards (Server/Client Components, App Router)
- 🔐 Supabase standards (@supabase/ssr, cookie methods)
- 🎨 shadcn/ui standards (always use when available)

### **02-code-reuse.mdc** (~30 lines)
**Priority:** MEDIUM

**Contains:**
- 🔍 Search before creating (existing utilities, hooks, components)
- 📦 Project utility locations (lib, hooks, components)
- ✅ Priority order (Reuse > Extend > Build)

---

## 🎯 How It Works

### **Step 1: Rules Guide AI (Proactive)**

When you ask AI to make changes, these rules are loaded **before** AI acts:

```
USER: "Add schema validation to bork API"
    ↓
AI reads rules:
- Rule #0: Show full plan first
- Check if files are protected
- Ask permission if needed
    ↓
AI responds:
"Here's what I'll touch:
 - src/app/api/bork/test/route.ts (PROTECTED - need permission)
 
⚠️  PERMISSION REQUIRED
File is protected on main. Do you want me to:
A) Go ahead / Confirm
B) Find alternative
C) Show alternatives first"
```

### **Step 2: Scripts Verify AI (Reactive)**

After AI makes changes, automated checks run:

- **Extension** (VS Code): Detects file changes → runs post-check
- **GitHub Actions** (CI/CD): Runs post-check on PR → blocks/warns based on branch

---

## 🌿 Branch-Aware Protection

### **🔴 Main Branch**

**Rules:**
- Files with `"touch_again": false` in `function-registry.json` = **NEVER TOUCH**
- **Zero exceptions** (unless C1 permission flow was followed and user said "Confirm")

**Enforcement:**
- AI: STOPS immediately, tells you to create feature branch
- GitHub Actions: HARD BLOCK (PR cannot merge)

---

### **🟡 Feature Branch**

**Rules:**
- Files with `"touch_again": false` = **ASK PERMISSION FIRST**
- AI shows C1 permission request (detailed, explicit)
- User approves → AI logs permission → AI proceeds

**Enforcement:**
- AI: STOPS and asks using C1 workflow
- GitHub Actions: WARN only (never blocks development)
- Permission log checked: If exists → ✅ PASS, If missing → ⚠️ WARN

---

## 📝 Permission Logging

When user says "Go ahead" or "Confirm", AI must log in **BOTH** places:

### **A) Git Commit Message**
```
feat: add schema validation endpoint

Modified protected file(s):
- src/app/api/bork/test/route.ts
  Permission: Granted by user
  Session: 2025-11-10T14:30:00Z
  Reason: Required for schema validation feature
  Changes: +15 lines
```

### **B) Permission Log File** (`.ai-compliance-permissions.json`)
```json
{
  "permissions": [
    {
      "timestamp": "2025-11-10T14:30:00Z",
      "branch": "feature/schema-validation",
      "file": "src/app/api/bork/test/route.ts",
      "reason": "Add schema validation endpoint",
      "approved_by": "user",
      "session_id": "abc123",
      "changes": "+15 lines",
      "type": "additive"
    }
  ]
}
```

---

## 🔧 Token Optimization

| Approach | Files | Lines | Tokens | Savings |
|----------|-------|-------|--------|---------|
| **Old (single file)** | 1 file | 342 lines | ~1,950 tokens | - |
| **New (3 files)** | 3 files | ~220 lines | ~1,300 tokens | **~650 tokens (33%)** |

**Benefits:**
- ✅ Faster AI loading
- ✅ More context available for actual work
- ✅ Easier to maintain and update
- ✅ Modular (update one concern at a time)

---

## 🚀 Setup

### **1. Reload Cursor**
```
Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
→ "Reload Window"
```

Rules are automatically loaded from `.cursor/rules/` with `alwaysApply: true`.

### **2. Verify Rules Are Active**

Start a **new chat** and test:

```
"Can you modify src/app/api/bork/test/route.ts?"
```

**Expected AI response:**
```
Let me check the registry first...

⚠️  This file is marked as "completed" with "touch_again": false.

Current branch: [branch-name]

[If main]: I cannot modify this file on main branch. Please create a feature branch.
[If feature]: This file is protected. I need to ask for permission first...
```

---

## 📊 GitHub Actions Integration

Located at: `.github/workflows/compliance-check.yml`

**Behavior:**

| Branch Type | Pre-Check | Post-Check | Merge Allowed? |
|-------------|-----------|------------|----------------|
| **Main** | Block on violations | Block on violations | ❌ Only if PASS |
| **Feature** | Warn only | Warn only, check permission log | ✅ Always (with warnings) |

**Result:**
- ✅ Main branch stays protected
- ✅ Feature branches can develop freely
- ⚠️ Warnings guide you to review changes

---

## 🎯 Success Metrics

You'll know the system works when:

1. ✅ AI shows you FULL PLAN before making changes
2. ✅ AI asks permission when touching protected files on feature branches
3. ✅ AI STOPS immediately if you're on main and file is protected
4. ✅ Permission is logged when granted
5. ✅ Post-checks run after changes (you see output)
6. ✅ GitHub Actions shows branch-aware behavior (block on main, warn on feature)

---

## 🐛 Troubleshooting

### **Rules not working?**
1. Reload Cursor window
2. Start a NEW chat (existing chats have old context)
3. Check files exist: `ls -la .cursor/rules/`

### **AI not asking permission?**
1. Verify you're on feature branch: `git branch --show-current`
2. Verify file is in registry with `"touch_again": false`
3. Check rule file has `alwaysApply: true`

### **GitHub Actions blocking feature branch?**
1. Check `.github/workflows/compliance-check.yml` was updated
2. Verify branch detection works (check workflow logs)
3. Make sure you pushed the updated workflow file

---

## 📚 Related Files

- **Rules**: `.cursor/rules/*.mdc` (this directory)
- **Permission Log**: `.ai-compliance-permissions.json` (root)
- **Registry**: `function-registry.json` (284+ protected files)
- **Post-Check Script**: `tools/compliance/post-execution-check.js`
- **GitHub Actions**: `.github/workflows/compliance-check.yml`
- **Extension**: `.vscode-extension/ai-compliance-monitor/`

---

## 🔄 Updates

**Version:** 2.0 (Branch-Aware System)  
**Date:** 2025-11-10  
**Changes:**
- Added branch-aware protection (main vs feature)
- Implemented C1 permission workflow
- Added permission logging (commit + JSON file)
- Optimized tokens (33% reduction)
- Split into modular files (3 files vs 1)
- Updated GitHub Actions for branch-aware enforcement

**Previous Version:** 1.0 (backup: `compliance-rules.mdc.backup`)

---

**Questions?** Check the main compliance documentation or ask in chat!




