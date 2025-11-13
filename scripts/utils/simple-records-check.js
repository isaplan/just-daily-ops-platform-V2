#!/usr/bin/env node

/**
 * Simple check of Eitje records status
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecords() {
  console.log('🔍 Checking Eitje Records Status');
  console.log('================================');
  
  try {
    // Check raw tables
    console.log('\n📊 Raw Tables:');
    
    const rawTables = [
      'eitje_time_registration_shifts_raw',
      'eitje_planning_shifts_raw', 
      'eitje_revenue_days_raw'
    ];
    
    for (const table of rawTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ${table}: ❌ ${error.message}`);
        } else {
          console.log(`   ${table}: ✅ ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ${table}: ❌ ${err.message}`);
      }
    }
    
    // Check aggregated tables
    console.log('\n📊 Aggregated Tables:');
    
    const aggTables = [
      'eitje_labor_hours_aggregated',
      'eitje_planning_hours_aggregated',
      'eitje_revenue_days_aggregated'
    ];
    
    for (const table of aggTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ${table}: ❌ ${error.message}`);
        } else {
          console.log(`   ${table}: ✅ ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ${table}: ❌ ${err.message}`);
      }
    }
    
    // Check if we have any data in 2024-2025 range
    console.log('\n📅 Date Range Check:');
    
    try {
      const { data: shifts2024, error: shifts2024Error } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .select('date')
        .gte('date', '2024-01-01')
        .lte('date', '2024-12-31')
        .limit(1);
      
      const { data: shifts2025, error: shifts2025Error } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .select('date')
        .gte('date', '2025-01-01')
        .lte('date', '2025-12-31')
        .limit(1);
      
      if (shifts2024Error) {
        console.log(`   2024 data: ❌ ${shifts2024Error.message}`);
      } else {
        console.log(`   2024 data: ${shifts2024 && shifts2024.length > 0 ? '✅ Found' : '⚠️  None'}`);
      }
      
      if (shifts2025Error) {
        console.log(`   2025 data: ❌ ${shifts2025Error.message}`);
      } else {
        console.log(`   2025 data: ${shifts2025 && shifts2025.length > 0 ? '✅ Found' : '⚠️  None'}`);
      }
      
    } catch (err) {
      console.log(`   Date check: ❌ ${err.message}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkRecords().catch(console.error);


