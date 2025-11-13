#!/usr/bin/env node

/**
 * Verify what data is actually in the database for all months
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

async function verifyDatabaseData() {
  console.log('🔍 Verifying Database Data for All Months');
  console.log('==========================================');
  
  try {
    // Check master data tables
    console.log('\n📊 Master Data Tables:');
    
    const { data: environments, error: envError } = await supabase
      .from('eitje_environments')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });
    
    if (envError) {
      console.log(`❌ Environments error: ${envError.message}`);
    } else {
      console.log(`✅ Environments: ${environments?.length || 0} total records`);
      if (environments?.length > 0) {
        console.log(`   Latest: ${environments[0].name} (${environments[0].created_at})`);
        console.log(`   All:`, environments.map(e => `${e.name} (${e.created_at})`).join(', '));
      }
    }
    
    const { data: teams, error: teamsError } = await supabase
      .from('eitje_teams')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });
    
    if (teamsError) {
      console.log(`❌ Teams error: ${teamsError.message}`);
    } else {
      console.log(`✅ Teams: ${teams?.length || 0} total records`);
      if (teams?.length > 0) {
        console.log(`   Latest: ${teams[0].name} (${teams[0].created_at})`);
      }
    }
    
    const { data: users, error: usersError } = await supabase
      .from('eitje_users')
      .select('id, first_name, last_name, created_at')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.log(`❌ Users error: ${usersError.message}`);
    } else {
      console.log(`✅ Users: ${users?.length || 0} total records`);
      if (users?.length > 0) {
        console.log(`   Latest: ${users[0].first_name} ${users[0].last_name} (${users[0].created_at})`);
      }
    }
    
    const { data: shiftTypes, error: shiftTypesError } = await supabase
      .from('eitje_shift_types')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });
    
    if (shiftTypesError) {
      console.log(`❌ Shift Types error: ${shiftTypesError.message}`);
    } else {
      console.log(`✅ Shift Types: ${shiftTypes?.length || 0} total records`);
      if (shiftTypes?.length > 0) {
        console.log(`   Latest: ${shiftTypes[0].name} (${shiftTypes[0].created_at})`);
      }
    }
    
    // Check raw data tables
    console.log('\n📊 Raw Data Tables:');
    
    const { data: timeShifts, error: timeShiftsError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('id, created_at, date, raw_data')
      .order('created_at', { ascending: false });
    
    if (timeShiftsError) {
      console.log(`❌ Time Registration Shifts error: ${timeShiftsError.message}`);
    } else {
      console.log(`✅ Time Registration Shifts: ${timeShifts?.length || 0} total records`);
      if (timeShifts?.length > 0) {
        console.log(`   Latest: ID ${timeShifts[0].id} (${timeShifts[0].created_at})`);
        console.log(`   Date field: ${timeShifts[0].date || 'null'}`);
        console.log(`   Raw data keys:`, Object.keys(timeShifts[0].raw_data || {}));
      }
    }
    
    const { data: revenueDays, error: revenueDaysError } = await supabase
      .from('eitje_revenue_days_raw')
      .select('id, created_at, date, raw_data')
      .order('created_at', { ascending: false });
    
    if (revenueDaysError) {
      console.log(`❌ Revenue Days error: ${revenueDaysError.message}`);
    } else {
      console.log(`✅ Revenue Days: ${revenueDays?.length || 0} total records`);
      if (revenueDays?.length > 0) {
        console.log(`   Latest: ID ${revenueDays[0].id} (${revenueDays[0].created_at})`);
        console.log(`   Date field: ${revenueDays[0].date || 'null'}`);
        console.log(`   Raw data keys:`, Object.keys(revenueDays[0].raw_data || {}));
      }
    }
    
    const { data: planningShifts, error: planningShiftsError } = await supabase
      .from('eitje_planning_shifts_raw')
      .select('id, created_at, date, raw_data')
      .order('created_at', { ascending: false });
    
    if (planningShiftsError) {
      console.log(`❌ Planning Shifts error: ${planningShiftsError.message}`);
    } else {
      console.log(`✅ Planning Shifts: ${planningShifts?.length || 0} total records`);
      if (planningShifts?.length > 0) {
        console.log(`   Latest: ID ${planningShifts[0].id} (${planningShifts[0].created_at})`);
        console.log(`   Date field: ${planningShifts[0].date || 'null'}`);
        console.log(`   Raw data keys:`, Object.keys(planningShifts[0].raw_data || {}));
      }
    }
    
    // Check aggregated tables
    console.log('\n📊 Aggregated Tables:');
    
    const { data: laborHours, error: laborHoursError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (laborHoursError) {
      console.log(`❌ Labor Hours Aggregated error: ${laborHoursError.message}`);
    } else {
      console.log(`✅ Labor Hours Aggregated: ${laborHours?.length || 0} total records`);
    }
    
    const { data: revenueDaysAgg, error: revenueDaysAggError } = await supabase
      .from('eitje_revenue_days_aggregated')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (revenueDaysAggError) {
      console.log(`❌ Revenue Days Aggregated error: ${revenueDaysAggError.message}`);
    } else {
      console.log(`✅ Revenue Days Aggregated: ${revenueDaysAgg?.length || 0} total records`);
    }
    
    // Check specific months for 2024 and 2025
    console.log('\n📅 Monthly Data Analysis:');
    
    // Check 2024 months
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const year = 2024;
      
      // Check if we have any data for this month
      const { data: monthData, error: monthError } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .select('id, created_at, date')
        .gte('created_at', `${year}-${monthStr}-01`)
        .lt('created_at', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)
        .limit(1);
      
      if (!monthError) {
        console.log(`📅 ${year}-${monthStr}: ${monthData?.length || 0} time shifts`);
      }
    }
    
    // Check 2025 months
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const year = 2025;
      
      // Check if we have any data for this month
      const { data: monthData, error: monthError } = await supabase
        .from('eitje_time_registration_shifts_raw')
        .select('id, created_at, date')
        .gte('created_at', `${year}-${monthStr}-01`)
        .lt('created_at', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)
        .limit(1);
      
      if (!monthError) {
        console.log(`📅 ${year}-${monthStr}: ${monthData?.length || 0} time shifts`);
      }
    }
    
    console.log('\n🔍 Summary:');
    console.log(`- Master data: ${environments?.length || 0} environments, ${teams?.length || 0} teams, ${users?.length || 0} users, ${shiftTypes?.length || 0} shift types`);
    console.log(`- Raw data: ${timeShifts?.length || 0} time shifts, ${revenueDays?.length || 0} revenue days, ${planningShifts?.length || 0} planning shifts`);
    console.log(`- Aggregated: ${laborHours?.length || 0} labor hours, ${revenueDaysAgg?.length || 0} revenue days`);
    
    if ((timeShifts?.length || 0) === 0 && (revenueDays?.length || 0) === 0) {
      console.log('\n❌ ISSUE: No raw data found! This explains why batch processing found 0 records.');
      console.log('   The sync is working for master data but failing for data endpoints.');
    } else {
      console.log('\n✅ Raw data exists! The issue might be in the progress tracking logic.');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

verifyDatabaseData();


