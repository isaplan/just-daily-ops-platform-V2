#!/usr/bin/env node

/**
 * Test script to verify eitje_environments and eitje_teams queries
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testQueries() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Testing eitje_environments table...\n');
  
  // Test 1: Simple select
  console.log('Test 1: Simple select (first 5 rows)');
  const { data: simpleData, error: simpleError } = await supabase
    .from('eitje_environments')
    .select('eitje_environment_id, name')
    .limit(5);
  
  if (simpleError) {
    console.error('❌ Simple select error:', {
      message: simpleError.message,
      details: simpleError.details,
      hint: simpleError.hint,
      code: simpleError.code
    });
  } else {
    console.log('✅ Simple select successful:', simpleData?.length || 0, 'rows');
    console.log('Sample data:', simpleData);
  }
  
  console.log('\n');
  
  // Test 2: .in() query with sample IDs
  if (simpleData && simpleData.length > 0) {
    const testIds = simpleData.map((r) => r.eitje_environment_id).slice(0, 3);
    console.log('Test 2: .in() query with IDs:', testIds);
    const { data: inData, error: inError } = await supabase
      .from('eitje_environments')
      .select('eitje_environment_id, name')
      .in('eitje_environment_id', testIds);
    
    if (inError) {
      console.error('❌ .in() query error:', {
        message: inError.message,
        details: inError.details,
        hint: inError.hint,
        code: inError.code,
        fullError: JSON.stringify(inError, null, 2)
      });
    } else {
      console.log('✅ .in() query successful:', inData?.length || 0, 'rows');
      console.log('Result:', inData);
    }
  }
  
  console.log('\n');
  
  // Test 3: Test eitje_teams
  console.log('Test 3: eitje_teams simple select');
  const { data: teamsData, error: teamsError } = await supabase
    .from('eitje_teams')
    .select('eitje_team_id, name')
    .limit(5);
  
  if (teamsError) {
    console.error('❌ Teams select error:', {
      message: teamsError.message,
      details: teamsError.details,
      hint: teamsError.hint,
      code: teamsError.code
    });
  } else {
    console.log('✅ Teams select successful:', teamsData?.length || 0, 'rows');
    if (teamsData && teamsData.length > 0) {
      const testTeamIds = teamsData.map((r) => r.eitje_team_id).slice(0, 3);
      console.log('Test 4: .in() query with team IDs:', testTeamIds);
      const { data: teamInData, error: teamInError } = await supabase
        .from('eitje_teams')
        .select('eitje_team_id, name')
        .in('eitje_team_id', testTeamIds);
      
      if (teamInError) {
        console.error('❌ Teams .in() query error:', {
          message: teamInError.message,
          details: teamInError.details,
          hint: teamInError.hint,
          code: teamInError.code,
          fullError: JSON.stringify(teamInError, null, 2)
        });
      } else {
        console.log('✅ Teams .in() query successful:', teamInData?.length || 0, 'rows');
      }
    }
  }
  
  console.log('\n✅ Testing complete');
}

testQueries().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

