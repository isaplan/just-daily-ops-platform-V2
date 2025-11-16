# AI Compliance Bypass Protection

## Overview

This document describes the multi-layer protection system that prevents AI from bypassing compliance checks and safety mechanisms.

## Protection Layers

### Layer 1: Client-Side Pre-Commit Hook (`.git/hooks/pre-commit`)
- **Purpose**: Catches compliance violations before commits are created
- **Protection**: Blocks commits with `--no-verify` and other bypass flags
- **Limitation**: Can be bypassed by deleting the hook or using workarounds
- **Status**: Active ✅

### Layer 2: Server-Side GitHub Actions (`.github/workflows/compliance-check.yml`)
- **Purpose**: Enforces compliance on all pushes and pull requests
- **Protection**: Cannot be bypassed by local git commands
- **Features**:
  - Runs pre-execution compliance checks
  - Runs post-execution compliance checks
  - Detects bypass flags in commit messages
  - Blocks merges if violations are found
- **Status**: Active ✅

### Layer 3: Documentation & Rules (`.ai-rules-docs/ai-operating-constraints.md`)
- **Purpose**: Explicitly documents prohibited bypass methods
- **Protection**: Clear rules that AI must follow
- **Status**: Active ✅

## What is Protected

### Git Commands
- ❌ `git commit --no-verify` - Blocked by hook and server-side
- ❌ `git commit --no-gpg-sign` - Blocked by hook and server-side
- ❌ `git push --force` - Blocked by branch protection rules
- ❌ `git push --no-verify` - Blocked by server-side checks

### Commit Messages
- ❌ `[skip ci]` - Detected and blocked by GitHub Actions
- ❌ `[no verify]` - Detected and blocked by GitHub Actions
- ❌ `[bypass]` - Detected and blocked by GitHub Actions
- ❌ Any mention of `--no-verify` - Detected and blocked

### File Manipulation
- ❌ Modifying `.git/hooks/pre-commit` - Detected by compliance checks
- ❌ Modifying `function-registry.json` - Detected by compliance checks
- ❌ Deleting compliance scripts - Detected by compliance checks

## How It Works

### On Local Commits
1. Developer runs `git commit`
2. Pre-commit hook runs automatically
3. Hook checks for bypass flags and environment variables
4. Hook runs compliance scripts
5. If violations found → commit blocked
6. If pass → commit allowed

### On Push/PR
1. Code is pushed to GitHub
2. GitHub Actions workflow triggers automatically
3. Workflow runs compliance checks on changed files
4. Workflow checks commit messages for bypass attempts
5. If violations found → push/merge blocked
6. If pass → push/merge allowed

## Bypass Attempt Detection

The system detects bypass attempts through:

1. **Command Flag Detection**: Checks for `--no-verify`, `--force`, etc.
2. **Environment Variable Detection**: Checks for `SKIP_VERIFY`, `GIT_HOOKS_BYPASS`
3. **Commit Message Analysis**: Scans for bypass keywords
4. **File Change Detection**: Monitors compliance-related files
5. **Registry Violations**: Checks function-registry.json for protected files

## What Happens When Bypass is Attempted

### Client-Side (Pre-Commit Hook)
```
❌ ERROR: Compliance checks cannot be bypassed
❌ Bypass flags detected in command
❌ All commits must pass compliance checks
```

### Server-Side (GitHub Actions)
- Workflow fails with error
- PR cannot be merged
- Push to protected branches is rejected
- Detailed violation report is generated

## Branch Protection

To fully protect your main branches, configure GitHub branch protection:

1. Go to: Settings → Branches → Branch protection rules
2. Add rule for `main` and `development` branches
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require pull request reviews before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include "Compliance Validation" status check
4. Save rules

## Maintenance

### Updating Protection Rules
1. Edit `.github/workflows/compliance-check.yml` for server-side changes
2. Edit `.git/hooks/pre-commit` for client-side changes
3. Edit `.ai-rules-docs/ai-operating-constraints.md` for documentation
4. Test changes on a feature branch before merging

### Testing Protection
```bash
# Test that bypass is blocked
git commit --no-verify -m "test"  # Should fail

# Test normal commit
git commit -m "test"  # Should pass if no violations

# Test bypass message
git commit -m "[skip ci] test"  # Should be blocked by server-side
```

## Troubleshooting

### Hook Not Running
- Check file permissions: `chmod +x .git/hooks/pre-commit`
- Verify hook exists: `ls -la .git/hooks/pre-commit`
- Check git config: `git config core.hooksPath` (should be empty)

### GitHub Actions Not Running
- Check workflow file exists: `.github/workflows/compliance-check.yml`
- Check branch protection rules are configured
- Verify workflow is enabled in repository settings

### False Positives
- Review compliance check scripts
- Check function-registry.json for outdated entries
- Update rules if legitimate use cases are blocked

