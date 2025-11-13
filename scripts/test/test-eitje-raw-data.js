// Test script to check Eitje raw data structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRawData() {
  try {
    console.log('Testing Eitje raw data structure...');
    
    // Test time registration shifts
    const { data: timeData, error: timeError } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('*')
      .limit(2);
      
    if (timeError) {
      console.error('Time registration shifts error:', timeError);
    } else {
      console.log('Time registration shifts sample:', JSON.stringify(timeData, null, 2));
    }
    
    // Test revenue days
    const { data: revenueData, error: revenueError } = await supabase
      .from('eitje_revenue_days_raw')
      .select('*')
      .limit(2);
      
    if (revenueError) {
      console.error('Revenue days error:', revenueError);
    } else {
      console.log('Revenue days sample:', JSON.stringify(revenueData, null, 2));
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testRawData();
