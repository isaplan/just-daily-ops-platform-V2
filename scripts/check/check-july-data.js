#!/usr/bin/env node

/**
 * Check if July data is synced and stored as raw data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJulyData() {
  console.log('🔍 Checking July Data in Database');
  console.log('=================================');
  
  try {
    // Check July 2024 and July 2025
    const months = [
      { year: 2024, month: 7, name: 'July 2024' },
      { year: 2025, month: 7, name: 'July 2025' }
    ];
    
    for (const { year, month, name } of months) {
      console.log(`\n📅 ${name}:`);
      
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      
      console.log(`  Date range: ${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`);
      
      // Check master data
      console.log(`\n  📊 Master Data:`);
      
      const { data: environments, error: envError } = await supabase
        .from('eitje_environments')
        .select('id, name, created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!envError) {
        console.log(`    Environments: ${environments?.length || 0} records`);
      }
      
      const { data: teams, error: teamsError } = await supabase
        .from('eitje_teams')
        .select('id, name, created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!teamsError) {
        console.log(`    Teams: ${teams?.length || 0} records`);
      }
      
      const { data: users, error: usersError } = await supabase
        .from('eitje_users')
        .select('id, first_name, last_name, created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!usersError) {
        console.log(`    Users: ${users?.length || 0} records`);
      }
      
      const { data: shiftTypes, error: shiftTypesError } = await supabase
        .from('eitje_shift_types')
        .select('id, name, created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!shiftTypesError) {
        console.log(`    Shift Types: ${shiftTypes?.length || 0} records`);
      }
      
      // Check raw data
      console.log(`\n  📊 Raw Data:`);
      
      const { data: timeShifts, error: timeShiftsError } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .select('id, created_at, date, raw_data')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!timeShiftsError) {
        console.log(`    Time Registration Shifts: ${timeShifts?.length || 0} records`);
        if (timeShifts && timeShifts.length > 0) {
          console.log(`      First record: ${timeShifts[0].created_at}`);
          console.log(`      Date field: ${timeShifts[0].date || 'null'}`);
          if (timeShifts[0].raw_data && timeShifts[0].raw_data.date) {
            console.log(`      Raw data date: ${timeShifts[0].raw_data.date}`);
          }
        }
      } else {
        console.log(`    Time Registration Shifts: Error - ${timeShiftsError.message}`);
      }
      
      const { data: revenueDays, error: revenueDaysError } = await supabase
        .from('eitje_revenue_days_raw')
        .select('id, created_at, date, raw_data')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!revenueDaysError) {
        console.log(`    Revenue Days: ${revenueDays?.length || 0} records`);
        if (revenueDays && revenueDays.length > 0) {
          console.log(`      First record: ${revenueDays[0].created_at}`);
          console.log(`      Date field: ${revenueDays[0].date || 'null'}`);
          if (revenueDays[0].raw_data && revenueDays[0].raw_data.date) {
            console.log(`      Raw data date: ${revenueDays[0].raw_data.date}`);
          }
        }
      } else {
        console.log(`    Revenue Days: Error - ${revenueDaysError.message}`);
      }
      
      const { data: planningShifts, error: planningShiftsError } = await supabase
        .from('eitje_planning_shifts_raw')
        .select('id, created_at, date, raw_data')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (!planningShiftsError) {
        console.log(`    Planning Shifts: ${planningShifts?.length || 0} records`);
        if (planningShifts && planningShifts.length > 0) {
          console.log(`      First record: ${planningShifts[0].created_at}`);
          console.log(`      Date field: ${planningShifts[0].date || 'null'}`);
          if (planningShifts[0].raw_data && planningShifts[0].raw_data.date) {
            console.log(`      Raw data date: ${planningShifts[0].raw_data.date}`);
          }
        }
      } else {
        console.log(`    Planning Shifts: Error - ${planningShiftsError.message}`);
      }
      
      // Check aggregated data
      console.log(`\n  📊 Aggregated Data:`);
      
      const { data: laborHours, error: laborHoursError } = await supabase
        .from('eitje_labor_hours_aggregated')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);
      
      if (!laborHoursError) {
        console.log(`    Labor Hours Aggregated: ${laborHours?.length || 0} records`);
      } else {
        console.log(`    Labor Hours Aggregated: Error - ${laborHoursError.message}`);
      }
      
      const { data: revenueDaysAgg, error: revenueDaysAggError } = await supabase
        .from('eitje_revenue_days_aggregated')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);
      
      if (!revenueDaysAggError) {
        console.log(`    Revenue Days Aggregated: ${revenueDaysAgg?.length || 0} records`);
      } else {
        console.log(`    Revenue Days Aggregated: Error - ${revenueDaysAggError.message}`);
      }
      
      // Summary
      const totalMasterData = (environments?.length || 0) + (teams?.length || 0) + (users?.length || 0) + (shiftTypes?.length || 0);
      const totalRawData = (timeShifts?.length || 0) + (revenueDays?.length || 0) + (planningShifts?.length || 0);
      const totalAggregated = (laborHours?.length || 0) + (revenueDaysAgg?.length || 0);
      
      console.log(`\n  📈 Summary:`);
      console.log(`    Master Data: ${totalMasterData} records`);
      console.log(`    Raw Data: ${totalRawData} records`);
      console.log(`    Aggregated Data: ${totalAggregated} records`);
      
      if (totalRawData === 0) {
        console.log(`    ❌ No raw data found for ${name}`);
      } else {
        console.log(`    ✅ Raw data exists for ${name}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkJulyData();


