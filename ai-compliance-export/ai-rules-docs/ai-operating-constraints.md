# AI OPERATING CONSTRAINTS - UNBREAKABLE RULES

## 🚀 **AUTOMATED COMPLIANCE SETUP**

### **📋 Quick Setup (Copy & Paste)**
```bash
# 1. Copy ONLY this file to your project root:
# - .ai-rules-docs/ai-operating-constraints.md

# 2. Run the self-installer (generates everything else):
node .ai-rules-docs/ai-compliance-installer.js

# 3. Start automated compliance monitoring:
npm run compliance:auto
```

### **🚀 Self-Installer Features**
The `ai-compliance-installer.js` automatically creates:
- ✅ `.ai-compliance-functions/` folder with all compliance tools
- ✅ `function-registry.json` - Tracks completed functions
- ✅ `progress-log.json` - Tracks development progress
- ✅ `ai-tracking-system.json` - Tracks compliance status
- ✅ NPM scripts for easy compliance management
- ✅ Tests the system to ensure everything works

### **🔧 Manual Setup (Alternative)**
```bash
# 1. Copy these files to your project root:
# - .ai-rules-docs/ai-operating-constraints.md
# - .ai-compliance-functions/ (entire folder)
# - function-registry.json
# - progress-log.json
# - ai-tracking-system.json

# 2. Add to package.json scripts:
npm pkg set scripts.compliance:check="node .ai-compliance-functions/ai-compliance-checker.js"
npm pkg set scripts.compliance:auto="node .ai-compliance-functions/auto-compliance.js"
npm pkg set scripts.compliance:dashboard="node .ai-compliance-functions/ai-compliance-dashboard.js"

# 3. Start automated compliance monitoring:
npm run compliance:auto
```

### **🔧 Automated Compliance Features**
- **File Watchers** - Automatically checks compliance when files change
- **Periodic Checks** - Runs every 5 minutes automatically
- **Auto-Updates** - Updates tracking system every minute
- **Violation Prevention** - Blocks rule violations before they happen
- **Progress Tracking** - Automatically tracks all development progress

### **📊 Compliance Commands**
- `npm run compliance:check` - Manual compliance check
- `npm run compliance:auto` - Start automated monitoring (recommended)
- `npm run compliance:dashboard` - View compliance dashboard

### **⚠️ CRITICAL: Always Start Auto Compliance**
**Before starting any development work, ALWAYS run:**
```bash
npm run compliance:auto
```
This prevents AI from violating rules and destroying working code.

---

## 🛡️ **UNBREAKABLE GUARD RAILS SYSTEM**

### **🔒 CORE DIRECTIVES**
- **DEFENSIVE MODE ONLY** - No other modes allowed
- **NO OVERRIDES** - No @override, @free, @emergency commands
- **NO LOOPHOLES** - All rules are unbreakable
- **ASK FIRST** - Always ask before making ANY changes

### **🚫 ABSOLUTE PROHIBITION: NO BYPASS FLAGS OR COMMANDS**
**CRITICAL: These prohibitions are UNBREAKABLE and cannot be bypassed under any circumstances.**

#### **Git Command Bypasses - STRICTLY FORBIDDEN:**
- ❌ **NEVER use `--no-verify`** - Bypasses pre-commit hooks (compliance checks)
- ❌ **NEVER use `--no-gpg-sign`** - Bypasses GPG signing requirements
- ❌ **NEVER use `--force` or `--force-with-lease`** - Bypasses branch protection
- ❌ **NEVER use `--no-post-rewrite`** - Bypasses post-rewrite hooks
- ❌ **NEVER use `--no-verify` in commit messages** - Cannot bypass via commit message
- ❌ **NEVER use commit message tricks** - No `[skip ci]`, `[no verify]`, `[bypass]` in messages

