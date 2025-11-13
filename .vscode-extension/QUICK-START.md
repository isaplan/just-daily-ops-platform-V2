# AI Compliance Monitor - Quick Start Guide

## 🎯 What This Does

The AI Compliance Monitor is a **lightweight VS Code extension** that:
- **Detects** when Cursor AI agent starts/finishes working
- **Runs pre-checks** before code changes to prevent violations
- **Runs post-checks** after code changes to report issues
- **Shows messages** about status and violations (non-blocking)
- **Enforces rules** from `@ai-compliance-rules.md`

## ⚡ Quick Install (3 Steps)

### 1. Run Installation Script

```bash
cd .vscode-extension/ai-compliance-monitor
./install.sh
```

### 2. Install in VS Code/Cursor

1. Open VS Code or Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Install from VSIX"
4. Select `ai-compliance-monitor-1.0.0.vsix`

### 3. Reload Window

Press `Cmd+Shift+P` → Type "Reload Window"

## ✅ Verify Installation

Look for `✅ AI Compliance` in the bottom-left status bar.

## 🎮 How to Use

### Automatic Mode (Default)

The extension automatically:
1. Detects when AI agent starts working → Runs **pre-check**
2. Detects when AI agent finishes → Runs **post-check**
3. Shows results in status bar and notifications

### Manual Mode

Run checks manually via Command Palette (`Cmd+Shift+P`):
- `AI Compliance: Run Pre-Check`
- `AI Compliance: Run Post-Check`
- `AI Compliance: Show Status`

## 📊 Status Bar Guide

| Icon | Meaning |
|------|---------|
| ✅ Compliant | All good! |
| ⚠️ Warnings | Review suggested |
| ❌ Violations | Issues detected |
| 🛑 BLOCKED | Critical issue |
| 🔄 Checking... | Running checks |

**Click the status bar** to view detailed results.

## 📝 View Detailed Reports

1. Go to `View → Output`
2. Select "AI Compliance Monitor" from dropdown
3. See real-time compliance checks and violations

## ⚙️ Quick Settings

Add to `.vscode/settings.json`:

```json
{
  "aiCompliance.enabled": true,
  "aiCompliance.notificationLevel": "warnings",
  "aiCompliance.debounceMs": 2000
}
```

## 🎯 What Gets Checked

### Pre-Check (Before AI Works)
- ✅ Searches for existing code that might solve the task
- ✅ Checks if target files are protected
- ✅ Validates planned change size (max 100 lines)

### Post-Check (After AI Finishes)
- ✅ Counts actual lines changed
- ✅ Detects excessive deletions
- ✅ Identifies full file replacements
- ✅ Reports violations with severity

## 🚨 Violation Severities

- 🔴 **CRITICAL**: Protected file modified → REVERT!
- 🟠 **HIGH**: Size limit exceeded, file replaced → Break down
- 🟡 **MEDIUM**: Too many deletions → Verify needed
- 🔵 **LOW**: Whitespace changes → Use formatter

## 📚 Full Documentation

- `README.md` - Complete feature documentation
- `SETUP-INSTRUCTIONS.md` - Detailed setup guide
- `@ai-compliance-rules.md` - Compliance rules reference

## 💡 Pro Tips

1. **Keep Output Channel visible** while working with AI
2. **Review warnings** before letting AI continue
3. **Click status bar** to see detailed reports
4. **Customize rules** in `tools/compliance/config/.ai-compliance-rules.json`
5. **Adjust debounce time** if checks run too early/late

## 🐛 Troubleshooting

### Extension not working?
1. Check status bar shows `✅ AI Compliance`
2. Open Output → "AI Compliance Monitor"
3. Look for activation message

### Checks not running?
1. Verify scripts exist: `tools/compliance/pre-execution-check.js`
2. Test manually: `node tools/compliance/pre-execution-check.js "Test"`
3. Check Node.js is installed: `node --version`

### Too many notifications?
Set notification level to violations only:
```json
{
  "aiCompliance.notificationLevel": "violations"
}
```

## 🎉 That's It!

You're ready to go! The extension will now monitor AI agent activity and help enforce your compliance rules automatically.

**Remember**: This is a **light version** - it shows messages and warnings but **doesn't block** your workflow. You stay in control!

---

**Questions?** Check the full documentation or review `docs/compliance-extension.md`







