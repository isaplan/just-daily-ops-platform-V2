const { createClient } = require('@supabase/supabase-js');

async function checkBorkAggregatedData() {
  const supabaseUrl = 'https://vrucbxdudchboznunndz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking Bork aggregated data...\n');
  
  // Check aggregated table
  console.log('📊 Checking bork_sales_aggregated table...');
  
  try {
    const { data: records, error, count } = await supabase
      .from('bork_sales_aggregated')
      .select('*', { count: 'exact' })
      .limit(10);
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Records found: ${count || 0}`);
      if (records && records.length > 0) {
        console.log(`  📋 Sample records:`);
        records.forEach((record, index) => {
          console.log(`    ${index + 1}. Location: ${record.location_id}, Date: ${record.date}, Revenue: €${record.total_revenue_incl_vat || 0}`);
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`);
  }
  
  console.log('\n🔍 Checking raw Bork data...');
  
  try {
    const { data: records, error, count } = await supabase
      .from('bork_sales_data')
      .select('location_id, date, category', { count: 'exact' })
      .limit(10);
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Records found: ${count || 0}`);
      if (records && records.length > 0) {
        console.log(`  📋 Sample records:`);
        records.forEach((record, index) => {
          console.log(`    ${index + 1}. Location: ${record.location_id}, Date: ${record.date}, Category: ${record.category}`);
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`);
  }
  
  console.log('\n🔍 Checking locations...');
  
  try {
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name')
      .limit(10);
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Locations found: ${locations?.length || 0}`);
      if (locations && locations.length > 0) {
        console.log(`  📋 Locations:`);
        locations.forEach((location, index) => {
          console.log(`    ${index + 1}. ${location.name} (${location.id})`);
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`);
  }
}

checkBorkAggregatedData().catch(console.error);

