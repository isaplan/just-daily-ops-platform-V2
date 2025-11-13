#!/usr/bin/env node

/**
 * Check if 'done' status is available for roadmap_items
 * This script verifies if the migration has been applied
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDoneStatus() {
  console.log('🔍 Checking roadmap_items status constraint...\n');

  try {
    // Try to update an item with 'done' status (we'll use a test that won't actually update)
    // First, let's try to insert a test item with 'done' status
    const { data: existingItems } = await supabase
      .from('roadmap_items')
      .select('id')
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      const testItemId = existingItems[0].id;
      
      // Try to update with 'done' status
      const { error } = await supabase
        .from('roadmap_items')
        .update({ status: 'done' })
        .eq('id', testItemId)
        .select();

      if (error) {
        if (error.message.includes('check constraint') || error.message.includes('violates check constraint')) {
          console.error('❌ Migration NOT applied!');
          console.error(`   Error: ${error.message}`);
          console.error('\n📋 To fix this, apply the migration:');
          console.error('   supabase/migrations/20251104000000_add_done_status_to_roadmap.sql');
          console.error('\n   Or run: supabase db push');
          return false;
        } else {
          console.error(`❌ Unexpected error: ${error.message}`);
          return false;
        }
      } else {
        // Revert the change
        await supabase
          .from('roadmap_items')
          .update({ status: 'inbox' })
          .eq('id', testItemId);
        
        console.log('✅ Migration IS applied!');
        console.log('   "done" status is available for roadmap_items');
        return true;
      }
    } else {
      // No items exist, try to check the constraint by attempting to insert
      const { error: insertError } = await supabase
        .from('roadmap_items')
        .insert({
          title: 'Test Item (will be deleted)',
          department: 'Operations',
          status: 'done',
          display_order: 999999,
        })
        .select();

      if (insertError) {
        if (insertError.message.includes('check constraint') || insertError.message.includes('violates check constraint')) {
          console.error('❌ Migration NOT applied!');
          console.error(`   Error: ${insertError.message}`);
          console.error('\n📋 To fix this, apply the migration:');
          console.error('   supabase/migrations/20251104000000_add_done_status_to_roadmap.sql');
          console.error('\n   Or run: supabase db push');
          return false;
        } else {
          console.error(`❌ Unexpected error: ${insertError.message}`);
          return false;
        }
      } else {
        // Delete the test item
        const { data } = await supabase
          .from('roadmap_items')
          .select('id')
          .eq('title', 'Test Item (will be deleted)')
          .single();
        
        if (data) {
          await supabase
            .from('roadmap_items')
            .delete()
            .eq('id', data.id);
        }
        
        console.log('✅ Migration IS applied!');
        console.log('   "done" status is available for roadmap_items');
        return true;
      }
    }
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return false;
  }
}

// Run the check
checkDoneStatus()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