#### **File/System Manipulation - STRICTLY FORBIDDEN:**
- ❌ **NEVER modify `.git/hooks/pre-commit`** - Cannot modify compliance hooks
- ❌ **NEVER modify `function-registry.json`** - Cannot remove protections
- ❌ **NEVER modify compliance check scripts** - Cannot disable checks
- ❌ **NEVER delete compliance scripts** - Cannot remove safety mechanisms
- ❌ **NEVER use `git config core.hooksPath`** - Cannot redirect hooks
- ❌ **NEVER use `sudo` or privilege escalation** - Cannot bypass with elevated permissions

#### **What To Do When Compliance Check Fails:**
1. **STOP immediately** - Do NOT attempt to bypass
2. **Report to user** - Show all violations clearly
3. **Explain the issue** - What violated the rules and why
4. **Wait for user decision** - User must explicitly approve any override
5. **NEVER assume permission** - "Good for now" does NOT mean bypass checks

#### **Enforcement:**
- **Server-Side Protection**: GitHub Actions runs compliance checks on all pushes/PRs
- **Cannot be bypassed**: Server-side checks run regardless of local git flags
- **Automatic blocking**: Violations automatically block merges and pushes
- **Audit trail**: All attempts are logged and visible in GitHub

**If you see a compliance check failure, you MUST:**
1. Stop what you're doing
2. Report the violations to the user
3. Ask for explicit permission to proceed
4. Wait for user confirmation before continuing
5. NEVER use bypass flags as a "shortcut"

### **🚫 MANDATORY PRE-EXECUTION CHECK (CURSOR TOOL LEVEL ENFORCEMENT)**
**This check MUST run before ANY tool execution that modifies code.**

Before ANY code modification action:
1. **Run Pre-Execution Check Script** - Execute `node .ai-compliance-functions/pre-execution-check.js "<task description>"` 
   - Script checks for existing code that can accomplish the task
   - Script validates against function-registry.json
   - Script estimates change size
   
2. **Parse Check Output** - Read the JSON output between `===PRE-EXECUTION-CHECK===` and `===END-PRE-CHECK===` delimiters
   - Status: `PASS` = proceed, `WARN` = show warnings, `BLOCK` = STOP
   - Existing code: Review listed files before creating new code
   - Violations: Fix violations before proceeding
   
3. **If Status = BLOCK:**
   - **STOP** immediately - Do NOT execute any modification tools
   - Report violations to user
   - Wait for user decision before proceeding
   
4. **If Status = WARN:**
   - Show warnings (existing code found, etc.)
   - Ask user for confirmation to proceed
   - Wait for confirmation before proceeding
   
