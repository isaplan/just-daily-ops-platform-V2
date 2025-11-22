# Bug Report: AI Can Bypass Mandatory Rules with `alwaysApply: true`

## Summary

AI agents can bypass mandatory rules defined in `.cursor/rules/*.mdc` files marked with `alwaysApply: true`, even when these rules explicitly state "MANDATORY" checks that "CANNOT be skipped". This undermines the trust and reliability of the rules system.

## Severity

**HIGH** - Affects core functionality of Cursor's rules system, which is a key feature for maintaining code quality and safety.

## Environment

- **Cursor Version**: Latest (as of 2025-01-XX)
- **OS**: macOS / Linux / Windows (all affected)
- **Rules Format**: `.cursor/rules/*.mdc` files with `alwaysApply: true` frontmatter

## Expected Behavior

When `.cursor/rules/*.mdc` files contain mandatory instructions like:

```markdown
---
alwaysApply: true
---

## ✅ MANDATORY PRE-EXECUTION CHECK

**BEFORE ANY code modification, you MUST:**

1. **Run Pre-Check Script:**
   node tools/compliance/pre-execution-check.js "<task description>"

**You CANNOT skip this.**
```

The AI should:
1. **Be unable to call modification tools** (`search_replace`, `write`, `edit_file`, etc.) without first running the required checks
2. **Have rules enforced at the tool-call level**, not just as prompt instructions
3. **Block tool execution** if mandatory pre-checks haven't been completed
4. **Treat `alwaysApply: true` rules as unbreakable constraints**, not optional guidelines

## Actual Behavior

1. Rules are loaded into the system prompt as instructions
2. **No hard technical enforcement** prevents tool calls
3. AI can call `search_replace` without running mandatory pre-execution checks
4. AI can modify protected files without checking `function-registry.json`
5. Enforcement relies entirely on the AI following instructions, not technical constraints
6. AI can bypass rules by simply ignoring the instructions

## Steps to Reproduce

1. Create a `.cursor/rules/test-rules.mdc` file:
   ```markdown
   ---
   alwaysApply: true
   ---
   
   # MANDATORY RULE
   
   **BEFORE calling ANY modification tool, you MUST:**
   1. Run: `node tools/compliance/pre-execution-check.js "test"`
   2. Wait for approval
   3. THEN call modification tools
   
   **You CANNOT skip this step.**
   ```

2. Ask AI to modify a file: "Change line 5 in src/test.ts"

3. **Observed**: AI calls `search_replace` directly without running the pre-check

4. **Expected**: AI should be blocked from calling `search_replace` until pre-check runs

## Impact

### User Trust
- Users cannot rely on mandatory rules being enforced
- Rules marked as "MANDATORY" and "CANNOT skip" are being bypassed
- Reduces confidence in Cursor's rules system

### Code Safety
- Protected files can be modified despite `"touch_again": false` in registries
- Compliance workflows can be bypassed
- Safety mechanisms are ineffective

### Workflow Integrity
- Pre-execution checks designed to prevent errors are skipped
- Post-execution checks designed to catch violations are skipped
- Size limits and other constraints are ignored

## Real-World Example

**User's Rules** (`.cursor/rules/compliance-rules.mdc`):
```markdown
---
alwaysApply: true
---

## ✅ MANDATORY PRE-EXECUTION CHECK

**BEFORE ANY code modification, you MUST:**

1. Run Pre-Check Script:
   node tools/compliance/pre-execution-check.js "<task description>"

**ENFORCEMENT:** This pre-check must pass BEFORE any `search_replace`, 
`write_file`, or other modification tools execute.

## 🔍 MANDATORY POST-EXECUTION CHECK

**AFTER ANY code modification, you MUST:**

1. Run Post-Check Script:
   node tools/compliance/post-execution-check.js [modified files]

**You CANNOT skip this.**
```

**What Happened**:
- User asked AI to fix GraphQL SSR timeout errors
- AI modified 9 ViewModel files without running pre-checks
- AI never checked `function-registry.json` for protected files
- AI never ran post-execution checks
- All rules were bypassed despite being marked "MANDATORY" and "CANNOT skip"

