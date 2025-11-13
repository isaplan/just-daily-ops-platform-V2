# AI Compliance Monitor for VS Code

A lightweight VS Code extension that monitors Cursor AI agent activity and enforces compliance rules automatically. This extension runs pre-execution and post-execution checks to ensure the AI agent follows your coding standards and project rules.

## 🚀 Features

- **🤖 AI Activity Detection**: Automatically detects when Cursor AI agent starts and finishes working
- **✅ Pre-Execution Checks**: Runs before code changes to prevent violations
- **📊 Post-Execution Checks**: Runs after code changes to report violations
- **💬 Non-Blocking Notifications**: Shows status messages without blocking workflow (light version)
- **📈 Real-Time Status Bar**: Shows compliance status at a glance
- **📝 Detailed Reports**: Comprehensive violation reports with severity levels
- **🔧 Configurable**: Customize monitoring behavior and notification levels

## 📦 Installation

### Option 1: Install from VSIX (Recommended)

1. Build the extension:
```bash
cd .vscode-extension/ai-compliance-monitor
npm install
npm run compile
npm run package
```

2. Install the generated `.vsix` file in VS Code:
   - Open VS Code
   - Go to Extensions (Cmd+Shift+X)
   - Click the `...` menu → "Install from VSIX..."
   - Select `ai-compliance-monitor-1.0.0.vsix`

### Option 2: Development Mode

1. Open the extension folder in VS Code:
```bash
cd .vscode-extension/ai-compliance-monitor
code .
```

2. Press `F5` to launch Extension Development Host

3. The extension will be active in the new VS Code window

## 🎯 How It Works

### Automatic Monitoring

The extension monitors your workspace for file changes and detects AI agent activity based on:
- Rapid file changes (< 500ms between changes)
- Multiple files being modified
- Document edits and saves

### Pre-Check Flow

1. **AI Starts Working** → Extension detects activity
2. **Pre-Check Runs** → Searches for existing code, checks registry protection, validates change size
3. **Status Displayed** → Shows results in status bar and output channel
4. **Notification** → Shows warning/error if violations found

### Post-Check Flow

1. **AI Finishes Working** → No changes detected for 2 seconds (configurable)
2. **Post-Check Runs** → Analyzes actual changes made
3. **Violations Reported** → Grouped by severity (CRITICAL, HIGH, MEDIUM, LOW)
4. **Fix Suggestions** → Provides actionable suggestions to resolve violations

## ⚙️ Configuration

Access settings via `Preferences → Settings → AI Compliance Monitor` or `.vscode/settings.json`:

```json
{
  "aiCompliance.enabled": true,
  "aiCompliance.autoRunPreCheck": true,
  "aiCompliance.autoRunPostCheck": true,
  "aiCompliance.showNotifications": true,
  "aiCompliance.notificationLevel": "warnings",
  "aiCompliance.debounceMs": 2000
}
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable monitoring |
| `autoRunPreCheck` | boolean | `true` | Auto-run pre-check when AI starts |
| `autoRunPostCheck` | boolean | `true` | Auto-run post-check when AI finishes |
| `showNotifications` | boolean | `true` | Show popup notifications |
| `notificationLevel` | string | `"warnings"` | Notification level: `"all"`, `"warnings"`, or `"violations"` |
| `debounceMs` | number | `2000` | Time in ms to wait before running post-check |

## 📋 Commands

Access via Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`):

- `AI Compliance: Run Pre-Check` - Manually run pre-check
- `AI Compliance: Run Post-Check` - Manually run post-check
- `AI Compliance: Show Status` - Show current compliance status
- `AI Compliance: Enable Monitoring` - Enable the extension
- `AI Compliance: Disable Monitoring` - Disable the extension

## 📊 Status Bar Indicators

| Icon | Status | Description |
|------|--------|-------------|
| ✅ Compliant | `PASS` | All checks passed |
| ⚠️ Warnings | `WARN` | Warnings detected (non-blocking) |
| ❌ Violations | `VIOLATIONS` | Violations detected |
| 🛑 BLOCKED | `BLOCKED` | Critical violation (blocking) |
| 🔄 Checking... | `CHECKING` | Running compliance checks |
| ⏸️ Disabled | `DISABLED` | Monitoring disabled |

Click the status bar to view detailed results.

## 🚨 Violation Severities

### 🔴 CRITICAL
- **Registry Violations**: Modified a protected/completed file
- **Action**: REVERT CHANGES IMMEDIATELY

