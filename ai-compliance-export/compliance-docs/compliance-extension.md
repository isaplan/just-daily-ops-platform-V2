# Compliance Extension Documentation

## Overview

The Compliance Extension is a VS Code/Cursor extension that automatically enforces compliance rules by intercepting file saves and running pre/post-execution checks.

## Architecture

### Components

1. **ComplianceRunner** (`compliance-runner.ts`)
   - Executes `pre-execution-check.js` and `post-execution-check.js` scripts
   - Parses JSON output from scripts
   - Handles workspace root detection

2. **ComplianceUI** (`compliance-ui.ts`)
   - Status bar indicator showing compliance status
   - Output channel for detailed feedback
   - Notification system for violations

3. **ComplianceHooks** (`compliance-hooks.ts`)
   - `onWillSaveTextDocument` hook for pre-save checks
   - `onDidChangeTextDocument` hook for post-change checks (debounced)
   - Configuration management

4. **Extension Entry** (`extension.ts`)
   - Activates extension
   - Registers commands and hooks
   - Initializes components

## Integration with Existing Scripts

The extension integrates seamlessly with existing compliance scripts:

- **Pre-execution Check**: Runs `pre-execution-check.js` before file saves
- **Post-execution Check**: Runs `post-execution-check.js` after file changes

Both scripts are called via Node.js `child_process.exec()` and their JSON output is parsed.

## Workflow

### Pre-Save Workflow

1. User attempts to save file
2. Extension intercepts save via `onWillSaveTextDocument`
3. Runs `pre-execution-check.js` with task description and file path
4. Parses JSON output
5. If `status = BLOCK`: Cancel save, show error
6. If `status = WARN`: Show warning, allow save (unless strict mode)
7. If `status = PASS`: Allow save

### Post-Change Workflow

1. User makes changes to file
2. Extension detects change via `onDidChangeTextDocument`
3. Debounces changes (500ms delay)
4. Runs `post-execution-check.js` for modified file
5. Shows violations in output channel
6. Updates status bar

## Configuration

Extension settings are stored in VS Code workspace/user settings:

```json
{
  "compliance.enabled": true,
  "compliance.strictMode": false,
  "compliance.checkOnSave": true,
  "compliance.checkOnChange": true
}
```

Settings are loaded on extension activation and reloaded when configuration changes.

## Status Bar States

- **✅ Compliant**: All checks passed
- **⚠️ Warnings**: Warnings detected (non-blocking)
- **❌ Violations**: Violations detected (blocking)
- **⏸️ Disabled**: Extension disabled
- **🔄 Checking...**: Compliance check in progress

## Output Channel

The "Compliance Checks" output channel displays:
- Timestamp of each check
- Check type (pre-execution/post-execution)
- Status and message
- Violations grouped by severity (CRITICAL, HIGH, MEDIUM, LOW)
- Existing code found (pre-check only)
- Required actions

## Error Handling

- **Script Not Found**: Shows error, allows save (doesn't block)
- **Script Execution Failure**: Logs error, shows notification, allows save
- **Parse Error**: Shows error message, allows save
- **Timeout**: Scripts have 10-second timeout to prevent hangs

## Performance

- **Debouncing**: Post-change checks debounced 500ms to avoid excessive checks
- **Timeout**: Script execution limited to 10 seconds
- **File Filtering**: Only checks relevant file types (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`)

## Extension Development

### Building

```bash
cd .vscode-extension
npm install
npm run compile
```

### Testing

1. Press `F5` in VS Code to launch extension development host
2. Open workspace with `.ai-compliance-functions/` directory
3. Test file save blocking
4. Test post-change detection
5. Verify status bar updates
6. Check output channel for detailed feedback

## Future Improvements

1. **Caching**: Cache check results to avoid re-running checks on unchanged files
2. **Parallel Execution**: Run checks for multiple files in parallel
3. **Custom Rules**: Allow custom compliance rules via configuration
4. **Batch Checks**: Check all modified files at once
5. **Progress Indicator**: Show progress for long-running checks

## Related Files

- `.ai-compliance-functions/pre-execution-check.js` - Pre-execution check script
- `.ai-compliance-functions/post-execution-check.js` - Post-execution check script
- `.ai-compliance-rules.json` - Compliance rules configuration
- `docs/vscode-extension-api-research.md` - VS Code Extension API research

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension API Documentation](https://code.visualstudio.com/api/references/vscode-api)

