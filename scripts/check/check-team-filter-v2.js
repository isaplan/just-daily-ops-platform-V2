require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamFilterV2() {
  console.log('🔍 Checking team filter in processed_v2 table...\n');

  const teamName = 'Algemeen';
  const startDate = '2025-01-01';
  const endDate = '2025-12-31';

  try {
    // Test 1: Get all unique team names in date range
    const { data: allTeams, error: teamsError } = await supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('team_name')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('team_name', 'is', null)
      .neq('team_name', '');

    if (teamsError) {
      console.error('❌ Error fetching team names:', teamsError);
      return;
    }

    const uniqueTeams = Array.from(new Set(
      (allTeams || []).map(r => r.team_name?.trim()).filter(Boolean)
    )).sort();

    console.log('📊 Unique team names in date range:', uniqueTeams);
    console.log(`   Looking for: "${teamName}"`);
    console.log(`   Exists: ${uniqueTeams.includes(teamName)}`);
    console.log(`   Exact match: ${uniqueTeams.some(t => t === teamName)}`);
    console.log(`   Case-insensitive match: ${uniqueTeams.some(t => t.toLowerCase() === teamName.toLowerCase())}\n`);

    // Test 2: Count records with team filter
    const { count: teamCount, error: countError } = await supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('team_name', teamName);

    if (countError) {
      console.error('❌ Error counting with team filter:', countError);
    } else {
      console.log(`📈 Records with team_name = "${teamName}": ${teamCount}`);
    }

    // Test 3: Count total records in date range
    const { count: totalCount, error: totalError } = await supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDate)
      .lte('date', endDate);

    if (totalError) {
      console.error('❌ Error counting total:', totalError);
    } else {
      console.log(`📈 Total records in date range: ${totalCount}\n`);
    }

    // Test 4: Get sample records with team filter
    const { data: sampleRecords, error: sampleError } = await supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('id, date, user_name, team_name, type_name')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('team_name', teamName)
      .limit(5);

    if (sampleError) {
      console.error('❌ Error fetching sample records:', sampleError);
    } else {
      console.log(`📋 Sample records (${sampleRecords?.length || 0}):`);
      (sampleRecords || []).forEach((r, i) => {
        console.log(`   ${i + 1}. Date: ${r.date}, User: ${r.user_name}, Team: "${r.team_name}", Type: ${r.type_name || '(null)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTeamFilterV2();

