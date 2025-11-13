import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  user_story: string | null;
  expected_results: string | null;
  department: string;
  category: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { roadmapItemId } = await request.json();

    if (!roadmapItemId) {
      return NextResponse.json(
        { error: 'roadmapItemId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch roadmap item details
    const { data: item, error: fetchError } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('id', roadmapItemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: 'Roadmap item not found' },
        { status: 404 }
      );
    }

    // 1. Create git branch
    const branchName = createBranchName(item.title);
    let branchCreated = false;
    try {
      await createGitBranch(branchName);
      branchCreated = true;
    } catch (error) {
      console.error('Git branch creation error:', error);
      // Continue even if branch creation fails
    }

    // 2. Update roadmap item with branch name (if column exists)
    if (branchCreated) {
      const { error: updateError } = await supabase
        .from('roadmap_items')
        .update({ branch_name: branchName })
        .eq('id', roadmapItemId);
      
      if (updateError) {
        console.warn('Failed to update branch_name (column may not exist):', updateError.message);
        // Continue anyway - branch and context file are created
      }
    }

    // 3. Create context file for chat/agent
    const contextFilePath = await createChatContextFile(item, branchName);

    // 4. Create trigger file for Cursor chat session
    const chatTriggerFile = await createChatTriggerFile(item, branchName, contextFilePath);

    // 5. Try to start Cursor chat session (if on macOS)
    let chatStarted = false;
    if (process.platform === 'darwin') {
      try {
        await startCursorChatSession(contextFilePath, item.title);
        chatStarted = true;
      } catch (error) {
        console.warn('Failed to start Cursor chat session:', error);
        // Continue anyway - files are created
      }
    }

    return NextResponse.json({
      success: true,
      branchName: branchCreated ? branchName : null,
      contextFilePath,
      chatTriggerFile,
      chatStarted,
      message: branchCreated 
        ? 'Branch created, chat context ready' + (chatStarted ? ', Cursor chat opened' : '')
        : 'Chat context file generated (branch creation skipped)',
    });
  } catch (error) {
    console.error('Roadmap automation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to automate roadmap item';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Create a git branch name from roadmap item title
 */
function createBranchName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Limit length
  return `roadmap/${slug}`;
}

/**
 * Create git branch using git command
 */
async function createGitBranch(branchName: string): Promise<void> {
  try {
    // Get the workspace path from environment or use current directory
    const workspacePath = process.env.GIT_WORKSPACE_PATH || process.cwd();
    
    // Check if branch already exists
    const { stdout: branches } = await execAsync(
      `git branch --list ${branchName}`,
      { cwd: workspacePath }
    );
    
    if (branches.trim()) {
      console.log(`Branch ${branchName} already exists`);
      // Checkout existing branch instead
      await execAsync(`git checkout ${branchName}`, { cwd: workspacePath });
      return;
    }

    // Get current branch name
    const { stdout: currentBranch } = await execAsync(
      'git rev-parse --abbrev-ref HEAD',
      { cwd: workspacePath }
    );
    const currentBranchName = currentBranch.trim();

    // Create and checkout new branch
    await execAsync(`git checkout -b ${branchName}`, { cwd: workspacePath });
    console.log(`Created and checked out branch: ${branchName} from ${currentBranchName}`);
  } catch (error) {
    // If git command fails, throw error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create git branch: ${errorMessage}`);
  }
}

/**
 * Create a context file for chat/agent session
 */
async function createChatContextFile(
  item: RoadmapItem,
  branchName: string
): Promise<string> {
  const contextDir = path.join(process.cwd(), '.roadmap-context');
  
  // Ensure directory exists
  await fs.mkdir(contextDir, { recursive: true });

  const contextFile = path.join(
    contextDir,
    `${item.id}-${Date.now()}.md`
  );

  const contextContent = `# Roadmap Item: ${item.title}

**Branch:** \`${branchName}\`
**Status:** Doing
**Created:** ${new Date().toISOString()}

## Description
${item.description || 'No description provided'}

## User Story
${item.user_story || 'No user story provided'}

## Expected Results
${item.expected_results || 'No expected results provided'}

## Department
${item.department}

## Category
${item.category || 'N/A'}

## Context
This roadmap item has been moved to "doing" status. Start working on this feature.

## Next Steps
1. Review the requirements above
2. Plan the implementation
3. Start coding on branch: \`${branchName}\`
4. Use this context file to start a chat/agent session focused on this roadmap item

## Implementation Notes
- Branch should be created and checked out
- All code changes should be made on this branch
- Reference this context when discussing implementation details
`;

  await fs.writeFile(contextFile, contextContent, 'utf-8');
  console.log(`Created context file: ${contextFile}`);

  return contextFile;
}

/**
 * Create a trigger file that Cursor can detect to start a chat session
 */
async function createChatTriggerFile(
  item: RoadmapItem,
  branchName: string,
  contextFilePath: string
): Promise<string> {
  const triggerDir = path.join(process.cwd(), '.roadmap-context');
  const triggerFile = path.join(triggerDir, `.cursor-chat-${item.id}.json`);

  const triggerData = {
    roadmapItemId: item.id,
    title: item.title,
    branchName,
    contextFile: contextFilePath,
    status: 'doing',
    createdAt: new Date().toISOString(),
    action: 'start_chat',
    instructions: `Start a new Cursor chat session focused on implementing: ${item.title}\n\nBranch: ${branchName}\n\nRead the context file: ${contextFilePath}`,
  };

  await fs.writeFile(triggerFile, JSON.stringify(triggerData, null, 2), 'utf-8');
  console.log(`Created chat trigger file: ${triggerFile}`);

  return triggerFile;
}

/**
 * Start Cursor chat session using AppleScript (macOS only)
 */
async function startCursorChatSession(contextFilePath: string, itemTitle: string): Promise<void> {
  if (process.platform !== 'darwin') {
    throw new Error('Chat session auto-start only supported on macOS');
  }

  // Use AppleScript to open Cursor with the context file
  // This opens Cursor and the context file, ready for chat
  const applescript = `tell application "Cursor"
  activate
  open POSIX file "${contextFilePath}"
  delay 0.5
end tell`;

  try {
    // Escape single quotes for AppleScript
    const escapedScript = applescript.replace(/'/g, "\\'");
    await execAsync(`osascript -e '${escapedScript}'`);
    console.log('Cursor opened with context file');
  } catch (error) {
    // If Cursor is not running or AppleScript fails, create a notification file
    const notificationFile = path.join(process.cwd(), '.roadmap-context', '.cursor-chat-ready.md');
    await fs.writeFile(
      notificationFile,
      `# Cursor Chat Ready\n\nRoadmap Item: ${itemTitle}\n\nContext file: ${contextFilePath}\n\n**To start chat:**\n1. Open Cursor\n2. Open the context file: ${contextFilePath}\n3. Start a new chat and reference this file\n\nOr use the trigger file in .roadmap-context/.cursor-chat-*.json`,
      'utf-8'
    );
    throw error;
  }
}

