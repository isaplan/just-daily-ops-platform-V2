#!/usr/bin/env node

/**
 * Test script to verify Eitje sync and aggregation flow
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

async function testSyncAndAggregation() {
  console.log('🧪 Testing Eitje Sync and Aggregation Flow...\n');

  try {
    // 1. Check current state of raw tables
    console.log('1️⃣ Checking current state of raw tables...');
    
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('id, eitje_id, user_id, date, hours_worked, wage_cost')
      .limit(5);
    
    if (shiftsError) {
      console.log(`❌ Error fetching shifts: ${shiftsError.message}`);
    } else {
      console.log(`✅ Time registration shifts: ${shiftsData?.length || 0} records`);
      if (shiftsData && shiftsData.length > 0) {
        console.log('   Sample record:', shiftsData[0]);
      }
    }

    const { data: revenueData, error: revenueError } = await supabase
      .from('eitje_revenue_days_raw')
      .select('id, eitje_id, date, total_revenue')
      .limit(5);
    
    if (revenueError) {
      console.log(`❌ Error fetching revenue: ${revenueError.message}`);
    } else {
      console.log(`✅ Revenue days: ${revenueData?.length || 0} records`);
      if (revenueData && revenueData.length > 0) {
        console.log('   Sample record:', revenueData[0]);
      }
    }

    // 2. Check current state of aggregated tables
    console.log('\n2️⃣ Checking current state of aggregated tables...');
    
    const { data: laborData, error: laborError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .select('id, date, environment_id, total_hours_worked, total_wage_cost')
      .limit(5);
    
    if (laborError) {
      console.log(`❌ Error fetching labor aggregated: ${laborError.message}`);
    } else {
      console.log(`✅ Labor hours aggregated: ${laborData?.length || 0} records`);
      if (laborData && laborData.length > 0) {
        console.log('   Sample record:', laborData[0]);
      }
    }

    // 3. Test manual sync by inserting test data
    console.log('\n3️⃣ Testing manual sync by inserting test data...');
    
    const testShifts = [
      {
        eitje_id: 100001,
        user_id: 1,
        team_id: 1,
        environment_id: 1,
        date: '2024-10-24',
        start_time: '2024-10-24T09:00:00Z',
        end_time: '2024-10-24T17:00:00Z',
        hours_worked: 8.0,
        wage_cost: 120.0,
        status: 'completed',
        raw_data: { 
          test: true, 
          source: 'test-script',
          start: '09:00',
          end: '17:00',
          user: { id: 1, name: 'Test User' }
        }
      },
      {
        eitje_id: 100002,
        user_id: 2,
        team_id: 1,
        environment_id: 1,
        date: '2024-10-24',
        start_time: '2024-10-24T10:00:00Z',
        end_time: '2024-10-24T18:00:00Z',
        hours_worked: 8.0,
        wage_cost: 100.0,
        status: 'completed',
        raw_data: { 
          test: true, 
          source: 'test-script',
          start: '10:00',
          end: '18:00',
          user: { id: 2, name: 'Test User 2' }
        }
      }
    ];

    const { data: insertData, error: insertError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .insert(testShifts)
      .select();

    if (insertError) {
      console.log(`❌ Insert failed: ${insertError.message}`);
    } else {
      console.log(`✅ Insert successful: ${insertData?.length || 0} records inserted`);
    }

    // 4. Test aggregation by calling the aggregation service directly
    console.log('\n4️⃣ Testing aggregation service...');
    
    try {
      // Import the aggregation service
      const { aggregateLaborHours } = require('./src/lib/eitje/aggregation-service.ts');
      
      const aggregationResult = await aggregateLaborHours({
        startDate: '2024-10-24',
        endDate: '2024-10-24',
        environmentId: 1,
        teamId: 1
      });
      
      console.log(`✅ Aggregation result:`, aggregationResult);
      
    } catch (aggError) {
      console.log(`❌ Aggregation failed: ${aggError.message}`);
    }

    // 5. Check if aggregated data was created
    console.log('\n5️⃣ Checking if aggregated data was created...');
    
    const { data: newLaborData, error: newLaborError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .select('*')
      .eq('date', '2024-10-24')
      .eq('environment_id', 1);
    
    if (newLaborError) {
      console.log(`❌ Error fetching new labor data: ${newLaborError.message}`);
    } else {
      console.log(`✅ New labor aggregated data: ${newLaborData?.length || 0} records`);
      if (newLaborData && newLaborData.length > 0) {
        console.log('   Sample record:', newLaborData[0]);
      }
    }

    // 6. Clean up test data
    console.log('\n6️⃣ Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .delete()
      .in('eitje_id', [100001, 100002]);
    
    if (deleteError) {
      console.log(`⚠️ Cleanup failed: ${deleteError.message}`);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Sync and aggregation test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSyncAndAggregation();


