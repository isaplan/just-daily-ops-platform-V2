# AI Compliance Monitor - Setup Instructions

This guide will help you install and configure the AI Compliance Monitor extension for VS Code/Cursor.

## 📋 Prerequisites

- Node.js (v18 or higher)
- VS Code or Cursor editor
- Git (for monitoring file changes)
- Existing compliance scripts in `tools/compliance/`

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
cd .vscode-extension/ai-compliance-monitor
npm install
```

### Step 2: Compile TypeScript

```bash
npm run compile
```

### Step 3: Package Extension

```bash
npm run package
```

This creates `ai-compliance-monitor-1.0.0.vsix` file.

### Step 4: Install in VS Code/Cursor

#### Option A: Via Command Palette

1. Open VS Code/Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Install from VSIX"
4. Select the generated `.vsix` file

#### Option B: Via Extensions Panel

1. Open Extensions panel (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Click the `...` menu at the top
3. Select "Install from VSIX..."
4. Navigate to `.vscode-extension/ai-compliance-monitor/`
5. Select `ai-compliance-monitor-1.0.0.vsix`

### Step 5: Reload Window

1. Press `Cmd+Shift+P` or `Ctrl+Shift+P`
2. Type "Reload Window"
3. Press Enter

### Step 6: Verify Installation

1. Look for the status bar item in bottom-left: `✅ AI Compliance`
2. Open Output panel: `View → Output`
3. Select "AI Compliance Monitor" from dropdown
4. You should see activation message

## ⚙️ Configuration

### Workspace Settings

Create or update `.vscode/settings.json` in your workspace root:

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

### Compliance Rules Configuration

Ensure `tools/compliance/config/.ai-compliance-rules.json` exists with your rules:

```json
{
  "maxLinesPerChange": 100,
  "maxDeletions": 20,
  "fullReplacementThreshold": 0.8,
  "excludedPaths": ["node_modules", ".git", ".next", "dist", "build"],
  "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".json"],
  "exemptFiles": [
    "function-registry.json",
    "ai-tracking-system.json",
    "progress-log.json",
    "test-results.json"
  ],
  "search": {
    "maxResults": 5,
    "minKeywordLength": 3,
    "useContentSearch": true
  },
  "stopWords": ["the", "and", "or", "but", "for", "with", "this", "that"]
}
```

## 🧪 Testing the Extension

### Test 1: Manual Pre-Check

1. Press `Cmd+Shift+P` or `Ctrl+Shift+P`
2. Type "AI Compliance: Run Pre-Check"
3. Enter a task description (e.g., "Testing pre-check")
4. Check output channel for results

### Test 2: Manual Post-Check

1. Make some changes to a file
2. Save the file
3. Press `Cmd+Shift+P` or `Ctrl+Shift+P`
4. Type "AI Compliance: Run Post-Check"
5. Check output channel for results

### Test 3: Automatic Detection

1. Ask Cursor AI to make a change
2. Watch the status bar change to "🔄 Checking..."
3. After AI finishes, status updates with results
4. Check output channel for detailed report

### Test 4: Status Display

1. Press `Cmd+Shift+P` or `Ctrl+Shift+P`
2. Type "AI Compliance: Show Status"
3. View current compliance status in output

## 🔧 Customization

### Adjust Notification Level

If you're getting too many notifications:

```json
{
  "aiCompliance.notificationLevel": "violations"
}
```

Options:
- `"all"` - Show all notifications (including passes)
- `"warnings"` - Show warnings and violations (default)
- `"violations"` - Show only violations

### Adjust Debounce Time

If post-checks run too early or too late:

```json
{
  "aiCompliance.debounceMs": 3000
}
```

- Lower value (e.g., 1000) = faster detection, may trigger while AI still working
- Higher value (e.g., 5000) = slower detection, ensures AI is done

### Disable Auto-Checks

If you prefer manual control:

```json
{
  "aiCompliance.autoRunPreCheck": false,
  "aiCompliance.autoRunPostCheck": false
}
```

Then use commands to run checks manually.

### Exclude File Types

Modify `tools/compliance/config/.ai-compliance-rules.json`:

```json
{
  "fileExtensions": [".ts", ".tsx"]
}
```

This will only monitor TypeScript files.

## 🐛 Troubleshooting

### Extension Not Activating

**Problem**: No status bar item appears

**Solutions**:
1. Check VS Code/Cursor version (requires v1.85.0+)
2. Reload window: `Cmd+Shift+P` → "Reload Window"
3. Check extension is enabled: Extensions panel → Search "AI Compliance"
4. Review Developer Console: `Help → Toggle Developer Tools`

### Compliance Scripts Not Found

**Problem**: Error message about missing scripts

**Solutions**:
1. Verify scripts exist:
   - `tools/compliance/pre-execution-check.js`
   - `tools/compliance/post-execution-check.js`
2. Make scripts executable:
   ```bash
   chmod +x tools/compliance/pre-execution-check.js
   chmod +x tools/compliance/post-execution-check.js
   ```
3. Test scripts manually:
   ```bash
   node tools/compliance/pre-execution-check.js "Test task"
   node tools/compliance/post-execution-check.js
   ```

### No AI Activity Detected

**Problem**: Extension doesn't detect when AI is working

**Solutions**:
1. Ensure you're editing files in the workspace (not external files)
2. Check file extensions are monitored (see Configuration)
3. Reduce debounce time to 1000ms
4. Try manual commands instead of auto-detection

### Node.js Not Found

**Problem**: Error about Node.js not being available

**Solutions**:
1. Install Node.js from https://nodejs.org
2. Restart VS Code/Cursor after installing
3. Verify Node is in PATH:
   ```bash
   node --version
   ```

## 🔄 Development Mode

For testing and development:

### 1. Open Extension in VS Code

```bash
cd .vscode-extension/ai-compliance-monitor
code .
```

### 2. Press F5

This launches Extension Development Host with the extension loaded.

### 3. Make Changes

Edit TypeScript files in `src/`

### 4. Reload Extension

In Extension Development Host:
- Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux)
- Or: `Cmd+Shift+P` → "Developer: Reload Window"

### 5. View Debug Console

In original VS Code window:
- `View → Debug Console`
- See extension logs and errors

## 📦 Updating the Extension

### After Making Changes

1. Recompile:
   ```bash
   npm run compile
   ```

2. Repackage:
   ```bash
   npm run package
   ```

3. Uninstall old version:
   - Extensions panel → AI Compliance Monitor → Uninstall

4. Install new version:
   - Extensions panel → "..." → "Install from VSIX..."

5. Reload window

## 🎯 Best Practices

### 1. Start with Warnings Only

```json
{
  "aiCompliance.notificationLevel": "warnings"
}
```

This reduces notification fatigue while still alerting you to issues.

### 2. Review Output Channel Regularly

Keep the output channel visible while working with AI:
- `View → Output`
- Select "AI Compliance Monitor"

### 3. Use Manual Commands for Review

After a large AI session, manually run:
- `AI Compliance: Run Post-Check`

### 4. Customize Rules Gradually

Start with default rules, then adjust based on your workflow.

### 5. Keep Extension Updated

Periodically rebuild and reinstall to get latest improvements.

## 📚 Next Steps

1. ✅ Read `@ai-compliance-rules.md` for rule details
2. ✅ Review `README.md` for feature documentation
3. ✅ Test with small AI tasks first
4. ✅ Customize rules to fit your workflow
5. ✅ Share feedback and suggestions

## 💡 Tips

- **Status Bar**: Click it to view detailed status
- **Output Channel**: Leave it open for real-time monitoring
- **Manual Commands**: Use when auto-detection isn't working
- **Disable Temporarily**: Use `AI Compliance: Disable Monitoring` when needed
- **Check Logs**: View in Output → AI Compliance Monitor

## 🎉 Success!

If you see `✅ AI Compliance` in the status bar and checks are running, you're all set! The extension will now monitor AI agent activity and enforce your compliance rules.

---

**Need Help?** Check the README.md or review existing documentation in `docs/compliance-extension.md`