### 🟠 HIGH
- **Size Violations**: Exceeded 100-line limit per file
- **Full File Replacement**: Replaced entire file instead of incremental changes
- **File Deletion**: Deleted a file containing working functionality
- **Action**: Break down into smaller changes or use incremental approach

### 🟡 MEDIUM
- **Excessive Deletions**: Removed >20 lines from a file
- **Deleted Imports**: Removed >5 import statements
- **Removed Exports**: Removed >2 export statements
- **Action**: Verify deleted code is not needed

### 🔵 LOW
- **Whitespace Changes**: >30 whitespace-only changes
- **Action**: Use formatter to avoid unnecessary changes

## 📖 Compliance Rules

The extension enforces rules defined in `@ai-compliance-rules.md`:

1. **Incremental Changes Only**: Max 100 lines per file
2. **Code Preservation**: No deletion of working functionality
3. **Registry Protection**: Protected files are strictly off-limits
4. **Reuse Existing Code**: Search before creating new code
5. **No Full Replacements**: Use targeted modifications

See `@ai-compliance-rules.md` for complete rule documentation.

## 🔧 Integration

### Existing Compliance Scripts

This extension integrates with your existing compliance infrastructure:

- `tools/compliance/pre-execution-check.js` - Pre-check script
- `tools/compliance/post-execution-check.js` - Post-check script
- `function-registry.json` - Protected files registry
- `tools/compliance/config/.ai-compliance-rules.json` - Rule configuration

### Customizing Rules

Modify compliance rules in `tools/compliance/config/.ai-compliance-rules.json`:

```json
{
  "maxLinesPerChange": 100,
  "maxDeletions": 20,
  "fullReplacementThreshold": 0.8,
  "excludedPaths": ["node_modules", ".git", ".next"],
  "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".json"]
}
```

## 🎨 Output Channel

View detailed compliance reports in the "AI Compliance Monitor" output channel:

1. Go to `View → Output`
2. Select "AI Compliance Monitor" from dropdown
3. View real-time compliance checks and violations

The output includes:
- Pre-check and post-check results
- Existing code found
- Violations grouped by severity
- Modified files list
- Fix suggestions
- Required actions

## 🐛 Troubleshooting

### Extension Not Detecting AI Activity

- Ensure files are in workspace (not external files)
- Check that file types are monitored (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`)
- Verify `aiCompliance.enabled` is `true`
- Check excluded paths in settings

### Compliance Scripts Not Running

- Verify scripts exist at `tools/compliance/pre-execution-check.js` and `post-execution-check.js`
- Check Node.js is installed and accessible
- Review output channel for error messages
- Ensure workspace root is correct

### Too Many/Too Few Notifications

- Adjust `aiCompliance.notificationLevel`:
  - `"all"` - Show all notifications (including passes)
  - `"warnings"` - Show warnings and violations only
  - `"violations"` - Show violations only
- Set `aiCompliance.showNotifications` to `false` to disable all notifications

### AI Activity Not Detected

- Increase `aiCompliance.debounceMs` if checks run too early
- Decrease if checks run too late after AI finishes

## 🔄 Development

### Building from Source

```bash
cd .vscode-extension/ai-compliance-monitor
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

This creates `ai-compliance-monitor-1.0.0.vsix` in the extension directory.

## 📄 License

MIT License - See project root for details

## 🤝 Contributing

This extension is part of the Just Daily Ops Platform project. Contributions are welcome!

## 📚 Related Documentation

- `@ai-compliance-rules.md` - Compliance rules documentation
- `docs/compliance-extension.md` - Technical documentation
- `tools/compliance/` - Compliance scripts and configuration

## 💡 Tips

1. **Review Pre-Checks**: Always review pre-check warnings before proceeding
2. **Monitor Status Bar**: Keep an eye on the status bar while AI is working
3. **Check Output Channel**: View detailed reports for understanding violations
4. **Customize Rules**: Adjust rules in `.ai-compliance-rules.json` to fit your workflow
5. **Use Manual Commands**: Run checks manually when needed via Command Palette

## 🎉 Benefits

- ✅ Prevents accidental deletion of working code
- ✅ Enforces consistent coding standards
- ✅ Encourages code reuse
- ✅ Maintains clean git history
- ✅ Reduces bugs from large refactors
- ✅ Keeps AI agent focused on incremental changes
- ✅ Non-blocking workflow (light version)

---

**Remember**: This is a **light version** that provides status messages and notifications without blocking your workflow. It helps you stay aware of compliance issues so you can make informed decisions about how to proceed.







