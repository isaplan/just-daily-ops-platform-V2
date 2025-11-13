# Rollback Guide: Pre/Post-Execution Checks

**Feature Branch:** `feature/pre-post-execution-checks`  
**Created:** 2025-10-31  
**Purpose:** Add pre/post-execution validation for AI code modifications

## Quick Rollback (< 5 minutes)

### Option 1: Revert Entire Feature Branch
```bash
# Switch away from feature branch
git checkout development

# Delete feature branch
git branch -D feature/pre-post-execution-checks

# Your working tree is now back to development state
```

### Option 2: Remove Only New Files
```bash
# Remove check scripts
rm .ai-compliance-functions/pre-execution-check.js
rm .ai-compliance-functions/post-execution-check.js

# Remove documentation
rm ROLLBACK-PRE-POST-CHECKS.md
rm docs/pre-post-execution-checks-implementation.md

# Revert rules update
git checkout development -- .ai-rules-docs/ai-operating-constraints.md

# Revert package.json if scripts were wrapped
git checkout development -- package.json
```

## Files Added in This Feature

**New Files (Can be safely deleted):**
1. `.ai-compliance-functions/pre-execution-check.js` - Pre-execution validation script
2. `.ai-compliance-functions/post-execution-check.js` - Post-execution validation script
3. `ROLLBACK-PRE-POST-CHECKS.md` - This file
4. `docs/pre-post-execution-checks-implementation.md` - Implementation docs

**Modified Files (Can be reverted):**
1. `.ai-rules-docs/ai-operating-constraints.md` - Updated rules (has backup)
2. `package.json` - May have wrapped scripts (has backup `package.json.backup`)

## Detailed Rollback Steps

### Step 1: Check Current State
```bash
# See what branch you're on
git branch --show-current

# See what files changed
git status

# See what commits were made
git log --oneline -10
```

### Step 2: Choose Rollback Method

#### Method A: Complete Rollback (Removes Everything)
```bash
# Save current work if needed
git stash

# Switch to development
git checkout development

# Delete feature branch
git branch -D feature/pre-post-execution-checks

# Restore stashed work if needed
git stash pop
```

#### Method B: Partial Rollback (Keep Branch, Remove Changes)
```bash
# Revert specific files
git checkout HEAD -- .ai-rules-docs/ai-operating-constraints.md
git checkout HEAD -- package.json

# Remove new files
rm .ai-compliance-functions/pre-execution-check.js
rm .ai-compliance-functions/post-execution-check.js
rm ROLLBACK-PRE-POST-CHECKS.md
```

#### Method C: Revert Specific Commits
```bash
# Find commit hashes
git log --oneline

# Revert specific commit
git revert <commit-hash>

# Or reset to before feature (DANGEROUS - loses commits)
git reset --hard <commit-before-feature>
```

### Step 3: Restore Backups (If Available)

If `package.json.backup` exists:
```bash
cp package.json.backup package.json
```

## Verification After Rollback

1. **Check npm scripts work:**
   ```bash
   npm run dev  # Should work without pre-check
   ```

2. **Check no check scripts remain:**
   ```bash
   ls .ai-compliance-functions/pre-execution-check.js  # Should not exist
   ls .ai-compliance-functions/post-execution-check.js  # Should not exist
   ```

3. **Verify rules file:**
   ```bash
   # Check that line limit is back to 10 (or original value)
   grep "MAXIMUM.*lines" .ai-rules-docs/ai-operating-constraints.md
   ```

## What This Feature Added

### Scripts
- **pre-execution-check.js**: Runs before code changes, checks existing code, registry, estimates change size
- **post-execution-check.js**: Runs after code changes, validates actual changes, detects violations

### Documentation
- Updated `ai-operating-constraints.md` with pre/post-check requirements
- Changed line limit from 10 to 100
- Added structured JSON output format

### Integration (If Applied)
- Wrapped npm scripts in `package.json` to call pre-checks
- Added exit code handling (0 = pass, 1 = block)

## Troubleshooting Rollback Issues

### Issue: "Cannot delete branch - checked out"
```bash
# Switch to different branch first
git checkout development
git branch -D feature/pre-post-execution-checks
```

### Issue: Files still exist after rollback
```bash
# Force remove
rm -f .ai-compliance-functions/pre-execution-check.js
rm -f .ai-compliance-functions/post-execution-check.js
```

### Issue: package.json still has wrapped scripts
```bash
# Check for backup
ls package.json.backup

# Restore from backup
cp package.json.backup package.json

# Or manually edit package.json to remove && node .ai-compliance-functions/pre-execution-check.js
```

## Re-apply Feature (If Needed)

If you want to re-apply the feature after rollback:
```bash
# Checkout feature branch again
git checkout feature/pre-post-execution-checks

# Or cherry-pick commits
git cherry-pick <commit-hash>
```

## Safety Notes

- ✅ All changes are additive (new files) or documentation (non-breaking)
- ✅ No existing functionality is removed
- ✅ Can be fully removed without breaking anything
- ✅ Scripts are optional - workflow continues if scripts don't exist
- ⚠️ If npm scripts were wrapped, they need to be unwrapped to work without checks

## Support

If rollback causes issues:
1. Check git status: `git status`
2. Check git log: `git log --oneline -10`
3. Review this document's troubleshooting section
4. Restore from development branch: `git checkout development -- <file>`