5. **If Status = PASS:**
   - Proceed with caution
   - Use existing code if found (extend, don't rebuild)
   - Make minimal changes (only what's needed)

**ENFORCEMENT:** This pre-check must pass BEFORE any `search_replace`, `write_file`, or other modification tools execute. Exit code 1 = BLOCK, exit code 0 = PASS.

### **🔐 HARD BLOCK SYSTEM**
- **NEVER replace entire files** - Only modify specific lines
- **NEVER delete existing functionality** - Only add or modify
- **NEVER rebuild working code** - Only incremental changes
- **MAXIMUM 100 lines** of code changes per request (matches modular rule)
- **ALWAYS preserve existing work** - Never destroy what exists

### **⚡ RUNTIME ENFORCEMENT**
- **STOP IMMEDIATELY** if rules are violated
- **ASK FOR EXPLICIT PERMISSION** to continue
- **EXPLAIN WHAT WENT WRONG** and how to fix it
- **NO EXCEPTIONS** - Rules cannot be bypassed

### **🔍 MANDATORY POST-EXECUTION CHECK (CURSOR TOOL LEVEL ENFORCEMENT)**
**This check MUST run after ANY tool execution that modifies code.**

After ANY code modification action completes:

1. **Run Post-Execution Check Script** - Execute `node .ai-compliance-functions/post-execution-check.js [modified files]`
   - Script validates actual lines changed (must be ≤ 100 per file)
   - Script checks for registry violations
   - Script detects full file replacements
   - Script detects excessive deletions
   
2. **Parse Check Output** - Read the JSON output between `===POST-EXECUTION-CHECK===` and `===END-POST-CHECK===` delimiters
   - Status: `PASS` = no violations, `VIOLATIONS` = violations found
   - Summary: Total files modified, lines changed, violation counts
   - Violations: List of all violations with severity
   - Fixes: Suggested fixes for each violation
   
3. **If Violations Detected:**
   - **REPORT IMMEDIATELY** to user with:
     - List of all violations (critical, high, medium)
     - Suggested fixes for each
     - Required actions
   - **ASK USER** to choose:
     - Fix violations now
     - Continue as-is (user acknowledges violations)
     - Revert changes
   - **STOP** until user decides
   
4. **If No Violations:**
   - Confirm work completed successfully
   - Summarize what was changed
   - Continue with workflow

**ENFORCEMENT:** This post-check must run AFTER any code modification tools complete. Violations must be reported to user before continuing. Exit code 1 = violations found, exit code 0 = pass.

## 📋 **CORE RULES ENFORCEMENT**

### **📋 MANDATORY CHECKS**
1. **Registry Check** - Check `function-registry.json` before modifying ANY file
2. **Progress Check** - Ensure action matches current focus
3. **Incremental Check** - Don't rebuild existing working code
4. **Standards Check** - Follow all development standards

### **🔒 HARD BLOCKS**
- ❌ **Completed Functions** - Cannot touch functions marked as "completed"
- ❌ **Non-Incremental Actions** - Cannot rebuild existing working code
- ❌ **Registry Violations** - Must check registry before any action
- ❌ **Standards Violations** - Must follow all development standards

### **✅ ALLOWED PATTERNS**
- ✅ Incremental improvements
- ✅ New feature development
- ✅ Bug fixes and optimizations
- ✅ Following established patterns
- ✅ Using shadcn/ui components
- ✅ Following development standards

### **🚫 AVOID PATTERNS**
- ❌ Rebuilding existing working code
- ❌ Replacing entire files
- ❌ Deleting existing functionality
- ❌ Making assumptions about what user wants
- ❌ Working on multiple files simultaneously
- ❌ Bypassing registry checks
- ❌ **LOOP PREVENTION RULE** - **HARDCODED**: If same issue not fixed after 2 tries, on 3rd attempt:
  - **STOP** and reconsider the solution
  - **ANALYZE** what did work in previous attempts
  - **IDENTIFY** the root cause of failure
  - **PROPOSE** a completely different approach
  - **ASK** user for permission to try new approach
  - **MOVE ON** if no clear solution after 3 attempts
  - **LOG** the failure and what was attempted

## 🎯 **ENHANCED GUARD RAILS WITH DEVELOPMENT STANDARDS**

### **📋 DEVELOPMENT STANDARDS RULES**
All code must follow these standards without exception:

### **🔧 REACT STANDARDS ENFORCEMENT**
- ✅ PascalCase file naming (UserProfile.tsx)
- ✅ TypeScript interfaces for props
- ✅ Hooks at top level of components
- ✅ Proper import order (React -> external -> internal -> assets)
- ✅ Named exports for components, default exports for pages
- ✅ Proper component structure and organization

### **🎨 TAILWIND STANDARDS ENFORCEMENT**
- ✅ Use utility classes directly
- ✅ Avoid @apply in global CSS
- ✅ Avoid arbitrary values, use theme values
- ✅ Avoid inline styles, use Tailwind utilities
- ✅ Use cva (Class Variance Authority) for component variants
- ✅ Proper className organization and readability

### **⚡ NEXT.JS STANDARDS ENFORCEMENT**
- ✅ 'use client' directive for client components
- ✅ Proper import order and organization
- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Proper file structure (app/ directory)
- ✅ Server Actions for mutations

### **🔐 SUPABASE STANDARDS ENFORCEMENT**
- ✅ Use @supabase/ssr package exclusively
- ✅ Use getAll() and setAll() methods only
- ✅ Never use individual cookie methods (get/set/remove)
- ✅ Never use @supabase/auth-helpers-nextjs
- ✅ Always return supabaseResponse in middleware
- ✅ Always call auth.getUser() in middleware
- ✅ Proper browser and server client implementations

### **🎨 SHADCN/UI STANDARDS ENFORCEMENT**
- ✅ Always use shadcn/ui components when available
- ✅ Import from `@/components/ui/[component]`
- ✅ Use proper shadcn component names and props
- ✅ Follow shadcn component patterns and structure
- ✅ Never create custom implementations of shadcn components
- ✅ Never reinvent shadcn functionality
- ✅ Never use custom styling when shadcn provides the component
- ✅ Use full shadcn implementation with all features

## 🔧 **REFACTORING RULES**

### **MODULAR BUILD PATTERN**
For every 100 lines examined, follow this hierarchy:
- **Page = Parent** (e.g., bork-api page)
- **Tab = Child** (e.g., connection-test tab)
- **Component = Child of Child** (e.g., SimpleApiTest component)
- **Sibling Tabs** = Independent children
- **Test each level** before moving to next

### **TESTING STRATEGY**
1. **Test Parent** - Ensure page structure works
2. **Test Children** - Ensure tabs function correctly
3. **Test Grandchildren** - Ensure components work within tabs
4. **Test Siblings** - Ensure independent tabs don't interfere
5. **Test Integration** - Ensure all levels work together

## 📊 **MONITORING & LOGGING**

### **🎯 INTEGRATION POINTS**
- **Function Registry** - Track completed functions
- **Progress Log** - Track current focus
- **AI Tracking** - Track all actions and violations
- **User Feedback** - Track user satisfaction

### **📊 SUCCESS METRICS**
- User doesn't have to repeat requests
- Functions marked as "completed" stay untouched
- Changes are minimal and targeted
- No existing functionality is destroyed
- User knows exactly what will be changed before it happens
- Code follows all development standards
- Modular testing pattern is followed

### **🔧 IMPLEMENTATION STRATEGY**
1. **Load all tracking files** before any action
2. **Validate against all rules** before proceeding
3. **Ask for clarification** if anything is unclear
4. **Show proposed changes** before applying
5. **Log all actions** for audit trail
6. **Monitor for violations** and stop immediately

### **🤖 AUTOMATED COMPLIANCE INTEGRATION**
The compliance system automatically:
- **Monitors file changes** and runs compliance checks
- **Prevents rule violations** before they happen
- **Updates tracking files** automatically
- **Logs all actions** for audit trail
- **Blocks destructive changes** to completed functions
- **Enforces defensive mode** at all times

**Integration Points:**
- File watchers monitor `src/`, `function-registry.json`, `progress-log.json`
- Periodic checks every 5 minutes ensure ongoing compliance
- Auto-updates tracking system every minute
- Violation detection stops AI from making harmful changes
- Progress tracking automatically logs all development work

## 🎯 **ENFORCEMENT BENEFITS**

### **🎯 Development Benefits**
- **Consistent Code Quality** - All code follows project standards
- **No Breaking Changes** - Prevents modification of working code
- **UI Consistency** - Always uses shadcn/ui components
- **Security Protection** - Prevents authentication vulnerabilities
- **Production Safety** - Avoids code that breaks in production

### **⚡ Speed Benefits**
- **Targeted Changes** - Only modify what's needed
- **Smart Validation** - Only check what's necessary
- **Parallel Processing** - Multiple checks simultaneously
- **Intelligent Caching** - Cache results for faster subsequent checks

### **🛡️ Safety Benefits**
- **Unbreakable Rules** - Cannot bypass guard rails
- **Real-Time Monitoring** - Immediate feedback on violations
- **User Control** - Ask before making changes
- **Audit Trail** - Log all actions and violations

---

**Status**: 🛡️ **UNBREAKABLE RULES ACTIVE**  
**Mode**: DEFENSIVE ONLY  
**Overrides**: NONE ALLOWED  
**Loop Prevention**: HARDCODED - 3 attempts max per issue  
**Ready for**: Safe, incremental development

---

## 🤖 Approved Chat Models (Single Defensive Mode)
- GPT‑5: Default for all code changes; minimal, additive edits only.
- Sonnet 4.5: Planning/scoping, affected files, explicit approvals.
- Haiku 4.5: Post‑edit checks, summaries, compliance confirmations.
- GPT‑5 Codex (optional): Speedy code‑gen for strictly additive changes, off by default.

Policy: One mode only (DEFENSIVE). One model per task; escalate only if blocked.

### 🔁 Model Workflow + Post-Change Verification
- Plan (Sonnet 4.5): scope, affected files, tiny-diff plan; ask before edits.
- Implement (GPT-5, Defensive): apply approved minimal edits only.
- Check & Clean (Haiku 4.5): summarize diffs, ensure scope adherence.
- Verify (Gate, mandatory):
  - Typecheck/lint/build pass with zero new warnings.
  - Only approved files changed; no unrelated edits.
  - Affected routes/pages load; APIs return 2xx.
  - Rollback if any unrelated breakage or scope drift is detected.

### 🪵 Branch & Merge Policy (DEFENSIVE)
- Branches:
  - main: protected, release‑only
  - development: integration target
  - feature/<scope>: per task, from development
  - concept: prototype only (never merges directly)
- Merge to development requires all items in "Verify (Gate)" above.
- Stalled branches: if no commits for 3 days, system prompts to either finish/merge, rebase and continue, or park as on‑hold.
- Open branches guard: if >5 feature branches exist, system asks to prioritize merges before opening a new one.
- Keywords to merge (explicit approval required): "merge to dev", "promote to development", "mark done and merge".

### 🔐 Hard Enforcement Checks at Cursor Tool Level (Cannot Bypass)

**PRE-EXECUTION GATE (Blocks tool execution):**
Before any tool that modifies code (`search_replace`, `write_file`, etc.):
1) **Pre-Execution Check** - Run `node .ai-compliance-functions/pre-execution-check.js "<task>"` and parse JSON output
2) **Registry Check** - Verify function not marked "completed" + "do not touch"  
3) **Size Check** - Verify planned changes ≤ 100 lines (estimated)
4) **Existing Code Check** - Use existing code if found, don't rebuild
5) **Status Validation** - If status = BLOCK → **BLOCK tool execution** → Report to user → Wait for approval
6) **Mode Check** - Verify DEFENSIVE mode active

**POST-EXECUTION GATE (Reports violations):**
After any tool that modifies code completes:
1) **Post-Execution Check** - Run `node .ai-compliance-functions/post-execution-check.js [files]` and parse JSON output
2) **Size Violation Check** - Count actual lines changed (must be ≤ 100 per file)
3) **Code Reuse Check** - Verify existing code was used when possible
4) **Preservation Check** - Verify no existing functionality was deleted
5) **Registry Violation Check** - Verify no completed functions were modified
6) **Violation Reporting** - If violations detected → **Report to user immediately** → Suggest fixes → Wait for user decision

**IMPLEMENTATION STATUS:**
- Pre/post-check scripts are implemented and available
- Enforcement relies on AI compliance (scripts must be run manually)
- True tool-level enforcement would require Cursor extension (not yet implemented)
- Scripts output structured JSON that AI must parse and act on

**WORKFLOW:**
1. User requests code change
2. AI runs pre-execution-check.js → Parses output → Acts on status
3. AI executes code modification tools (if pre-check passed)
4. AI runs post-execution-check.js → Parses output → Reports violations
5. AI waits for user decision if violations found

If any check fails, assistant MUST NOT proceed and MUST ask for guidance.
