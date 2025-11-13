#!/usr/bin/env node

/**
 * Simple test script to verify Eitje raw tables and basic functionality
 * This script tests database connectivity and basic operations
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

async function testSimpleSync() {
  console.log('🧪 Testing Simple Eitje Sync...\n');

  try {
    // 1. Check if we can read from raw tables
    console.log('1️⃣ Testing read access to raw tables...');
    
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('id, eitje_id, user_id, date, hours_worked, wage_cost')
      .limit(1);
    
    if (shiftsError) {
      console.log(`❌ Error reading shifts: ${shiftsError.message}`);
    } else {
      console.log(`✅ Can read shifts table: ${shiftsData?.length || 0} records`);
    }

    // 2. Check if we can read from aggregated tables
    console.log('\n2️⃣ Testing read access to aggregated tables...');
    
    const { data: laborData, error: laborError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .select('id, date, environment_id, total_hours_worked, total_wage_cost')
      .limit(1);
    
    if (laborError) {
      console.log(`❌ Error reading labor aggregated: ${laborError.message}`);
    } else {
      console.log(`✅ Can read labor aggregated table: ${laborData?.length || 0} records`);
    }

    // 3. Test if we can insert with service role key
    console.log('\n3️⃣ Testing insert with service role...');
    
    // Try to use service role key if available
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      console.log('🔑 Using service role key for insert test...');
      
      const serviceSupabase = createClient(supabaseUrl, serviceKey);
      
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

      const { data: insertData, error: insertError } = await serviceSupabase
        .from('eitje_time_registration_shifts_raw')
        .insert(testRecord)
        .select();

      if (insertError) {
        console.log(`❌ Service role insert failed: ${insertError.message}`);
      } else {
        console.log(`✅ Service role insert successful: ${insertData?.length || 0} records`);
        
        // Clean up
        const { error: deleteError } = await serviceSupabase
          .from('eitje_time_registration_shifts_raw')
          .delete()
          .eq('eitje_id', 999999);
        
        if (deleteError) {
          console.log(`⚠️ Cleanup failed: ${deleteError.message}`);
        } else {
          console.log('✅ Test record cleaned up');
        }
      }
    } else {
      console.log('⚠️ No service role key found, skipping insert test');
    }

    // 4. Test aggregation by manually calculating
    console.log('\n4️⃣ Testing manual aggregation calculation...');
    
    if (serviceKey) {
      const serviceSupabase = createClient(supabaseUrl, serviceKey);
      
      // Insert test data
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
          raw_data: { test: true, source: 'test-script' }
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
          raw_data: { test: true, source: 'test-script' }
        }
      ];

      const { data: insertData, error: insertError } = await serviceSupabase
        .from('eitje_time_registration_shifts_raw')
        .insert(testShifts)
        .select();

      if (insertError) {
        console.log(`❌ Test data insert failed: ${insertError.message}`);
      } else {
        console.log(`✅ Test data inserted: ${insertData?.length || 0} records`);
        
        // Calculate aggregation manually
        const totalHours = testShifts.reduce((sum, shift) => sum + shift.hours_worked, 0);
        const totalCost = testShifts.reduce((sum, shift) => sum + shift.wage_cost, 0);
        const employeeCount = new Set(testShifts.map(s => s.user_id)).size;
        const shiftCount = testShifts.length;
        
        console.log(`📊 Manual calculation results:`);
        console.log(`   Total hours: ${totalHours}`);
        console.log(`   Total cost: ${totalCost}`);
        console.log(`   Employee count: ${employeeCount}`);
        console.log(`   Shift count: ${shiftCount}`);
        console.log(`   Avg hours per employee: ${(totalHours / employeeCount).toFixed(2)}`);
        console.log(`   Avg wage per hour: ${(totalCost / totalHours).toFixed(2)}`);
        
        // Insert aggregated data
        const aggregatedRecord = {
          date: '2024-10-24',
          environment_id: 1,
          team_id: 1,
          total_hours_worked: totalHours,
          total_breaks_minutes: 0,
          total_wage_cost: totalCost,
          employee_count: employeeCount,
          shift_count: shiftCount,
          avg_hours_per_employee: totalHours / employeeCount,
          avg_wage_per_hour: totalCost / totalHours
        };

        const { data: aggData, error: aggError } = await serviceSupabase
          .from('eitje_labor_hours_aggregated')
          .upsert(aggregatedRecord, { 
            onConflict: 'date,environment_id,team_id' 
          })
          .select();

        if (aggError) {
          console.log(`❌ Aggregated data insert failed: ${aggError.message}`);
        } else {
          console.log(`✅ Aggregated data inserted: ${aggData?.length || 0} records`);
        }
        
        // Clean up test data
        const { error: deleteError } = await serviceSupabase
          .from('eitje_time_registration_shifts_raw')
          .delete()
          .in('eitje_id', [100001, 100002]);
        
        const { error: deleteAggError } = await serviceSupabase
          .from('eitje_labor_hours_aggregated')
          .delete()
          .eq('date', '2024-10-24')
          .eq('environment_id', 1);
        
        if (deleteError || deleteAggError) {
          console.log(`⚠️ Cleanup failed: ${deleteError?.message || deleteAggError?.message}`);
        } else {
          console.log('✅ Test data cleaned up');
        }
      }
    }

    console.log('\n🎉 Simple sync test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleSync();


