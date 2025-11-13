/**
 * Test revenue calculation to see why it's 2x too high
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const VAN_KINSBERGEN_ID = '550e8400-e29b-41d4-a716-446655440001';
const YEAR = 2025;
const MONTH = 1;
const EXPECTED_REVENUE = 141481;

async function testRevenue() {
  // Fetch ALL data with pagination
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .eq('location_id', VAN_KINSBERGEN_ID)
      .eq('year', YEAR)
      .eq('month', MONTH)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  console.log(`\n=== Testing Revenue Calculation ===\n`);
  console.log(`Total records: ${allData.length}`);
  console.log(`Expected revenue: ${EXPECTED_REVENUE.toLocaleString('nl-NL')} €\n`);

  // Check if we have detailed categories
  const hasDetailedLeveringen = allData.some(d => 
    d.category === 'Netto-omzet uit leveringen geproduceerde goederen' && (d.amount || 0) > 0
  );
  const hasDetailedHandelsgoederen = allData.some(d => 
    d.category === 'Netto-omzet uit verkoop van handelsgoederen' && (d.amount || 0) > 0
  );

  console.log(`Has detailed leveringen: ${hasDetailedLeveringen}`);
  console.log(`Has detailed handelsgoederen: ${hasDetailedHandelsgoederen}\n`);

  // Deduplicate function (same as in aggregation service)
  function sumBySubcategories(data, subcategories, excludeParent = false) {
    const uniqueRecordKeys = new Set();
    let total = 0;
    
    const filtered = excludeParent 
      ? data.filter(d => d.category !== 'Netto-omzet groepen')
      : data;
    
    filtered.forEach(d => {
      let shouldInclude = false;
      
      if (d.subcategory && subcategories.includes(d.subcategory)) {
        shouldInclude = true;
      } else if (d.category && subcategories.includes(d.category)) {
        shouldInclude = true;
      }
      
      if (shouldInclude) {
        const uniqueKey = `${d.category}|${d.subcategory || ''}|${d.gl_account || ''}|${d.amount || 0}`;
        
        if (!uniqueRecordKeys.has(uniqueKey)) {
          uniqueRecordKeys.add(uniqueKey);
          total += (d.amount || 0);
        }
      }
    });
    
    return total;
  }

  const REVENUE_CATEGORIES = {
    netto_omzet_uit_levering: [
      'Netto-omzet uit leveringen geproduceerde goederen',
      'Omzet snacks (btw laag)',
      'Verkopen snacks (btw laag)',
      'Omzet lunch (btw laag)',
      'Omzet diner (btw laag)',
      'Omzet menu\'s (btw laag)',
      'Omzet keuken overig (btw laag)'
    ],
    netto_omzet_verkoop_handelsgoederen: [
      'Netto-omzet uit verkoop van handelsgoederen',
      'Omzet wijnen (btw hoog)',
      'Omzet gedestilleerd (btw hoog)',
      'Omzet cocktails (btw hoog)',
      'Omzet cider (btw hoog)',
      'Omzet hoog overig (btw hoog)',
      'Omzet hoog alcoholische warme dranken (btw hoog)',
      'Omzet speciaalbier fles (btw hoog)',
      'Omzet speciaalbier tap (btw hoog)',
      'Omzet tap pilsner (btw hoog)',
      'Omzet koffie / thee (btw laag)',
      'Verkopen koffie/thee(btw laag)',
      'Omzet frisdranken (btw laag)',
      'Omzet frisdtranken (btw laag)',
      'Omzet alcohol vrij (btw laag)',
      'Omzet alcohol virj (btw laag)',
      'Omzet laag overig (btw laag)',
      'Omzet non food (btw hoog)'
    ]
  };

  // Calculate revenue (same logic as aggregation service)
  let netto_omzet_uit_levering_geproduceerd = 0;
  let netto_omzet_verkoop_handelsgoederen = 0;

  if (hasDetailedLeveringen || hasDetailedHandelsgoederen) {
    netto_omzet_uit_levering_geproduceerd = sumBySubcategories(
      allData,
      REVENUE_CATEGORIES.netto_omzet_uit_levering,
      true // exclude parent
    );
    
    netto_omzet_verkoop_handelsgoederen = sumBySubcategories(
      allData,
      REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen,
      true // exclude parent
    );
  }

  const total_revenue = netto_omzet_uit_levering_geproduceerd + netto_omzet_verkoop_handelsgoederen;

  console.log('Calculation results:');
  console.log(`  Netto-omzet uit leveringen geproduceerde goederen: ${netto_omzet_uit_levering_geproduceerd.toLocaleString('nl-NL')} €`);
  console.log(`  Netto-omzet uit verkoop van handelsgoederen: ${netto_omzet_verkoop_handelsgoederen.toLocaleString('nl-NL')} €`);
  console.log(`  Total Revenue: ${total_revenue.toLocaleString('nl-NL')} €`);
  console.log(`  Expected: ${EXPECTED_REVENUE.toLocaleString('nl-NL')} €`);
  console.log(`  Difference: ${(total_revenue - EXPECTED_REVENUE).toLocaleString('nl-NL')} €`);
  console.log(`  Ratio: ${(total_revenue / EXPECTED_REVENUE).toFixed(2)}x\n`);

  // Check what categories are being counted
  const leveringenRecords = allData.filter(d => {
    const cat = d.category || '';
    const subcat = d.subcategory || '';
    return (cat === 'Netto-omzet uit leveringen geproduceerde goederen' || 
            REVENUE_CATEGORIES.netto_omzet_uit_levering.some(c => subcat.includes(c))) &&
           cat !== 'Netto-omzet groepen' &&
           (d.amount || 0) > 0;
  });

  const handelsgoederenRecords = allData.filter(d => {
    const cat = d.category || '';
    const subcat = d.subcategory || '';
    return (cat === 'Netto-omzet uit verkoop van handelsgoederen' || 
            REVENUE_CATEGORIES.netto_omzet_verkoop_handelsgoederen.some(c => subcat.includes(c))) &&
           cat !== 'Netto-omzet groepen' &&
           (d.amount || 0) > 0;
  });

  console.log(`Leveringen records: ${leveringenRecords.length}`);
  console.log(`Handelsgoederen records: ${handelsgoederenRecords.length}\n`);

  // Check for duplicates after deduplication
  const leveringenUnique = new Set();
  leveringenRecords.forEach(r => {
    const key = `${r.category}|${r.subcategory || ''}|${r.gl_account || ''}|${r.amount || 0}`;
    leveringenUnique.add(key);
  });

  const handelsgoederenUnique = new Set();
  handelsgoederenRecords.forEach(r => {
    const key = `${r.category}|${r.subcategory || ''}|${r.gl_account || ''}|${r.amount || 0}`;
    handelsgoederenUnique.add(key);
  });

  console.log(`Leveringen unique combinations: ${leveringenUnique.size} (from ${leveringenRecords.length} records)`);
  console.log(`Handelsgoederen unique combinations: ${handelsgoederenUnique.size} (from ${handelsgoederenRecords.length} records)`);
}

testRevenue().catch(console.error);



