#!/usr/bin/env node

/**
 * Check wage cost data in aggregated table
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function checkData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get sample records
  const { data, error } = await supabase
    .from('eitje_labor_hours_aggregated')
    .select('date, environment_id, team_id, total_hours_worked, total_wage_cost, avg_wage_per_hour, employee_count, shift_count')
    .order('date', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample records from eitje_labor_hours_aggregated:');
  console.log('================================================');
  data.forEach(r => {
    console.log({
      date: r.date,
      env_id: r.environment_id,
      team_id: r.team_id,
      hours: r.total_hours_worked,
      wage_cost: r.total_wage_cost,
      avg_wage_per_hour: r.avg_wage_per_hour,
      employees: r.employee_count,
      shifts: r.shift_count
    });
  });
  
  // Count records with wage_cost > 0
  const { count } = await supabase
    .from('eitje_labor_hours_aggregated')
    .select('*', { count: 'exact', head: true });
  
  const { count: withCost } = await supabase
    .from('eitje_labor_hours_aggregated')
    .select('*', { count: 'exact', head: true })
    .gt('total_wage_cost', 0);
  
  console.log(`\nTotal records: ${count}`);
  console.log(`Records with wage_cost > 0: ${withCost}`);
}

checkData();

