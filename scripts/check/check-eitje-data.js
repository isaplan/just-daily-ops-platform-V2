const { createClient } = require('@supabase/supabase-js');

async function checkEitjeData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking Eitje data in database...\n');
  
  // Check time_registration_shifts_raw
  console.log('📊 Time Registration Shifts Raw Data:');
  const { data: timeData, error: timeError } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('id, date, created_at')
    .order('date', { ascending: true })
    .limit(20);
  
  if (timeError) {
    console.log('❌ Error:', timeError.message);
  } else {
    console.log(`Found ${timeData?.length || 0} records`);
    if (timeData && timeData.length > 0) {
      console.log('Sample dates:', timeData.map(r => r.date).slice(0, 10));
    }
  }
  
  // Check revenue_days_raw
  console.log('\n📊 Revenue Days Raw Data:');
  const { data: revenueData, error: revenueError } = await supabase
    .from('eitje_revenue_days_raw')
    .select('id, date, created_at')
    .order('date', { ascending: true })
    .limit(20);
  
  if (revenueError) {
    console.log('❌ Error:', revenueError.message);
  } else {
    console.log(`Found ${revenueData?.length || 0} records`);
    if (revenueData && revenueData.length > 0) {
      console.log('Sample dates:', revenueData.map(r => r.date).slice(0, 10));
    }
  }
  
  // Check what months have data
  console.log('\n📅 Data by Month:');
  const { data: monthData, error: monthError } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('date')
    .order('date', { ascending: true });
  
  if (!monthError && monthData) {
    const months = {};
    monthData.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      months[month] = (months[month] || 0) + 1;
    });
    
    console.log('Time Registration Shifts by month:');
    Object.entries(months).forEach(([month, count]) => {
      console.log(`  ${month}: ${count} records`);
    });
  }
  
  // Check revenue data by month
  const { data: revenueMonthData, error: revenueMonthError } = await supabase
    .from('eitje_revenue_days_raw')
    .select('date')
    .order('date', { ascending: true });
  
  if (!revenueMonthError && revenueMonthData) {
    const months = {};
    revenueMonthData.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      months[month] = (months[month] || 0) + 1;
    });
    
    console.log('\nRevenue Days by month:');
    Object.entries(months).forEach(([month, count]) => {
      console.log(`  ${month}: ${count} records`);
    });
  }
}

checkEitjeData().catch(console.error);


