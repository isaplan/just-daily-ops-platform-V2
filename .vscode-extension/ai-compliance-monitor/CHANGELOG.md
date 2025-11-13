# Changelog

All notable changes to the AI Compliance Monitor extension will be documented in this file.

## [1.1.0] - 2025-11-08

### ✨ Major Enhancements

#### Session Tracking System
- **Session IDs**: Each AI task now gets a unique 6-character session ID (e.g., #7K9M2P)
- **Timestamps**: All messages now include timestamps (HH:MM:SS format)
- **Duration Tracking**: Shows how long each AI task took to complete
- **Session History**: Keeps track of last 50 AI sessions with full details
- **Statistics Dashboard**: View today's violations, sessions, and trends

#### Enhanced Output Display
- **Session Headers**: Beautiful boxed headers showing session ID and metadata
- **Duration Display**: Shows task duration and start/end times
- **Session Context**: All violations now linked to specific session IDs
- **Emoji Indicators**: Clear visual status indicators (🎯, 🕐, ⏱️, etc.)

#### New Commands
- `AI Compliance: Show Session History` - View last 10 sessions with statistics
- Enhanced `Show Status` command with session info and statistics

#### Improved UI
- Session ID displayed in all check outputs
- Timeline format with timestamps for all events
- Statistics summary showing today's violations and session counts
- Better correlation between violations and specific AI tasks

### 🐛 Fixes
- Fixed state initialization to include sessionHistory array
- Improved timestamp formatting for better readability

### 📝 Documentation
- Updated README with session tracking features
- Added examples of enhanced output format

## [1.0.0] - 2025-11-07

### ✨ Initial Release

#### Features
- **AI Activity Detection**: Automatically detects when Cursor AI agent starts and finishes working
- **Pre-Execution Checks**: Runs compliance checks before AI makes changes
- **Post-Execution Checks**: Runs compliance checks after AI completes tasks
- **Status Bar Integration**: Real-time compliance status display
- **Notifications**: Configurable popup notifications for violations
- **Output Channel**: Detailed compliance reports with violation breakdown
- **File System Watcher**: Monitors document changes, saves, and file system events
- **Debouncing**: Configurable delay before triggering post-checks (default 2000ms)

#### Commands
- `AI Compliance: Run Pre-Check` - Manual pre-check execution
- `AI Compliance: Run Post-Check` - Manual post-check execution
- `AI Compliance: Show Status` - Display current compliance status
- `AI Compliance: Enable Monitoring` - Enable the extension
- `AI Compliance: Disable Monitoring` - Disable the extension

#### Configuration
- `aiCompliance.enabled` - Enable/disable monitoring
- `aiCompliance.autoRunPreCheck` - Auto-run pre-checks
- `aiCompliance.autoRunPostCheck` - Auto-run post-checks
- `aiCompliance.showNotifications` - Show/hide notifications
- `aiCompliance.notificationLevel` - Notification level (all/warnings/violations)
- `aiCompliance.debounceMs` - Debounce time in milliseconds

#### Integration
- Integrates with existing `pre-execution-check.js` script
- Integrates with existing `post-execution-check.js` script
- Reads from `function-registry.json` for protected files
- Uses rules from `tools/compliance/config/.ai-compliance-rules.json`

#### User Interface
- Status bar states: Idle, Checking, Pass, Warn, Violations, Blocked, Disabled
- Color-coded violation severities: CRITICAL 🔴, HIGH 🟠, MEDIUM 🟡, LOW 🔵
- Detailed output channel with formatted reports
- Configurable notification levels

#### Documentation
- Complete README.md with features and usage
- SETUP-INSTRUCTIONS.md for installation guide
- QUICK-START.md for quick reference
- @ai-compliance-rules.md for compliance rules
- AI-COMPLIANCE-EXTENSION-SUMMARY.md for technical overview

#### Design Decisions
- **Non-blocking**: Light version that shows messages without blocking workflow
- **Debounced**: Waits for activity to settle before running post-checks
- **Reuses existing scripts**: Leverages proven compliance logic
- **Configurable**: Flexible settings for different workflows
- **Cursor-optimized**: Designed for Cursor AI agent workflow

### 🐛 Known Issues
- None at release

### 🔮 Future Enhancements (Planned)
- Caching of check results
- Parallel file checking
- Custom per-project rules
- Visual compliance dashboard
- Compliance history tracking

---

## Version Format

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## Categories

- ✨ **Features**: New features
- 🐛 **Bug Fixes**: Bug fixes
- 📝 **Documentation**: Documentation changes
- 🔧 **Configuration**: Configuration changes
- ⚡ **Performance**: Performance improvements
- 🔒 **Security**: Security improvements
- ♻️ **Refactoring**: Code refactoring
- 🎨 **UI/UX**: UI/UX improvements

