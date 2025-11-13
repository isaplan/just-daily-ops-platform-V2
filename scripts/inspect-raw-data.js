/**
 * Inspect raw data to see what's being counted as revenue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;
const MONTH = 1; // January

async function inspectData() {
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('*')
    .eq('location_id', VAN_KINSBERGEN_ID)
    .eq('year', YEAR)
    .eq('month', MONTH)
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n=== RAW DATA INSPECTION - January 2025 ===\n`);
  console.log(`Total records: ${rawData.length}\n`);

  // Group by category
  const byCategory = {};
  rawData.forEach(r => {
    const cat = r.category || 'UNKNOWN';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, total: 0, records: [] };
    }
    byCategory[cat].count++;
    byCategory[cat].total += r.amount || 0;
    byCategory[cat].records.push(r);
  });

  // Show top categories by total amount
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total));

  console.log('┌─────────────────────────────────────────────────────────┬──────────┬──────────────┐');
  console.log('│ Category                                                 │ Records  │ Total Amount │');
  console.log('├─────────────────────────────────────────────────────────┼──────────┼──────────────┤');
  
  sortedCategories.slice(0, 20).forEach(([cat, data]) => {
    const catDisplay = cat.length > 55 ? cat.substring(0, 52) + '...' : cat;
    const count = data.count.toString().padStart(8);
    const total = data.total.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).padStart(12);
    console.log(`│ ${catDisplay.padEnd(55)} │ ${count} │ ${total} € │`);
  });
  
  console.log('└─────────────────────────────────────────────────────────┴──────────┴──────────────┘');

  // Show revenue records (positive amounts)
  const revenueRecords = rawData.filter(r => (r.amount || 0) > 0);
  console.log(`\n=== REVENUE RECORDS (Positive amounts) ===`);
  console.log(`Total revenue records: ${revenueRecords.length}`);
  console.log(`Total revenue amount: ${revenueRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString('nl-NL')} €\n`);

  // Group revenue by category
  const revenueByCategory = {};
  revenueRecords.forEach(r => {
    const cat = r.category || 'UNKNOWN';
    if (!revenueByCategory[cat]) {
      revenueByCategory[cat] = { count: 0, total: 0 };
    }
    revenueByCategory[cat].count++;
    revenueByCategory[cat].total += r.amount || 0;
  });

  const sortedRevenue = Object.entries(revenueByCategory)
    .sort((a, b) => b[1].total - a[1].total);

  console.log('┌─────────────────────────────────────────────────────────┬──────────┬──────────────┐');
  console.log('│ Revenue Category                                        │ Records  │ Total Amount │');
  console.log('├─────────────────────────────────────────────────────────┼──────────┼──────────────┤');
  
  sortedRevenue.forEach(([cat, data]) => {
    const catDisplay = cat.length > 55 ? cat.substring(0, 52) + '...' : cat;
    const count = data.count.toString().padStart(8);
    const total = data.total.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).padStart(12);
    console.log(`│ ${catDisplay.padEnd(55)} │ ${count} │ ${total} € │`);
  });
  
  console.log('└─────────────────────────────────────────────────────────┴──────────┴──────────────┘');

  // Show sample revenue records
  console.log(`\n=== SAMPLE REVENUE RECORDS (Top 10) ===\n`);
  revenueRecords
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 10)
    .forEach((r, i) => {
      console.log(`${i + 1}. ${r.category || 'N/A'}`);
      console.log(`   Subcategory: ${r.subcategory || 'N/A'}`);
      console.log(`   GL Account: ${r.gl_account || 'N/A'}`);
      console.log(`   Amount: ${(r.amount || 0).toLocaleString('nl-NL')} €\n`);
    });
}

inspectData().catch(console.error);



