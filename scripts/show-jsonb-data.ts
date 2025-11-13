import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function showJSONBData() {
  const { data, error } = await supabase
    .from('eitje_revenue_days_raw')
    .select('id, date, environment_id, raw_data')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data) {
    console.log('No data found');
    return;
  }
  
  console.log('\n=== JSONB DATA ===\n');
  console.log(JSON.stringify(data.raw_data, null, 2));
  console.log('\n');
}

showJSONBData().catch(console.error);
