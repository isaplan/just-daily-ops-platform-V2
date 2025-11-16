# AI Compliance Rules

## Overview
This document defines the compliance rules that the Cursor AI agent must follow when making code changes to this project. These rules are enforced through automated pre-execution and post-execution checks.

## Core Principles

### 1. **Incremental Changes Only**
- Maximum 100 lines changed per file per task
- Break large changes into smaller, focused commits
- Use `search_replace` for targeted modifications instead of full file rewrites

### 2. **Code Preservation**
- Never delete existing working functionality without explicit approval
- Maximum 20 lines deletion per file (prevents accidental removal of working code)
- Preserve all existing imports and exports unless explicitly instructed

### 3. **Registry Protection**
- Files marked as "completed" with `touch_again: false` in `function-registry.json` are **STRICTLY OFF-LIMITS**
- Any modification to protected files will be **BLOCKED** and must be **REVERTED**

### 4. **Reuse Existing Code**
- Always search for existing implementations before creating new code
- Leverage existing utilities, components, and functions
- Ask before duplicating functionality

### 5. **No Full File Replacements**
- Avoid replacing entire files (threshold: >80% of lines changed)
- Use incremental modifications to update specific sections
- Maintain git history and change traceability

## Pre-Execution Checks

Before starting any code modification, the AI agent must:

1. **Search for Existing Code**: Check if similar functionality already exists
2. **Verify Registry Protection**: Ensure target files are not marked as completed/protected
3. **Estimate Change Size**: Verify planned changes are within 100-line limit
4. **Report Findings**: Display any existing code found or violations detected

### Pre-Check Status Codes
- `PASS`: All checks passed, proceed with changes
- `WARN`: Existing code found or minor concerns, review before proceeding
- `BLOCK`: Critical violation detected, **DO NOT PROCEED**

## Post-Execution Checks

After making code modifications, the AI agent must:

1. **Count Lines Changed**: Verify actual changes are within 100-line limit per file
2. **Check Registry Violations**: Ensure no protected files were modified
3. **Detect Excessive Deletions**: Flag if >20 lines were deleted
4. **Identify Full Replacements**: Detect if files were replaced instead of incrementally updated
5. **Report Violations**: Display all detected violations with severity levels

### Post-Check Status Codes
- `PASS`: No violations detected, changes are compliant
- `WARN`: Minor issues detected (e.g., approaching limits)
- `VIOLATIONS`: One or more violations detected, review required

## Violation Severities

### CRITICAL 🔴
- **Registry Violations**: Modified a protected/completed file
- **Action Required**: REVERT CHANGES IMMEDIATELY

### HIGH 🟠
- **Size Violations**: Exceeded 100-line limit per file
- **Full File Replacement**: Replaced entire file instead of incremental changes
- **File Deletion**: Deleted a file containing working functionality
- **Action Required**: Break down into smaller changes or use incremental approach

### MEDIUM 🟡
- **Excessive Deletions**: Removed >20 lines from a file
- **Deleted Imports**: Removed >5 import statements
- **Removed Exports**: Removed >2 export statements
- **Action Required**: Verify deleted code is not needed

### LOW 🔵
- **Whitespace Changes**: >30 whitespace-only changes
- **Action Required**: Use formatter to avoid unnecessary changes

## Exempt Files

The following files are exempt from size checks (but still subject to registry protection):
- `function-registry.json`
- `ai-tracking-system.json`
- `.ai-compliance-messages.json`
- `.ai-compliance-status.json`
- `progress-log.json`
- `test-results.json`
- `build-log.json`

These files can grow as needed for tracking and logging purposes.

## Excluded Paths

The following paths are excluded from compliance checks:
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`
- `build/`

## File Types Monitored

Compliance checks apply to the following file types:
- `.ts` - TypeScript
- `.tsx` - TypeScript React
- `.js` - JavaScript
- `.jsx` - JavaScript React
- `.json` - JSON (with exemptions for tracking files)

## Best Practices

### DO ✅
- Search for existing code before creating new functionality
- Make small, focused changes (max 100 lines per file)
- Use `search_replace` for targeted modifications
- Preserve existing working functionality
- Respect registry protection
- Review pre-check warnings before proceeding
- Review post-check violations and fix issues

### DON'T ❌
- Don't replace entire files
- Don't modify protected/completed files
- Don't delete working functionality without approval
- Don't ignore pre-check BLOCK status
- Don't proceed without reviewing existing code found
- Don't bundle multiple unrelated changes in one commit

## Compliance Extension

This project includes a VS Code extension that automatically enforces these rules by:

1. **Intercepting File Changes**: Monitors when Cursor AI agent makes changes
2. **Running Pre-Checks**: Executes before code modifications begin
3. **Running Post-Checks**: Executes after all tasks are completed
4. **Displaying Status**: Shows compliance status in status bar and notifications
5. **Reporting Violations**: Lists all violations with severity and required actions

### Extension Features
- ✅ Real-time compliance monitoring
- ⚠️ Pre-check warnings and blocking
- 📊 Detailed violation reports
- 🔄 Automatic check execution
- 💬 Non-blocking notifications (light version)

## Configuration

Compliance rules can be customized in `tools/compliance/config/.ai-compliance-rules.json`:

```json
{
  "maxLinesPerChange": 100,
  "maxDeletions": 20,
  "fullReplacementThreshold": 0.8,
  "excludedPaths": ["node_modules", ".git", ".next", "dist", "build"],
  "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".json"],
  "exemptFiles": ["function-registry.json", "ai-tracking-system.json"],
  "search": {
    "maxResults": 5,
    "minKeywordLength": 3,
    "useContentSearch": true
  }
}
```

## Getting Help

If you need to:
- **Override a rule**: Update `.ai-compliance-rules.json`
- **Mark a file as completed**: Add to `function-registry.json` with `touch_again: false`
- **Exempt a file from size checks**: Add to `exemptFiles` in config
- **Report a false positive**: Check `tools/compliance/` scripts

## References

- Pre-execution check: `tools/compliance/pre-execution-check.js`
- Post-execution check: `tools/compliance/post-execution-check.js`
- Function registry: `function-registry.json`
- Progress log: `progress-log.json`
- Extension docs: `docs/compliance-extension.md`

---

**Remember**: These rules exist to maintain code quality, prevent regressions, and ensure the AI agent makes thoughtful, incremental changes rather than wholesale replacements. Following these rules leads to better code, clearer git history, and fewer bugs.







