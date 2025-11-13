#!/usr/bin/env node

/**
 * Start Cursor chat session for a roadmap item
 * Usage: node scripts/utils/start-cursor-chat.js <roadmap-item-id>
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

async function startCursorChat(roadmapItemId) {
  if (!roadmapItemId) {
    console.error('Usage: node scripts/utils/start-cursor-chat.js <roadmap-item-id>');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const triggerFile = path.join(projectRoot, '.roadmap-context', `.cursor-chat-${roadmapItemId}.json`);

  try {
    // Read trigger file
    const triggerData = JSON.parse(await fs.readFile(triggerFile, 'utf-8'));
    const contextFile = triggerData.contextFile;

    console.log(`📋 Roadmap Item: ${triggerData.title}`);
    console.log(`🌿 Branch: ${triggerData.branchName}`);
    console.log(`📄 Context: ${contextFile}\n`);

    if (process.platform === 'darwin') {
      // Open Cursor with context file
      const applescript = `tell application "Cursor"
  activate
  open POSIX file "${contextFile}"
  delay 0.5
end tell`;

      try {
        await execAsync(`osascript -e '${applescript.replace(/'/g, "\\'")}'`);
        console.log('✅ Cursor opened with context file');
        console.log('\n💡 Next steps:');
        console.log('1. Start a new chat in Cursor');
        console.log(`2. Reference the context file: ${contextFile}`);
        console.log(`3. Mention: "I'm working on ${triggerData.title}"`);
      } catch (error) {
        console.error('❌ Failed to open Cursor:', error.message);
        console.log('\n📝 Manual steps:');
        console.log(`1. Open Cursor`);
        console.log(`2. Open file: ${contextFile}`);
        console.log('3. Start a new chat');
      }
    } else {
      console.log('📝 Manual steps (not on macOS):');
      console.log(`1. Open Cursor`);
      console.log(`2. Open file: ${contextFile}`);
      console.log('3. Start a new chat');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log(`\n💡 Make sure the roadmap item has been moved to "doing" status first.`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const roadmapItemId = process.argv[2];
  startCursorChat(roadmapItemId);
}

module.exports = { startCursorChat };

