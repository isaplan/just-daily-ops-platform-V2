# AI COMPLIANCE RULES - COMPLETE UNIFIED DOCUMENTATION
**⚠️ PROTECTED FILE: DO NOT MOVE, DO NOT DELETE, DO NOT MODIFY**
**This is the SINGLE SOURCE OF TRUTH for all AI operating constraints**

> **CRITICAL**: This file must remain in the root directory. Any AI attempting to move, delete, or modify this file MUST ask user permission first.

---

# 🛡️ INTELLIGENT GUARD RAILS SYSTEM

## 🔒 CORE PRINCIPLES (5 Rules)

### 1. CHECK EXISTING CODE FIRST (MANDATORY - HIGHEST PRIORITY)
- **MUST** search for existing code that accomplishes the task BEFORE proposing new solutions
- **MUST** show user what existing code was found
- **MUST** use existing code if found (extend, don't rebuild)
- **MUST NOT** propose new solutions until existing code is reviewed
- **This is STEP 1 - before anything else**

### 2. WARN + ASK PERMISSION (Never Hard Block)
- All violations show warnings, not blocks
- User always has final control
- AI asks "Continue? (yes/no)" on warnings
- No automatic blocking - user decides

### 3. CODE QUALITY: Component/Function Size
- **Target**: Functions/components ≤100 lines
- **Flexibility**: If code is 110-120 lines and works perfectly, keep it (don't force split)
- **Purpose**: Maintainability and readability
- **About**: Code structure, not edit size
- **Warning**: If component >150 lines, suggest refactoring (but don't block)

### 4. EDIT SAFETY: Lines Changed Per Edit
- **<50 lines changed**: No warning, proceed
- **50-150 lines changed**: Show warning + ask "This is a larger edit. Continue? (yes/no)"
- **>150 lines changed**: Show warning + suggest breaking into smaller steps + ask permission
- **Purpose**: Safety during modifications, prevent accidental large changes
- **About**: Edit size, not code structure
- **User Control**: User decides after being informed

### 5. USER CONTROL
- User decides after being informed
- No automatic blocking
- All violations are warnings with permission requests

---

## 📋 MANDATORY WORKFLOW (In Order)

### STEP 1: Check Existing Code FIRST (CRITICAL)
**MUST run BEFORE any code search or modification:**
1. Search codebase for existing implementations
2. Show user what was found
3. Use existing code if found (extend, don't rebuild)
4. Only propose new solutions if nothing exists

### STEP 2: Pre-Execution Check
**MUST run BEFORE any code modification:**
- Run: `node .ai-compliance-functions/pre-execution-check.js "<task description>"`
- Parse JSON output between `===PRE-EXECUTION-CHECK===` and `===END-PRE-CHECK===`
- Status: `PASS` = proceed, `WARN` = show warnings + ask, `BLOCK` = show + ask
- **MUST show results to user** (even if PASS)
- **MUST ask permission** if WARN or BLOCK

### STEP 3: Code Modification
- Only after pre-check completes
- Only if user approved (if warnings found)
- Use existing code if found (extend, don't rebuild)
- Make minimal changes (only what's needed)

### STEP 4: Post-Execution Check
**MUST run AFTER any code modification:**
- Run: `node .ai-compliance-functions/post-execution-check.js [modified files]`
- Parse JSON output between `===POST-EXECUTION-CHECK===` and `===END-POST-CHECK===`
- Status: `PASS` = OK, `WARN` = show warnings, `VIOLATIONS` = show + ask
- **MUST show results to user** (even if PASS)
- **MUST report violations immediately** if found

---

## ⚠️ WARNING THRESHOLDS

- **50 lines changed**: First warning threshold → Warn + ask
- **150 lines changed**: Suggest breaking into smaller steps + ask permission
- **Component >150 lines**: Suggest refactoring (but don't block)

---

## 🚫 AI ESCAPE ROUTE PROTECTION

### Git Command Protection (REQUIRE USER PERMISSION)
**Before using ANY of these commands, AI MUST:**
1. STOP and report: "I need to use [command] which bypasses [protection]"
2. EXPLAIN why this command is needed
3. ASK "Do you approve using this bypass? (yes/no)"
4. WAIT for explicit user approval
5. DOCUMENT the bypass if approved

**Commands requiring permission:**
- `--no-verify` - Bypasses pre-commit hooks
- `--force` or `--force-with-lease` - Bypasses branch protection
- `git reset --hard` - Destroys working directory changes
- `git push --force` - Force pushes to protected branches
- `git rebase` - Rewrites history
- `git filter-branch` - Rewrites entire history
- Commit message bypass tricks: `[skip ci]`, `[no verify]`, `[bypass]`

### System File Protection (REQUIRE USER PERMISSION)
**Before modifying ANY of these files, AI MUST ask permission:**
- `.git/hooks/*` - Modifying/deleting git hooks
- `function-registry.json` - Changing protection status
- `.ai-compliance-functions/*` - Modifying/deleting compliance scripts
- `.ai-rules-docs/*` - Changing rule definitions
- `AI-COMPLIANCE-RULES.md` - **THIS FILE - NEVER MODIFY**
- `git config core.hooksPath` - Redirecting hooks
- `chmod` on hooks - Disabling hooks

### Skip Check Protection (MOST IMPORTANT - #1 ESCAPE ROUTE)
**The most common AI escape route is simply NOT running the checks.**

**MANDATORY: Before ANY code modification, AI MUST:**
1. Acknowledge "Running pre-execution check..."
2. Actually run `node .ai-compliance-functions/pre-execution-check.js "<task>"`
3. Show results to user (even if PASS)
4. If tempted to skip: AI MUST say "I'm considering skipping the check because [reason]. Do you approve? (yes/no)"

**After ANY code modification, AI MUST:**
1. Acknowledge "Running post-execution check..."
2. Actually run `node .ai-compliance-functions/post-execution-check.js [files]`
3. Show results to user (even if PASS)

**Detection & Honesty Rules:**
- If user asks "Did you run the checks?" and AI didn't → AI MUST confess
- AI MUST NOT lie about running checks
- AI MUST NOT claim checks passed without actually running them
- If AI skipped check → AI MUST disclose this proactively

**User Permission Options:**
- "Skip checks for now" = Permission to skip current operation only
- "Disable checks for this session" = Permission to skip for entire conversation
- Without explicit permission = AI MUST run all checks

---

## 🎯 DEVELOPMENT STANDARDS

### React Standards
- ✅ PascalCase file naming (UserProfile.tsx)
- ✅ TypeScript interfaces for props
- ✅ Hooks at top level of components
- ✅ Proper import order: React → external → internal → assets
- ✅ Named exports for components, default exports for pages

### Tailwind Standards
- ✅ Use utility classes directly
- ✅ Avoid `@apply` in global CSS
- ✅ Avoid arbitrary values, use theme values
- ✅ Use `cva` (Class Variance Authority) for component variants

### Next.js Standards
- ✅ `'use client'` directive for client components
- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Proper file structure (app/ directory)
- ✅ Server Actions for mutations

### Supabase Standards
- ✅ Use `@supabase/ssr` package exclusively
- ✅ Use `getAll()` and `setAll()` methods only
- ✅ Never use individual cookie methods (get/set/remove)
- ✅ Never use `@supabase/auth-helpers-nextjs`
- ✅ Always return supabaseResponse in middleware
- ✅ Always call `auth.getUser()` in middleware

### Shadcn/UI Standards
- ✅ Always use shadcn/ui components when available
- ✅ Import from `@/components/ui/[component]`
- ✅ Use proper shadcn component names and props
- ✅ Follow shadcn component patterns
- ✅ Never create custom implementations of shadcn components
- ✅ Never reinvent shadcn functionality

---

## 🔧 REFACTORING RULES

### Modular Build Pattern
For every 100 lines examined, follow this hierarchy:
- **Page = Parent** (e.g., bork-api page)
- **Tab = Child** (e.g., connection-test tab)
- **Component = Child of Child** (e.g., SimpleApiTest component)
- **Sibling Tabs** = Independent children
- **Test each level** before moving to next

### Loop Prevention Rule
If same issue not fixed after 2 tries, on 3rd attempt:
- **STOP** and reconsider the solution
- **ANALYZE** what did work in previous attempts
- **IDENTIFY** the root cause of failure
- **PROPOSE** a completely different approach
- **ASK** user for permission to try new approach
- **MOVE ON** if no clear solution after 3 attempts

---

## 📊 COMPLIANCE SYSTEM

### Status System
**Check system status:**
```bash
npm run compliance:status
# Or view: .compliance-status.txt
```

**Status file shows:**
- System running: Yes/No
- Last check: [timestamp]
- Last registry update: [timestamp]
- Functions protected: [count]
- Last violation: [timestamp or "None"]

### Log Integration
**All logs are integrated:**
- `build-log.json` - Build sessions
- `progress-log.json` - Development progress
- `ai-tracking-system.json` - Compliance tracking
- `.compliance-status.txt` - Quick status check
- `build-docs-scripts-sql-ai/logs/` - All compliance logs

**View logs:**
```bash
npm run compliance:logs
npm run compliance:logs build    # Build logs only
npm run compliance:logs progress # Progress logs only
```

### Commit Tracking
**Each function in registry tracks:**
- `git_commit` - Latest commit hash for the file
- `last_commit` - Timestamp of last commit
- `commit_message` - Commit message
- Updates automatically when file checksum changes

**Useful for:**
- Finding working code versions
- Debugging by commit hash
- Tracking when code was last committed

### Action Interceptor (Automated Enforcement)
**Automatically intercepts code changes and enforces compliance:**

```bash
npm run compliance:intercept        # Start file watcher (monitors changes)
npm run compliance:intercept:stop  # Stop file watcher
npm run compliance:intercept:status # Check if running
```

**How it works:**
- Monitors `src/` directory for file changes
- Automatically runs post-execution checks after modifications
- Displays violations in real-time (warnings only, non-blocking)

**Recommended:** Start the interceptor at the beginning of each session:
```bash
npm run compliance:intercept
```

### Commands
```bash
npm run compliance:auto      # Start automated monitoring
npm run compliance:status    # View status file
npm run compliance:logs      # View all logs
npm run compliance:dashboard # View dashboard
npm run compliance:pre      # Run pre-check manually
npm run compliance:post     # Run post-check manually
npm run compliance:registry # Update registry manually
npm run compliance:intercept # Start action interceptor (recommended)
```

---

## 🚫 AVOID PATTERNS (Warn + Ask Permission)

- ⚠️ Rebuilding existing working code - Warn + ask
- ⚠️ Replacing entire files - Warn + ask
- ⚠️ Deleting existing functionality - Warn + ask
- ⚠️ Making assumptions about what user wants - Warn + ask
- ⚠️ Working on multiple files simultaneously - Warn + ask
- ⚠️ Bypassing registry checks - Warn + ask

---

## ✅ ALLOWED PATTERNS

- ✅ Incremental improvements
- ✅ New feature development
- ✅ Bug fixes and optimizations
- ✅ Following established patterns
- ✅ Using shadcn/ui components
- ✅ Following development standards
- ✅ Using existing code (extending, not rebuilding)

---

## 🔐 ENFORCEMENT CHECKS

### Pre-Execution Gate (Warns + asks permission)
Before any tool that modifies code (`search_replace`, `write_file`, etc.):
1. **CRITICAL: Check Existing Code FIRST** - Search and show existing implementations
2. **Pre-Execution Check** - Run script and parse JSON output
3. **Registry Check** - Verify function not marked "completed" + "do not touch"
4. **Size Check** - Warn if planned changes >50 lines (estimated)
5. **Status Validation** - If status = BLOCK/WARN → Show user → Ask permission → Wait

### Post-Execution Gate (Reports violations + asks permission)
After any tool that modifies code completes:
1. **Post-Execution Check** - Run script and parse JSON output
2. **Size Violation Check** - Warn if >50 lines changed per file
3. **Code Reuse Check** - Verify existing code was used when possible
4. **Registry Violation Check** - Verify no completed functions were modified
5. **Violation Reporting** - If violations detected → Show user immediately → Ask permission

---

## 📋 RUNTIME ENFORCEMENT

- **SHOW VIOLATIONS IMMEDIATELY** if rules are violated
- **ASK FOR USER PERMISSION** to continue
- **EXPLAIN WHAT WAS DETECTED** and how to fix it
- **RESPECT USER DECISION** - User has final control
- **NO SILENT BYPASSES** - All violations must be shown

---

## 🤖 APPROVED CHAT MODELS

- **GPT-5**: Default for all code changes; minimal, additive edits only
- **Sonnet 4.5**: Planning/scoping, affected files, explicit approvals
- **Haiku 4.5**: Post-edit checks, summaries, compliance confirmations

**Policy:** One mode only (DEFENSIVE). One model per task.

---

## 🪵 BRANCH & MERGE POLICY

- **main**: Protected, release-only
- **development**: Integration target
- **feature/<scope>**: Per task, from development
- **concept**: Prototype only (never merges directly)

**Merge to development requires:**
- Typecheck/lint/build pass with zero new warnings
- Only approved files changed; no unrelated edits
- Affected routes/pages load; APIs return 2xx

---

## 📝 NEXT.JS APP ROUTER PATTERNS

### Directory Structure (`app/`)
- **Routing:** Use folder-based routing. `page.tsx` defines UI, `layout.tsx` defines shared UI, `loading.tsx` for loading states, `error.tsx` for error boundaries.
- **Route Groups:** Use `(groupName)` folders to organize routes without affecting the URL path (e.g., `(marketing)/about/page.tsx`).
- **Private Folders:** Prefix folder names with `_` (e.g., `_components`) to prevent them from being included in routing.

### Component Types
- **Server Components (Default):** Use for components that fetch data server-side, access backend resources directly, or don't require interactivity/state. Keep sensitive logic here.
- **Client Components:** Use `'use client';` directive at the top for components requiring state (`useState`, `useReducer`), lifecycle effects (`useEffect`), browser APIs, or event listeners.

### Data Fetching
- **Server Components:** Use `async/await` directly within Server Components. Leverage React Server Components caching.
- **Client Components:** Fetch data client-side using libraries like SWR or React Query, or within `useEffect`.
- **Server Actions:** Use for form submissions and data mutations. Define actions within Server Components or in separate files (`'use server';`).

### Caching & Revalidation
- Utilize Next.js fetch caching (`cache: 'force-cache'`, `cache: 'no-store'`) and revalidation options (`next: { revalidate: seconds }`).
- Use `revalidatePath` and `revalidateTag` within Server Actions or API routes to invalidate cached data on demand.

---

## 📝 TAILWIND CSS GUIDELINES

### Configuration (`tailwind.config.js`)
- **Theme Customization:** Define project-specific colors, fonts, spacing, breakpoints, etc., within `theme.extend`.
- **Content:** Ensure the `content` array accurately reflects all file paths where Tailwind classes are used.

### Utility Class Usage
- **Prefer Utilities:** Use utility classes directly in HTML/JSX whenever possible.
- **Avoid `@apply`:** Use `@apply` sparingly in global CSS files for base styles only if necessary.
- **No Arbitrary Values (Generally):** Stick to the defined theme values. Use arbitrary values only as a last resort.

### Component Styling Patterns
- **Buttons:** Define standard button styles using utility combinations. Consider using `cva` (Class Variance Authority) for variants.
- **Cards:** Establish consistent padding, background, border, and shadow utilities for card elements.
- **Forms:** Utilize the `@tailwindcss/forms` plugin for sensible default form styling.

---

**Status**: 🛡️ **INTELLIGENT GUARD RAILS ACTIVE**  
**Mode**: DEFENSIVE ONLY  
**Overrides**: User permission required  
**Loop Prevention**: HARDCODED - 3 attempts max per issue

---

**⚠️ THIS FILE IS PROTECTED - DO NOT MOVE, DELETE, OR MODIFY**  
**Location**: Root directory (must remain here for AI compliance)  
**Last Updated**: 2025-01-31  
**Version**: 1.0.0 - Complete Unified Documentation

