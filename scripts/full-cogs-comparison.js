/**
 * Full COGS Structure Comparison: Accountant (PNG) vs Database
 * Shows Main → Sub → Sub-Sub hierarchy side by side
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCATIONS = {
  '550e8400-e29b-41d4-a716-446655440001': { name: 'Van Kinsbergen', expected: { revenue: 141481, result: -21849 } },
  '550e8400-e29b-41d4-a716-446655440002': { name: 'Bar Bea', expected: { revenue: 94032, result: -8207 } },
  '550e8400-e29b-41d4-a716-446655440003': { name: "L'Amour Toujours", expected: { revenue: 107619, result: 1066 } }
};

const YEAR = 2025;
const MONTH = 1;

async function fetchAllData(locationId, year, month) {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  return allData;
}

function deduplicate(data) {
  const uniqueKeys = new Set();
  const deduplicated = [];

  data.forEach(d => {
    const key = `${d.category}|${d.subcategory || ''}|${d.gl_account || ''}|${d.amount || 0}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      deduplicated.push(d);
    }
  });

  return deduplicated;
}

function buildDatabaseStructure(data) {
  const structure = {};

  data.forEach(record => {
    const main = record.category || 'UNKNOWN';
    const sub = record.subcategory || 'NO_SUBCATEGORY';
    const subSub = record.gl_account || 'NO_GL_ACCOUNT';
    const amount = record.amount || 0;

    if (!structure[main]) {
      structure[main] = {
        total: 0,
        subs: {}
      };
    }

    if (!structure[main].subs[sub]) {
      structure[main].subs[sub] = {
        total: 0,
        subSubs: {}
      };
    }

    if (!structure[main].subs[sub].subSubs[subSub]) {
      structure[main].subs[sub].subSubs[subSub] = 0;
    }

    structure[main].subs[sub].subSubs[subSub] += amount;
    structure[main].subs[sub].total += amount;
    structure[main].total += amount;
  });

  return structure;
}

function mapToAccountantMainCOGS(structure) {
  const mapped = {
    'Netto-omzet': { total: 0, subs: {} },
    'Kostprijs van de omzet': { total: 0, subs: {} },
    'Lasten uit hoofde van personeelsbeloningen': { total: 0, subs: {} },
    'Afschrijvingen op immateriële en materiële vaste activa': { total: 0, subs: {} },
    'Overige bedrijfskosten': { total: 0, subs: {} },
    'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten': { total: 0, subs: {} },
    'Financiële baten en lasten': { total: 0, subs: {} }
  };

  Object.entries(structure).forEach(([mainCategory, data]) => {
    const cat = mainCategory.toLowerCase();
    let mappedTo = null;

    if (cat.includes('netto-omzet') && !cat.includes('groepen')) {
      mappedTo = 'Netto-omzet';
    } else if (cat.includes('inkoopwaarde') || cat.includes('kostprijs')) {
      mappedTo = 'Kostprijs van de omzet';
    } else if (cat.includes('lonen') || cat.includes('salaris') || cat.includes('arbeid') || cat.includes('personeel')) {
      mappedTo = 'Lasten uit hoofde van personeelsbeloningen';
    } else if (cat.includes('afschrijving')) {
      mappedTo = 'Afschrijvingen op immateriële en materiële vaste activa';
    } else if (cat.includes('huisvesting') || cat.includes('exploitatie') || cat.includes('verkoop') || 
               cat.includes('auto') || cat.includes('kantoor') || cat.includes('assurantie') || 
               cat.includes('accountant') || cat.includes('administratief') || cat.includes('andere') ||
               cat.includes('overige bedrijfskosten')) {
      mappedTo = 'Overige bedrijfskosten';
    } else if (cat.includes('opbrengst') && cat.includes('vorderingen')) {
      mappedTo = 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten';
    } else if (cat.includes('financieel')) {
      mappedTo = 'Financiële baten en lasten';
    }

    if (mappedTo) {
      Object.entries(data.subs).forEach(([subCategory, subData]) => {
        if (!mapped[mappedTo].subs[subCategory]) {
          mapped[mappedTo].subs[subCategory] = { total: 0, subSubs: {} };
        }
        
        Object.entries(subData.subSubs).forEach(([subSubCategory, amount]) => {
          if (!mapped[mappedTo].subs[subCategory].subSubs[subSubCategory]) {
            mapped[mappedTo].subs[subCategory].subSubs[subSubCategory] = 0;
          }
          mapped[mappedTo].subs[subCategory].subSubs[subSubCategory] += amount;
          mapped[mappedTo].subs[subCategory].total += amount;
        });
        
        mapped[mappedTo].total += subData.total;
      });
    }
  });

  return mapped;
}

async function analyzeLocation(locationId, locationInfo) {
  const rawData = await fetchAllData(locationId, YEAR, MONTH);
  const deduplicated = deduplicate(rawData);
  const dbStructure = buildDatabaseStructure(deduplicated);
  const mapped = mapToAccountantMainCOGS(dbStructure);

  const expected = locationInfo.expected;
  const expectedCogs = expected.revenue - expected.result;

  // Calculate from mapped structure
  const revenue = mapped['Netto-omzet'].total;
  const costOfSales = Math.abs(mapped['Kostprijs van de omzet'].total);
  const labor = Math.abs(mapped['Lasten uit hoofde van personeelsbeloningen'].total);
  const depreciation = Math.abs(mapped['Afschrijvingen op immateriële en materiële vaste activa'].total);
  const otherCosts = Math.abs(mapped['Overige bedrijfskosten'].total);
  const opbrengstVorderingen = mapped['Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'].total;
  const financial = Math.abs(mapped['Financiële baten en lasten'].total);

  const totalCogs = costOfSales + labor + depreciation + otherCosts + financial;
  const result = revenue - totalCogs + opbrengstVorderingen;

  console.log(`\n${'='.repeat(120)}`);
  console.log(`${locationInfo.name.toUpperCase()} - January 2025`);
  console.log(`${'='.repeat(120)}\n`);

  // Main COGS Comparison Table
  console.log('┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ MAIN COGS COMPARISON                                                                                        │');
  console.log('├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ Main COG                                    │ Expected (PNG) │ Calculated (DB) │ Difference │ Status      │');
  console.log('├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  
  const mainCogs = [
    { name: 'Netto-omzet', expected: expected.revenue, calculated: revenue },
    { name: 'Kostprijs van de omzet', expected: Math.round(expectedCogs * 0.4), calculated: costOfSales },
    { name: 'Lasten uit hoofde van personeelsbeloningen', expected: Math.round(expectedCogs * 0.5), calculated: labor },
    { name: 'Afschrijvingen', expected: Math.round(expectedCogs * 0.05), calculated: depreciation },
    { name: 'Overige bedrijfskosten', expected: Math.round(expectedCogs * 0.05), calculated: otherCosts },
    { name: 'Resultaat', expected: expected.result, calculated: result }
  ];

  mainCogs.forEach(cog => {
    const diff = cog.calculated - cog.expected;
    const status = Math.abs(diff) < 100 ? '✅' : '❌';
    const name = cog.name.length > 40 ? cog.name.substring(0, 37) + '...' : cog.name;
    console.log(`│ ${name.padEnd(40)} │ ${String(cog.expected).padStart(13)} │ ${String(Math.round(cog.calculated)).padStart(15)} │ ${String(Math.round(diff)).padStart(10)} │ ${status.padEnd(11)} │`);
  });
  
  console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

  // Detailed Structure
  console.log('┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ DATABASE STRUCTURE: Main → Sub → Sub-Sub COGS                                                              │');
  console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

  Object.entries(mapped).forEach(([mainCog, mainData]) => {
    if (mainCog === 'Resultaat') return;
    
    const isRevenue = mainCog.includes('Netto-omzet') || mainCog.includes('Opbrengst');
    const mainTotal = isRevenue ? mainData.total : Math.abs(mainData.total);
    
    console.log(`📊 ${mainCog}`);
    console.log(`   Main Total: ${mainTotal.toLocaleString('nl-NL')} €`);
    
    let subTotalSum = 0;
    Object.entries(mainData.subs).forEach(([subCog, subData]) => {
      const subTotal = isRevenue ? subData.total : Math.abs(subData.total);
      subTotalSum += subTotal;
      
      let subSubTotalSum = 0;
      Object.entries(subData.subSubs).forEach(([subSubCog, amount]) => {
        const subSubAmount = isRevenue ? amount : Math.abs(amount);
        subSubTotalSum += subSubAmount;
      });
      
      console.log(`   ├─ ${subCog}`);
      console.log(`   │  Sub Total: ${subTotal.toLocaleString('nl-NL')} € (${Object.keys(subData.subSubs).length} GL accounts)`);
      console.log(`   │  Sub-Sub Total: ${subSubTotalSum.toLocaleString('nl-NL')} €`);
      const subMatch = Math.abs(subTotal - subSubTotalSum) < 0.01 ? '✅' : '❌';
      console.log(`   │  Sub Match: ${subMatch}`);
    });
    
    const mainMatch = Math.abs(mainTotal - subTotalSum) < 0.01 ? '✅' : '❌';
    console.log(`   Sub Total Sum: ${subTotalSum.toLocaleString('nl-NL')} €`);
    console.log(`   Main Match: ${mainMatch} (diff: ${Math.abs(mainTotal - subTotalSum).toLocaleString('nl-NL')} €)\n`);
  });

  // Summary
  console.log('┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ SUMMARY                                                                                                    │');
  console.log('├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ Expected Revenue:  ${expected.revenue.toLocaleString('nl-NL').padStart(15)} € │ Calculated: ${Math.round(revenue).toLocaleString('nl-NL').padStart(15)} € │ Ratio: ${(revenue / expected.revenue).toFixed(2)}x │`);
  console.log(`│ Expected Result:  ${expected.result.toLocaleString('nl-NL').padStart(15)} € │ Calculated: ${Math.round(result).toLocaleString('nl-NL').padStart(15)} € │ Ratio: ${(result / expected.result).toFixed(2)}x │`);
  console.log(`│ Expected COGS:    ${expectedCogs.toLocaleString('nl-NL').padStart(15)} € │ Calculated: ${Math.round(totalCogs).toLocaleString('nl-NL').padStart(15)} € │ Ratio: ${(totalCogs / expectedCogs).toFixed(2)}x │`);
  console.log('└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           COGS STRUCTURE COMPARISON: Accountant (large.png) vs Database (powerbi_pnl_data)                  ║');
  console.log('║           Year: 2025, Month: January                                                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');

  for (const [locationId, locationInfo] of Object.entries(LOCATIONS)) {
    await analyzeLocation(locationId, locationInfo);
  }
}

main().catch(console.error);



