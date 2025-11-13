#!/usr/bin/env node

/**
 * Trigger aggregation for missing dates
 * Uses Supabase client (works with Next.js environment)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function triggerAggregation() {
  console.log('🚀 Triggering aggregation for missing dates...\n');

  // Trigger Labor Hours aggregation (Oct 11-30)
  console.log('⏳ Triggering Labor Hours aggregation (Oct 11-30)...');
  try {
    const laborResponse = await supabase.functions.invoke('eitje-aggregate-data', {
      body: {
        endpoint: 'time_registration_shifts',
        startDate: '2025-10-11',
        endDate: '2025-10-30'
      }
    });

    if (laborResponse.error) {
      console.error('❌ Labor Hours aggregation failed:');
      console.error('   Error:', laborResponse.error);
      if (laborResponse.error.message) {
        console.error('   Message:', laborResponse.error.message);
      }
    } else {
      console.log('✅ Labor Hours aggregation triggered successfully!');
      console.log('   Response:', JSON.stringify(laborResponse.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Labor Hours aggregation error:', error.message);
  }

  console.log('\n---\n');

  // Wait a moment before next request
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Trigger Revenue Days aggregation (Oct 9-29)
  console.log('⏳ Triggering Revenue Days aggregation (Oct 9-29)...');
  try {
    const revenueResponse = await supabase.functions.invoke('eitje-aggregate-data', {
      body: {
        endpoint: 'revenue_days',
        startDate: '2025-10-09',
        endDate: '2025-10-29'
      }
    });

    if (revenueResponse.error) {
      console.error('❌ Revenue Days aggregation failed:');
      console.error('   Error:', revenueResponse.error);
      if (revenueResponse.error.message) {
        console.error('   Message:', revenueResponse.error.message);
      }
    } else {
      console.log('✅ Revenue Days aggregation triggered successfully!');
      console.log('   Response:', JSON.stringify(revenueResponse.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Revenue Days aggregation error:', error.message);
  }

  console.log('\n📋 Next steps:');
  console.log('  1. Wait a few seconds for aggregation to complete');
  console.log('  2. Check aggregated tables in Supabase SQL Editor:');
  console.log('     SELECT COUNT(*), MAX(date) FROM eitje_labor_hours_aggregated;');
  console.log('     SELECT COUNT(*), MAX(date) FROM eitje_revenue_days_aggregated;');
  console.log('  3. Run gap check SQL again to verify all dates are aggregated');
  console.log('  4. Check edge function logs in Supabase Dashboard');
}

triggerAggregation().catch(console.error);



