const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseConstraints() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment check:');
  console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  Key:', supabaseKey ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking database constraints for Eitje tables...\n');
  
  // Check if tables exist and their structure
  const tables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw', 
    'eitje_revenue_days_raw'
  ];
  
  for (const table of tables) {
    console.log(`📊 Checking table: ${table}`);
    
    try {
      // Try to get table info by querying constraints
      const { data: constraints, error: constraintError } = await supabase
        .rpc('get_table_constraints', { table_name: table });
      
      if (constraintError) {
        console.log(`  ❌ Error getting constraints: ${constraintError.message}`);
        
        // Fallback: try to query the table structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.log(`  ❌ Table doesn't exist or no access: ${sampleError.message}`);
        } else {
          console.log(`  ✅ Table exists, sample data:`, sampleData);
        }
      } else {
        console.log(`  ✅ Constraints found:`, constraints);
      }
      
    } catch (error) {
      console.log(`  ❌ Error checking table ${table}:`, error.message);
    }
    
    console.log('');
  }
  
  // Check if we can insert a test record to see what happens
  console.log('🧪 Testing insert capability...');
  
  try {
    const testRecord = {
      eitje_id: 999999,
      date: '2025-01-28',
      raw_data: { test: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.log('❌ Insert test failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log('✅ Insert test successful:', data);
      
      // Clean up test record
      await supabase
        .from('eitje_time_registration_shifts_raw')
        .delete()
        .eq('eitje_id', 999999);
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.log('❌ Insert test error:', error.message);
  }
}

checkDatabaseConstraints().catch(console.error);
