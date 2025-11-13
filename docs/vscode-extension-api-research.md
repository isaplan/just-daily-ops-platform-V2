# VS Code Extension API Research

## Summary

Research completed for implementing compliance extension with VS Code Extension API.

## Key Findings

### 1. File Save Hook (`onWillSaveTextDocument`)

**API:** `vscode.workspace.onWillSaveTextDocument(event)`

- **Purpose:** Triggers before a document is saved
- **Blocking:** Can prevent save using `event.waitUntil(Promise.reject())`
- **Use Case:** Run pre-execution checks before save
- **Example:**
  ```typescript
  vscode.workspace.onWillSaveTextDocument(event => {
    // Run compliance check
    if (violationsFound) {
      event.waitUntil(Promise.reject('Compliance violations detected'));
    }
  });
  ```

### 2. File Change Detection (`onDidChangeTextDocument`)

**API:** `vscode.workspace.onDidChangeTextDocument(event)`

- **Purpose:** Triggers after document content changes
- **Use Case:** Run post-execution checks after changes
- **Note:** Requires debouncing to avoid performance issues
- **Example:**
  ```typescript
  let debounceTimer: NodeJS.Timeout;
  vscode.workspace.onDidChangeTextDocument(event => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Run post-execution check
    }, 500);
  });
  ```

### 3. Status Bar Indicator

**API:** `vscode.window.createStatusBarItem(alignment, priority)`

- **Purpose:** Display compliance status in status bar
- **States:** Compliant, Warnings, Violations, Disabled
- **Example:**
  ```typescript
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 
    100
  );
  statusBar.text = '✅ Compliant';
  statusBar.show();
  ```

### 4. Output Channel

**API:** `vscode.window.createOutputChannel(name)`

- **Purpose:** Display detailed compliance feedback
- **Use Case:** Show violation details, suggested fixes
- **Example:**
  ```typescript
  const outputChannel = vscode.window.createOutputChannel('Compliance Checks');
  outputChannel.appendLine('Violations detected:');
  outputChannel.show();
  ```

### 5. Notifications

**APIs:**
- `vscode.window.showErrorMessage(message, ...items)` - Error notifications
- `vscode.window.showWarningMessage(message, ...items)` - Warning notifications
- `vscode.window.showInformationMessage(message, ...items)` - Info notifications

- **Use Case:** Show violations with action buttons
- **Example:**
  ```typescript
  vscode.window.showErrorMessage(
    'Compliance violations detected',
    'View Details',
    'Revert Changes'
  ).then(selection => {
    if (selection === 'View Details') {
      outputChannel.show();
    }
  });
  ```

## Cursor Compatibility

**Finding:** Cursor uses VS Code Extension API. Extensions developed for VS Code should work in Cursor without modification.

**Verification:** Cursor's extension marketplace is compatible with VS Code extensions.

## Extension Structure

```
.vscode-extension/
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── extension.ts      # Main entry point
│   ├── compliance-hooks.ts    # File save/change hooks
│   ├── compliance-ui.ts       # Status bar, output channel
│   └── compliance-runner.ts   # Execute Node.js scripts
└── README.md             # Extension documentation
```

## Dependencies

- `@types/vscode` - VS Code Extension API type definitions
- TypeScript - For extension development
- Node.js child_process - To execute existing compliance scripts

## Implementation Notes

1. **Blocking Saves:** Use `event.waitUntil(Promise.reject())` to prevent save
2. **Debouncing:** Implement 500ms debounce for change detection
3. **Error Handling:** Handle script execution failures gracefully
4. **Workspace Detection:** Find project root where `.ai-compliance-functions/` exists
5. **Configuration:** Read VS Code settings for extension behavior

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension API Documentation](https://code.visualstudio.com/api/references/vscode-api)