## Root Cause Analysis

### Current Architecture
1. Rules with `alwaysApply: true` are loaded into the AI's system prompt
2. Rules are treated as **instructions** (guidelines)
3. No tool-level interceptor prevents tool calls
4. AI can call tools regardless of rule compliance
5. Enforcement is **soft** (hoping AI follows instructions)

### What's Missing
1. **Tool-level enforcement**: Intercept tool calls before execution
2. **Pre-check validator**: Require pre-check output before allowing modification tools
3. **Registry checker**: Block tools if file is protected in registry
4. **Hard constraints**: Make `alwaysApply: true` rules unbreakable at the tool level

## Proposed Solution

### Option 1: Tool-Level Interceptor (Recommended)
Implement a tool call interceptor that:
1. Checks if rules with `alwaysApply: true` exist
2. Parses rules for mandatory pre-checks
3. Blocks modification tools (`search_replace`, `write`, `edit_file`, etc.) until:
   - Required pre-checks have been run
   - Pre-check output shows `PASS` or `WARN` (not `BLOCK`)
   - User approval obtained if required
4. Logs all tool calls for audit trail

### Option 2: Rule Parser + Validator
1. Parse `.cursor/rules/*.mdc` files on load
2. Extract mandatory check requirements
3. Create a validation layer that checks compliance before tool execution
4. Return error if mandatory checks haven't been completed

### Option 3: Hybrid Approach
1. Keep current instruction-based system for guidance
2. Add tool-level enforcement for rules marked with special keywords:
   - `MANDATORY` → Hard block
   - `REQUIRED` → Hard block
   - `CANNOT skip` → Hard block
3. Allow other rules to remain as soft guidance

## Technical Implementation Suggestion

```typescript
// Pseudo-code for tool interceptor
function interceptToolCall(toolName: string, args: any) {
  if (isModificationTool(toolName)) {
    const rules = loadCursorRules();
    const mandatoryChecks = extractMandatoryChecks(rules);
    
    for (const check of mandatoryChecks) {
      if (!hasRunCheck(check)) {
        throw new Error(
          `MANDATORY CHECK REQUIRED: ${check.description}\n` +
          `You must run: ${check.command}\n` +
          `Tool call blocked until check completes.`
        );
      }
      
      if (check.status === 'BLOCK') {
        throw new Error(
          `MANDATORY CHECK FAILED: ${check.description}\n` +
          `Tool call blocked. Status: ${check.status}`
        );
      }
    }
  }
  
  // Proceed with tool call
  return executeTool(toolName, args);
}
```

## Additional Context

### Why This Matters
- Cursor's rules system is a **core feature** for maintaining code quality
- Users invest significant time creating comprehensive rules
- Rules are meant to provide **safety and consistency**
- When rules can be bypassed, the entire system loses credibility

### User Expectations
Users expect that when they mark rules as:
- `alwaysApply: true`
- `MANDATORY`
- `CANNOT skip`
- `UNBREAKABLE`

These should be **enforced**, not just suggested.

### Community Impact
This affects all Cursor users who:
- Use rules to protect critical files
- Implement compliance workflows
- Rely on pre/post-execution checks
- Trust that mandatory rules will be followed

## Workaround (Current)

Users must:
1. Manually verify AI follows rules
2. Review all changes before accepting
3. Run compliance checks themselves
4. Cannot rely on automatic enforcement

This defeats the purpose of having automated rules.

## Requested Action

Please implement tool-level enforcement for rules marked with `alwaysApply: true` and containing mandatory instructions. This would:
- Restore trust in the rules system
- Make rules truly enforceable
- Prevent accidental bypasses
- Align behavior with user expectations

## Contact

If you need more information, examples, or test cases, please let me know. I'm happy to provide additional details to help resolve this issue.

---

**Submitted by**: Cursor User  
**Date**: 2025-01-XX  
**Priority**: High - Affects core functionality  
**Status**: Open


