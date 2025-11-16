# AI Compliance System Export

This archive contains all AI compliance documentation, rules, scripts, and configurations used in the project.

## Directory Structure

```
ai-compliance-export/
├── cursor-rules/          # Cursor AI rules (.mdc files)
├── compliance-scripts/    # Node.js compliance checking scripts
├── compliance-docs/       # Documentation and guides
├── compliance-config/     # Configuration JSON files
├── ai-rules-docs/         # Additional AI rules and constraints documentation
└── README.md             # This file
```

## Setup Instructions

### 1. Install Cursor Rules

Copy the `cursor-rules/` directory to `.cursor/rules/` in your project:

```bash
cp -r cursor-rules/ .cursor/rules/
```

### 2. Install Compliance Scripts

Copy the `compliance-scripts/` directory to `tools/compliance/` in your project:

```bash
mkdir -p tools/compliance
cp -r compliance-scripts/* tools/compliance/
```

### 3. Install Documentation

Copy the `compliance-docs/` files to your `docs/` directory or root:

```bash
cp compliance-docs/*.md docs/
# or
cp compliance-docs/*.md .
```

### 4. Install Configuration Files

Copy the `compliance-config/` files to your project root or `tools/compliance/config/`:

```bash
cp compliance-config/*.json .
# or
mkdir -p tools/compliance/config
cp compliance-config/*.json tools/compliance/config/
```

### 5. Install AI Rules Documentation

Copy the `ai-rules-docs/` directory to `.ai-rules-docs/` in your project:

```bash
cp -r ai-rules-docs/ .ai-rules-docs/
```

## Key Files

### Cursor Rules
- `00-critical-rules.mdc` - Critical compliance rules (always applied)
- `01-development-standards.mdc` - Development standards
- `02-code-reuse.mdc` - Code reuse and migration rules
- `compliance-rules.mdc` - Main compliance rules

### Compliance Scripts
- `pre-execution-check.js` - Run before making code changes
- `post-execution-check.js` - Run after making code changes
- `ai-compliance-master.js` - Master compliance checker
- `registry-auto-updater.js` - Function registry updater

### Documentation
- `AI-COMPLIANCE-RULES.md` - Main compliance rules documentation
- `AI-COMPLIANCE-BRANCH-AWARE-COMPLETE.md` - Branch-aware system docs
- `AI-COMPLIANCE-AUTOMATION-COMPLETE.md` - Automation setup docs

## Usage

### Pre-Execution Check
Before making code changes, run:
```bash
node tools/compliance/pre-execution-check.js "your task description"
```

### Post-Execution Check
After making code changes, run:
```bash
node tools/compliance/post-execution-check.js path/to/modified/files
```

### Master Compliance Check
Run the master compliance checker:
```bash
node tools/compliance/ai-compliance-master.js
```

## Notes

- All cursor rules have `alwaysApply: true` in their frontmatter
- The compliance system is branch-aware (main vs feature branches)
- Protected files are defined in `function-registry.json`
- Permission logs are stored in `.ai-compliance-permissions.json`

## Version

Exported: $(date)
Project: just-daily-ops-platform-V2

