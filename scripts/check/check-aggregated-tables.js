// Check what aggregated tables exist
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('Checking aggregated tables...');
    
    // Check labor hours aggregated
    const { data: laborData, error: laborError } = await supabase
      .from('eitje_labor_hours_aggregated')
      .select('*')
      .limit(3);
      
    if (laborError) {
      console.error('Labor hours aggregated error:', laborError.message);
    } else {
      console.log('Labor hours aggregated sample:', JSON.stringify(laborData, null, 2));
    }
    
    // Check revenue days aggregated
    const { data: revenueData, error: revenueError } = await supabase
      .from('eitje_revenue_days_aggregated')
      .select('*')
      .limit(3);
      
    if (revenueError) {
      console.error('Revenue days aggregated error:', revenueError.message);
    } else {
      console.log('Revenue days aggregated sample:', JSON.stringify(revenueData, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();


