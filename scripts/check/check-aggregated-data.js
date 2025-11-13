const { createClient } = require('@supabase/supabase-js');

async function checkAggregatedData() {
  const supabaseUrl = 'https://vrucbxdudchboznunndz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking Eitje aggregated data tables...\n');
  
  const tables = [
    'eitje_labor_hours_aggregated',
    'eitje_planning_hours_aggregated', 
    'eitje_revenue_days_aggregated',
    'eitje_hours_aggregated', // Alternative table name
    'eitje_productivity_data' // From the migration
  ];
  
  for (const table of tables) {
    console.log(`📊 Checking table: ${table}`);
    
    try {
      // Check if table exists and get record count
      const { data: records, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Records found: ${count || 0}`);
        if (records && records.length > 0) {
          console.log(`  📋 Sample record:`, {
            id: records[0].id,
            date: records[0].date,
            environment_id: records[0].environment_id,
            team_id: records[0].team_id,
            total_hours_worked: records[0].total_hours_worked,
            total_wage_cost: records[0].total_wage_cost,
            employee_count: records[0].employee_count
          });
        }
      }
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Check what data we have in raw tables
  console.log('🔍 Checking raw data tables...\n');
  
  const rawTables = [
    'eitje_time_registration_shifts_raw',
    'eitje_revenue_days_raw'
  ];
  
  for (const table of rawTables) {
    console.log(`📊 Checking table: ${table}`);
    
    try {
      const { data: records, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Records found: ${count || 0}`);
        if (records && records.length > 0) {
          console.log(`  📋 Sample record:`, {
            id: records[0].id,
            eitje_id: records[0].eitje_id,
            date: records[0].date,
            has_raw_data: !!records[0].raw_data,
            raw_data_keys: records[0].raw_data ? Object.keys(records[0].raw_data) : 'no raw_data'
          });
        }
      }
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
    }
    
    console.log('');
  }
}

checkAggregatedData().catch(console.error);


