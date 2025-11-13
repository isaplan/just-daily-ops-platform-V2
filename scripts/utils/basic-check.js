const { createClient } = require('@supabase/supabase-js');

// Try to load env vars
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  console.log('No .env.local found, using process.env');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL:', !!supabaseUrl);
console.log('SUPABASE_KEY:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    console.log('\nChecking raw tables...');
    
    const { data, error } = await supabase
      .from('eitje_time_registration_shifts_raw')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Records found:', data?.length || 0);
    }
    
  } catch (err) {
    console.log('Exception:', err.message);
  }
}

check();


