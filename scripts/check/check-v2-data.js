const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkV2Data() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking V2 Data Flow Status\n');
  console.log('='.repeat(50));
  
  let processedCount = 0;
  let aggregatedCount = 0;
  let workerCount = 0;
  
  // Check Processed V2 Table
  console.log('\n📊 Checking eitje_time_registration_shifts_processed_v2...');
  try {
    const { data: processedData, error: processedError, count } = await supabase
      .from('eitje_time_registration_shifts_processed_v2')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (processedError) {
      console.log(`   ❌ Error: ${processedError.message}`);
    } else {
      processedCount = count || 0;
      console.log(`   ✅ Total records: ${processedCount}`);
      if (processedData && processedData.length > 0) {
        console.log(`   📋 Sample records: ${processedData.length}`);
        const sample = processedData[0];
        console.log(`   📅 Sample date: ${sample.date}`);
        console.log(`   👤 Sample user: ${sample.user_name} (ID: ${sample.user_id})`);
        console.log(`   🏢 Sample environment: ${sample.environment_name} (ID: ${sample.environment_id})`);
        console.log(`   ⏰ Sample time: ${sample.start} - ${sample.end || 'N/A'}`);
        console.log(`   💰 Sample wage_cost: ${sample.wage_cost || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No data found in processed_v2 table`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Check Aggregated V2 Table
  console.log('\n📊 Checking eitje_hours_aggregated_v2...');
  try {
    const { data: aggregatedData, error: aggregatedError, count } = await supabase
      .from('eitje_hours_aggregated_v2')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (aggregatedError) {
      console.log(`   ❌ Error: ${aggregatedError.message}`);
    } else {
      aggregatedCount = count || 0;
      console.log(`   ✅ Total records: ${aggregatedCount}`);
      if (aggregatedData && aggregatedData.length > 0) {
        console.log(`   📋 Sample records: ${aggregatedData.length}`);
        const sample = aggregatedData[0];
        console.log(`   📅 Sample date: ${sample.date}`);
        console.log(`   👤 Sample user: ${sample.user_name} (ID: ${sample.user_id})`);
        console.log(`   ⏱️  Hours worked: ${sample.hours_worked}`);
        console.log(`   💵 Hourly rate: ${sample.hourly_rate || 'N/A'}`);
        console.log(`   💰 Labor cost: ${sample.labor_cost || 'N/A'}`);
        console.log(`   🔢 Shift count: ${sample.shift_count || 0}`);
      } else {
        console.log(`   ⚠️  No data found in aggregated_v2 table`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Check Worker Profiles
  console.log('\n📊 Checking worker_profiles...');
  try {
    const { data: workerData, error: workerError, count } = await supabase
      .from('worker_profiles')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (workerError) {
      console.log(`   ❌ Error: ${workerError.message}`);
    } else {
      workerCount = count || 0;
      console.log(`   ✅ Total profiles: ${workerCount}`);
      if (workerData && workerData.length > 0) {
        console.log(`   📋 Sample profiles: ${workerData.length}`);
        const sample = workerData[0];
        console.log(`   👤 Sample user ID: ${sample.eitje_user_id}`);
        console.log(`   💵 Hourly wage: ${sample.hourly_wage || 'N/A'}`);
        console.log(`   📝 Contract type: ${sample.contract_type || 'N/A'}`);
        console.log(`   📅 Effective from: ${sample.effective_from || 'N/A'}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📈 Summary:');
  console.log('   Processed V2: ' + (processedCount > 0 ? '✅ Has data' : '⚠️  Empty'));
  console.log('   Aggregated V2: ' + (aggregatedCount > 0 ? '✅ Has data' : '⚠️  Empty'));
  console.log('   Worker Profiles: ' + (workerCount > 0 ? '✅ Has data' : '⚠️  Empty'));
  
  if (processedCount > 0 && aggregatedCount > 0) {
    console.log('\n✅ V2 Flow Status: COMPLETE - Both tables have data!');
  } else if (processedCount > 0 && aggregatedCount === 0) {
    console.log('\n⚠️  V2 Flow Status: PARTIAL - Processed data exists but aggregation needed');
    console.log('   → Run aggregation function: SELECT aggregate_hours_v2();');
  } else if (processedCount === 0) {
    console.log('\n⚠️  V2 Flow Status: NOT STARTED - No processed data found');
    console.log('   → Run processing function: SELECT process_time_registration_shifts_v2();');
  }
  
  console.log('\n');
}

checkV2Data().catch(console.error);

