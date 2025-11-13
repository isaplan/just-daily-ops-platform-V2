/**
 * Check if team filter is working correctly
 * Test query to see if data exists with team_name = 'Algemeen'
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamFilter() {
  console.log('🔍 Checking team filter...\n');

  // Test 1: Check if data exists with team_name = 'Algemeen'
  const { data: algemeenData, error: algemeenError, count: algemeenCount } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('*', { count: 'exact' })
    .eq('team_name', 'Algemeen')
    .limit(5);

  console.log('Test 1: team_name = "Algemeen"');
  console.log('  Count:', algemeenCount);
  console.log('  Error:', algemeenError?.message || 'None');
  if (algemeenData && algemeenData.length > 0) {
    console.log('  Sample record:', {
      id: algemeenData[0].id,
      date: algemeenData[0].date,
      team_name: algemeenData[0].team_name,
      user_name: algemeenData[0].user_name
    });
  }

  // Test 2: Check unique team names in date range
  const { data: teamNames, error: teamError } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('team_name')
    .gte('date', '2024-12-31')
    .lte('date', '2025-12-31')
    .not('team_name', 'is', null)
    .neq('team_name', '');

  if (teamNames) {
    const unique = Array.from(new Set(teamNames.map(r => r.team_name))).sort();
    console.log('\nTest 2: Unique team names in date range 2024-12-31 to 2025-12-31:');
    console.log('  Teams:', unique);
    console.log('  Includes "Algemeen":', unique.includes('Algemeen'));
  }

  // Test 3: Check with exact date range and team filter
  const { data: filteredData, error: filteredError, count: filteredCount } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('*', { count: 'exact' })
    .gte('date', '2024-12-31')
    .lte('date', '2025-12-31')
    .eq('team_name', 'Algemeen')
    .limit(5);

  console.log('\nTest 3: Combined filter (date range + team_name = "Algemeen")');
  console.log('  Count:', filteredCount);
  console.log('  Error:', filteredError?.message || 'None');
  if (filteredData && filteredData.length > 0) {
    console.log('  Sample records:', filteredData.map(r => ({
      id: r.id,
      date: r.date,
      team_name: r.team_name,
      user_name: r.user_name
    })));
  } else {
    console.log('  ⚠️ No records found with this filter combination');
  }

  // Test 4: Check what dates actually exist in the database
  const { data: dateRange, error: dateError } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('date')
    .order('date', { ascending: false })
    .limit(10);

  if (dateRange) {
    console.log('\nTest 4: Actual dates in database (latest 10):');
    console.log('  Dates:', dateRange.map(r => r.date));
  }
}

checkTeamFilter()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

