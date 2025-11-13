#!/usr/bin/env node

/**
 * Check roadmap items in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoadmapItems() {
  console.log('🔍 Checking roadmap items...\n');

  // Get all items
  const { data: allItems, error: allError } = await supabase
    .from('roadmap_items')
    .select('*')
    .order('display_order', { ascending: true });

  if (allError) {
    console.error('❌ Error fetching items:', allError);
    return;
  }

  console.log(`📋 Total roadmap items: ${allItems.length}\n`);

  // Search for automation-related items
  const automationItems = allItems.filter(item => 
    item.title?.toLowerCase().includes('automate') ||
    item.description?.toLowerCase().includes('automate') ||
    item.user_story?.toLowerCase().includes('automate')
  );

  if (automationItems.length > 0) {
    console.log('🤖 Automation-related roadmap items:\n');
    automationItems.forEach(item => {
      console.log(`  • ${item.title}`);
      console.log(`    Status: ${item.status || 'inbox'}`);
      console.log(`    Have State: ${item.have_state || 'Want'}`);
      console.log(`    Description: ${item.description?.substring(0, 100) || 'N/A'}...`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No automation-related items found in roadmap\n');
  }

  // Show items with "doing" status
  const doingItems = allItems.filter(item => item.status === 'doing');
  if (doingItems.length > 0) {
    console.log(`🚀 Items currently "doing" (${doingItems.length}):\n`);
    doingItems.forEach(item => {
      console.log(`  • ${item.title}`);
      console.log(`    Have State: ${item.have_state || 'Want'}`);
      console.log('');
    });
  }
}

checkRoadmapItems().catch(console.error);

