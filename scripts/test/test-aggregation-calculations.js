const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAggregationCalculations() {
  try {
    console.log('Testing aggregation calculations...');
    
    // Fetch raw data for January 2025
    const { data: rawData, error: fetchError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year, month, category, subcategory, gl_account, amount, import_id')
      .eq('location_id', '550e8400-e29b-41d4-a716-446655440001')
      .eq('year', 2025)
      .eq('month', 1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return;
    }

    console.log(`Found ${rawData.length} raw records for January 2025`);

    // Test aggregation logic using gl_account
    const revenue = 0; // TODO: Get from actual revenue data
    const opbrengst = 0; // TODO: Get from actual opbrengst data
    
    const costs = {
      kostprijs: sumByGlAccount(rawData, 'Kostprijs van de omzet'),
      personeel: 0, // TODO: Get from actual personnel data
      overige: sumByGlAccount(rawData, 'Overige bedrijfskosten'),
      afschrijvingen: sumByGlAccount(rawData, 'Afschrijvingen op immateriële en materiële vaste activa'),
      financieel: 0 // TODO: Get from actual financial data
    };

    const total_costs = Object.values(costs).reduce((sum, val) => sum + val, 0);
    const resultaat = revenue + opbrengst + total_costs;

    console.log('\n=== AGGREGATION RESULTS ===');
    console.log('Revenue (Netto-omzet):', revenue);
    console.log('Opbrengst vorderingen:', opbrengst);
    console.log('\nCosts:');
    console.log('  Kostprijs omzet:', costs.kostprijs);
    console.log('  Lasten personeel:', costs.personeel);
    console.log('  Overige bedrijfskosten:', costs.overige);
    console.log('  Afschrijvingen:', costs.afschrijvingen);
    console.log('  Financiële baten/lasten:', costs.financieel);
    console.log('\nTotal costs:', total_costs);
    console.log('Resultaat:', resultaat);

    // Show gl_accounts found
    const glAccounts = [...new Set(rawData.map(d => d.gl_account))];
    console.log('\n=== GL ACCOUNTS FOUND ===');
    glAccounts.sort().forEach(account => console.log('-', account));

    // Show categories found
    const categories = [...new Set(rawData.map(d => d.category))];
    console.log('\n=== CATEGORIES FOUND ===');
    categories.sort().forEach(cat => console.log('-', cat));

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

function sumByGlAccount(data, glAccount) {
  return data
    .filter(record => record.gl_account === glAccount)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}

testAggregationCalculations();

