const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAggregationLogic() {
  try {
    console.log('Testing aggregation logic...');
    
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

    // Test aggregation logic
    const revenue = sumCategory(rawData, 'Netto-omzet');
    const opbrengst = sumCategory(rawData, 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten');
    
    const costs = {
      kostprijs: sumCategory(rawData, 'Kostprijs van de omzet'),
      personeel: sumCategory(rawData, 'Lasten uit hoofde van personeelsbeloningen'),
      overige: sumCategory(rawData, 'Overige bedrijfskosten'),
      afschrijvingen: sumCategory(rawData, 'Afschrijvingen op immateriële en materiële vaste activa'),
      financieel: sumCategory(rawData, 'Financiële baten en lasten')
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

    // Show categories found
    const categories = [...new Set(rawData.map(d => d.category))];
    console.log('\n=== CATEGORIES FOUND ===');
    categories.sort().forEach(cat => console.log('-', cat));

    // Check for specific categories
    console.log('\n=== SPECIFIC CHECKS ===');
    console.log('Has "Overige bedrijfskosten":', categories.includes('Overige bedrijfskosten'));
    console.log('Has "Netto-omzet":', categories.includes('Netto-omzet'));
    console.log('Has "Kostprijs van de omzet":', categories.includes('Kostprijs van de omzet'));

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

function sumCategory(data, category) {
  return data
    .filter(record => record.category === category)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}

testAggregationLogic();

