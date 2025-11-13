const { createClient } = require('@supabase/supabase-js');

async function checkRevenueRawData() {
  const supabaseUrl = 'https://vrucbxdudchboznunndz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking revenue raw data structure...\n');
  
  try {
    const { data: records, error } = await supabase
      .from('eitje_revenue_days_raw')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log(`📊 Found ${records?.length || 0} revenue records\n`);
    
    if (records && records.length > 0) {
      records.forEach((record, index) => {
        console.log(`📋 Record ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Eitje ID: ${record.eitje_id}`);
        console.log(`  Date: ${record.date}`);
        console.log(`  Environment ID: ${record.environment_id}`);
        console.log(`  Raw Data Keys:`, Object.keys(record.raw_data || {}));
        console.log(`  Raw Data Sample:`, {
          id: record.raw_data?.id,
          date: record.raw_data?.date,
          amt_in_cents: record.raw_data?.amt_in_cents,
          forecast_amt_in_cents: record.raw_data?.forecast_amt_in_cents,
          environment: record.raw_data?.environment,
          revenue_group: record.raw_data?.revenue_group
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
}

checkRevenueRawData().catch(console.error);


