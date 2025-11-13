# Roadmap "Done" Status Fix

## Issue
The "done" status option is not working for roadmap items. This is likely because the database migration hasn't been applied.

## Solution

### Step 1: Apply the Migration

The migration file `supabase/migrations/20251104000000_add_done_status_to_roadmap.sql` needs to be applied to your Supabase database.

**Option A: Using Supabase CLI (if available)**
```bash
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251104000000_add_done_status_to_roadmap.sql`
4. Run the SQL

**Option C: Check if migration was applied**
```bash
node scripts/check-roadmap-done-status.js
```

### Step 2: Verify the Fix

After applying the migration:
1. The "Done" option should appear in the status dropdown
2. You should be able to select "Done" for any roadmap item
3. Items with "done" status should appear in a "Done" column in the roadmap view

## What Was Changed

1. **Database Migration**: Added "done" to the status constraint
2. **Frontend Components**:
   - Added "Done" option to status selects in `RoadmapItemCard` and `RoadmapFormSheet`
   - Updated status labels and formatting
   - Updated `is_active` logic (only "doing" items are active)

## Files Modified

- `supabase/migrations/20251104000000_add_done_status_to_roadmap.sql` (new)
- `src/app/(dashboard)/roadmap/page.tsx`
- `src/components/roadmap/RoadmapItemCard.tsx`
- `src/components/roadmap/RoadmapFormSheet.tsx`

## Testing

After applying the migration, test:
1. Select "Done" from the status dropdown on a roadmap item
2. Verify the item moves to the "Done" column
3. Verify `is_active` is set to `false` for done items
4. Verify you can change a done item back to another status

