# Roadmap Automation Setup

## Overview
When a roadmap item status changes to "doing", the system automatically:
1. Creates a git branch named `roadmap/[item-title-slug]`
2. Creates a context file in `.roadmap-context/` for chat/agent sessions
3. Updates the roadmap item with the branch name
4. **Creates a trigger file for Cursor chat session**
5. **Attempts to automatically open Cursor with the context file (macOS only)**

## Initial Setup

### 1. Run Database Migration

The migration adds a `branch_name` column to the `roadmap_items` table.

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase/migrations/20251103020000_add_roadmap_branch_name.sql`:

```sql
-- Add branch_name column to roadmap_items
ALTER TABLE roadmap_items 
ADD COLUMN IF NOT EXISTS branch_name TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_items_branch_name 
ON roadmap_items(branch_name) 
WHERE branch_name IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN roadmap_items.branch_name IS 'Git branch name created when roadmap item status changes to "doing"';
```

**Option B: Via Supabase CLI**
```bash
npx supabase db push
```

### 2. Verify Setup

Check that the column exists:
```bash
node scripts/check-roadmap-items.js
```

## How It Works

1. **User Action**: User changes roadmap item status to "doing" in the UI
2. **Frontend**: Updates status in database and calls `/api/roadmap/automate`
3. **API Route**: 
   - Creates git branch: `roadmap/[title-slug]`
   - Creates context file: `.roadmap-context/[item-id]-[timestamp].md`
   - Creates trigger file: `.roadmap-context/.cursor-chat-[item-id].json`
   - Updates roadmap item with branch name (if column exists)
   - **Attempts to open Cursor with context file (macOS only)**
4. **User Feedback**: Toast notification shows success/failure
5. **Cursor Auto-Open**: On macOS, Cursor automatically opens with the context file ready for chat

## Testing

1. Go to roadmap page
2. Change a roadmap item status to "doing"
3. Check:
   - New git branch created: `git branch | grep roadmap`
   - Context file created: `ls -la .roadmap-context/`
   - Toast notification appears

## Troubleshooting

### Branch Not Created
- Check if git is available in the server environment
- Verify `process.cwd()` is the project root
- Check server logs for git errors

### Context File Not Created
- Check server logs for file system errors
- Verify `.roadmap-context/` directory permissions

### Database Update Fails
- Ensure migration has been run
- Check RLS policies allow updates
- The system continues even if database update fails (branch and context file are still created)

## Starting Cursor Chat Session

### Automatic (macOS)
When you move a roadmap item to "doing", Cursor should automatically open with the context file. If it doesn't:

### Manual Start
Use the helper script:
```bash
node scripts/utils/start-cursor-chat.js <roadmap-item-id>
```

Or manually:
1. Open Cursor
2. Open the context file from `.roadmap-context/[item-id]-[timestamp].md`
3. Start a new chat and reference the roadmap item

### Using Trigger File
The trigger file `.roadmap-context/.cursor-chat-[item-id].json` contains all the information needed:
- Roadmap item details
- Branch name
- Context file path
- Instructions for starting chat

## Files Modified

- `src/app/api/roadmap/automate/route.ts` - API endpoint with chat session trigger
- `src/components/roadmap/RoadmapItemCard.tsx` - Frontend integration
- `supabase/migrations/20251103020000_add_roadmap_branch_name.sql` - Database migration
- `scripts/utils/start-cursor-chat.js` - Helper script for manual chat start
- `.gitignore` - Added `.roadmap-context/` to ignore

