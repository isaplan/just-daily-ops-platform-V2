#!/usr/bin/env node

/**
 * Test script to verify Eitje raw tables are working
 * This script tests the complete flow: sync -> raw tables -> aggregation
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRawTables() {
  console.log('🧪 Testing Eitje Raw Tables...\n');

  try {
    // 1. Check if raw tables exist
    console.log('1️⃣ Checking if raw tables exist...');
    
    const tables = [
      'eitje_time_registration_shifts_raw',
      'eitje_planning_shifts_raw', 
      'eitje_revenue_days_raw',
      'eitje_availability_shifts_raw',
      'eitje_leave_requests_raw',
      'eitje_events_raw'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Table exists (${data?.length || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // 2. Check aggregated tables exist
    console.log('\n2️⃣ Checking if aggregated tables exist...');
    
    const aggregatedTables = [
      'eitje_labor_hours_aggregated',
      'eitje_planning_hours_aggregated',
      'eitje_revenue_days_aggregated'
    ];

    for (const table of aggregatedTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Table exists (${data?.length || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // 3. Test a simple insert into raw table
    console.log('\n3️⃣ Testing insert into raw table...');
    
    const testRecord = {
      eitje_id: 999999,
      user_id: 1,
      team_id: 1,
      environment_id: 1,
      date: '2024-10-24',
      start_time: '2024-10-24T09:00:00Z',
      end_time: '2024-10-24T17:00:00Z',
      hours_worked: 8.0,
      wage_cost: 120.0,
      status: 'completed',
      raw_data: { test: true, source: 'test-script' }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.log(`❌ Insert failed: ${insertError.message}`);
    } else {
      console.log(`✅ Insert successful: ${insertData?.length || 0} records inserted`);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .delete()
        .eq('eitje_id', 999999);
      
      if (deleteError) {
        console.log(`⚠️ Cleanup failed: ${deleteError.message}`);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }

    // 4. Test aggregation API endpoint
    console.log('\n4️⃣ Testing aggregation API...');
    
    try {
      const response = await fetch('http://localhost:3000/api/eitje/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'time_registration_shifts',
          startDate: '2024-10-24',
          endDate: '2024-10-25'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Aggregation API working: ${JSON.stringify(result, null, 2)}`);
      } else {
        console.log(`❌ Aggregation API failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.log(`❌ Aggregation API error: ${err.message}`);
    }

    console.log('\n🎉 Raw tables test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRawTables();


