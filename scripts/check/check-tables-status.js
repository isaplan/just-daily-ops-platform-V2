const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTablesStatus() {
  try {
    console.log('Checking tables status...');
    
    // Check if tables exist by trying to query them
    const tables = [
      'powerbi_pnl_aggregated',
      'powerbi_pnl_aggregated_subcategories',
      'powerbi_pnl_data',
      'locations'
    ];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: exists (${count} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
    // Try to get table info from information_schema
    console.log('\nChecking table structure...');
    try {
      const { data, error } = await supabase
        .rpc('exec', {
          sql: `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('powerbi_pnl_aggregated', 'powerbi_pnl_aggregated_subcategories')
            ORDER BY table_name, ordinal_position;
          `
        });
      
      if (error) {
        console.log('❌ Could not query table structure:', error.message);
      } else {
        console.log('✅ Table structure:', data);
      }
    } catch (err) {
      console.log('❌ Error querying table structure:', err.message);
    }
    
    // Check RLS status
    console.log('\nChecking RLS status...');
    try {
      const { data, error } = await supabase
        .rpc('exec', {
          sql: `
            SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename IN ('powerbi_pnl_aggregated', 'powerbi_pnl_aggregated_subcategories');
          `
        });
      
      if (error) {
        console.log('❌ Could not query RLS status:', error.message);
      } else {
        console.log('✅ RLS status:', data);
      }
    } catch (err) {
      console.log('❌ Error querying RLS status:', err.message);
    }
    
  } catch (error) {
    console.error('Error checking tables status:', error);
  }
}

checkTablesStatus();


