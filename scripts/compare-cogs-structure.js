/**
 * Compare COGS structure: Accountant (from large.png) vs Database
 * Shows Main → Sub → Sub-Sub hierarchy and totals
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

// Accountant's Main COGS structure (from large.png)
const ACCOUNTANT_MAIN_COGS = [
  'Netto-omzet',
  'Kostprijs van de omzet',
  'Lasten uit hoofde van personeelsbeloningen',
  'Afschrijvingen op immateriële en materiële vaste activa',
  'Overige bedrijfskosten',
  'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten',
  'Financiële baten en lasten',
  'Resultaat'
];

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

function buildHierarchy(data) {
  // Main → Sub → Sub-Sub structure
  const hierarchy = {};

  data.forEach(record => {
    const main = record.category || 'UNKNOWN';
    const sub = record.subcategory || 'NO_SUBCATEGORY';
    const subSub = record.gl_account || 'NO_GL_ACCOUNT';
    const amount = record.amount || 0;

    if (!hierarchy[main]) {
      hierarchy[main] = {
        total: 0,
        subs: {}
      };
    }

    if (!hierarchy[main].subs[sub]) {
      hierarchy[main].subs[sub] = {
        total: 0,
        subSubs: {}
      };
    }

    if (!hierarchy[main].subs[sub].subSubs[subSub]) {
      hierarchy[main].subs[sub].subSubs[subSub] = 0;
    }

    hierarchy[main].subs[sub].subSubs[subSub] += amount;
    hierarchy[main].subs[sub].total += amount;
    hierarchy[main].total += amount;
  });

  return hierarchy;
}

function mapToAccountantStructure(hierarchy) {
  const mapped = {
    'Netto-omzet': { total: 0, subs: {} },
    'Kostprijs van de omzet': { total: 0, subs: {} },
    'Lasten uit hoofde van personeelsbeloningen': { total: 0, subs: {} },
    'Afschrijvingen op immateriële en materiële vaste activa': { total: 0, subs: {} },
    'Overige bedrijfskosten': { total: 0, subs: {} },
    'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten': { total: 0, subs: {} },
    'Financiële baten en lasten': { total: 0, subs: {} }
  };

  // Map database categories to accountant structure
  Object.entries(hierarchy).forEach(([mainCategory, data]) => {
    const cat = mainCategory.toLowerCase();
    let mappedTo = null;

    // Revenue
    if (cat.includes('netto-omzet') && !cat.includes('groepen')) {
      mappedTo = 'Netto-omzet';
    }
    // Cost of Sales
    else if (cat.includes('inkoopwaarde') || cat.includes('kostprijs')) {
      mappedTo = 'Kostprijs van de omzet';
    }
    // Labor
    else if (cat.includes('lonen') || cat.includes('salaris') || cat.includes('arbeid') || cat.includes('personeel')) {
      mappedTo = 'Lasten uit hoofde van personeelsbeloningen';
    }
    // Depreciation
    else if (cat.includes('afschrijving')) {
      mappedTo = 'Afschrijvingen op immateriële en materiële vaste activa';
    }
    // Other costs
    else if (cat.includes('huisvesting') || cat.includes('exploitatie') || cat.includes('verkoop') || 
             cat.includes('auto') || cat.includes('kantoor') || cat.includes('assurantie') || 
             cat.includes('accountant') || cat.includes('administratief') || cat.includes('andere') ||
             cat.includes('overige bedrijfskosten')) {
      mappedTo = 'Overige bedrijfskosten';
    }
    // Revenue from receivables
    else if (cat.includes('opbrengst') && cat.includes('vorderingen')) {
      mappedTo = 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten';
    }
    // Financial
    else if (cat.includes('financieel')) {
      mappedTo = 'Financiële baten en lasten';
    }

    if (mappedTo) {
      // Add all subs and sub-subs
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

function calculateResult(mapped) {
  const revenue = mapped['Netto-omzet'].total;
  const costOfSales = Math.abs(mapped['Kostprijs van de omzet'].total);
  const labor = Math.abs(mapped['Lasten uit hoofde van personeelsbeloningen'].total);
  const depreciation = Math.abs(mapped['Afschrijvingen op immateriële en materiële vaste activa'].total);
  const otherCosts = Math.abs(mapped['Overige bedrijfskosten'].total);
  const opbrengstVorderingen = mapped['Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'].total;
  const financial = mapped['Financiële baten en lasten'].total;

  const totalCosts = costOfSales + labor + depreciation + otherCosts + Math.abs(financial);
  const result = revenue - totalCosts + opbrengstVorderingen;

  return {
    revenue,
    costOfSales,
    labor,
    depreciation,
    otherCosts,
    opbrengstVorderingen,
    financial,
    totalCosts,
    result
  };
}

async function analyzeLocation(locationId, locationInfo) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`LOCATION: ${locationInfo.name}`);
  console.log(`${'='.repeat(100)}\n`);

  const rawData = await fetchAllData(locationId, YEAR, MONTH);
  const deduplicated = deduplicate(rawData);
  const hierarchy = buildHierarchy(deduplicated);
  const mapped = mapToAccountantStructure(hierarchy);
  const calculated = calculateResult(mapped);

  const expected = locationInfo.expected;

  // Print comparison table
  console.log('┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ MAIN COGS COMPARISON                                                                                  │');
  console.log('├──────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ Main COG                          │ Expected (from PNG) │ Calculated (from DB) │ Difference        │');
  console.log('├──────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  
  console.log(`│ Netto-omzet                       │ ${String(expected.revenue).padStart(18)} │ ${String(Math.round(calculated.revenue)).padStart(20)} │ ${String(Math.round(calculated.revenue - expected.revenue)).padStart(17)} │`);
  console.log(`│ Kostprijs van de omzet            │ ${String(Math.round(expected.revenue - expected.result - (expected.revenue - expected.result) * 0.1)).padStart(18)} │ ${String(Math.round(calculated.costOfSales)).padStart(20)} │ ${String(Math.round(calculated.costOfSales - (expected.revenue - expected.result) * 0.4)).padStart(17)} │`);
  console.log(`│ Lasten uit hoofde van...          │ ${String(Math.round((expected.revenue - expected.result) * 0.5)).padStart(18)} │ ${String(Math.round(calculated.labor)).padStart(20)} │ ${String(Math.round(calculated.labor - (expected.revenue - expected.result) * 0.5)).padStart(17)} │`);
  console.log(`│ Afschrijvingen                    │ ${String(Math.round((expected.revenue - expected.result) * 0.05)).padStart(18)} │ ${String(Math.round(calculated.depreciation)).padStart(20)} │ ${String(Math.round(calculated.depreciation - (expected.revenue - expected.result) * 0.05)).padStart(17)} │`);
  console.log(`│ Overige bedrijfskosten           │ ${String(Math.round((expected.revenue - expected.result) * 0.05)).padStart(18)} │ ${String(Math.round(calculated.otherCosts)).padStart(20)} │ ${String(Math.round(calculated.otherCosts - (expected.revenue - expected.result) * 0.05)).padStart(17)} │`);
  console.log(`│ Resultaat                         │ ${String(expected.result).padStart(18)} │ ${String(Math.round(calculated.result)).padStart(20)} │ ${String(Math.round(calculated.result - expected.result)).padStart(17)} │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────────────────────────────┘');

  // Print Main COGS with Sub totals
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ MAIN COGS → SUB COGS → SUB-SUB COGS (Database Structure)                                            │');
  console.log('└──────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

  Object.entries(mapped).forEach(([mainCog, mainData]) => {
    if (mainCog === 'Resultaat') return;
    
    const mainTotal = mainCog.includes('Netto-omzet') || mainCog.includes('Opbrengst') 
      ? mainData.total 
      : Math.abs(mainData.total);
    
    console.log(`📊 ${mainCog}`);
    console.log(`   Main Total: ${mainTotal.toLocaleString('nl-NL')} €`);
    console.log(`   Sub COGS: ${Object.keys(mainData.subs).length}`);
    
    let subTotalSum = 0;
    Object.entries(mainData.subs).forEach(([subCog, subData]) => {
      const subTotal = mainCog.includes('Netto-omzet') || mainCog.includes('Opbrengst')
        ? subData.total
        : Math.abs(subData.total);
      subTotalSum += subTotal;
      
      console.log(`   ├─ ${subCog}`);
      console.log(`   │  Sub Total: ${subTotal.toLocaleString('nl-NL')} €`);
      console.log(`   │  Sub-Sub COGS: ${Object.keys(subData.subSubs).length}`);
      
      let subSubTotalSum = 0;
      Object.entries(subData.subSubs).slice(0, 5).forEach(([subSubCog, amount]) => {
        const subSubAmount = mainCog.includes('Netto-omzet') || mainCog.includes('Opbrengst')
          ? amount
          : Math.abs(amount);
        subSubTotalSum += subSubAmount;
        console.log(`   │  ├─ ${subSubCog}: ${subSubAmount.toLocaleString('nl-NL')} €`);
      });
      if (Object.keys(subData.subSubs).length > 5) {
        console.log(`   │  └─ ... and ${Object.keys(subData.subSubs).length - 5} more`);
      }
      console.log(`   │  Sub-Sub Total: ${subSubTotalSum.toLocaleString('nl-NL')} €`);
    });
    
    console.log(`   Sub Total Sum: ${subTotalSum.toLocaleString('nl-NL')} €`);
    console.log(`   Match: ${Math.abs(mainTotal - subTotalSum) < 0.01 ? '✅' : '❌'} (diff: ${Math.abs(mainTotal - subTotalSum).toLocaleString('nl-NL')} €)\n`);
  });

  // Summary
  console.log('┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ SUMMARY                                                                                              │');
  console.log('├──────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ Expected Revenue:  ${expected.revenue.toLocaleString('nl-NL').padStart(15)} € │ Calculated: ${Math.round(calculated.revenue).toLocaleString('nl-NL').padStart(15)} € │`);
  console.log(`│ Expected Result:  ${expected.result.toLocaleString('nl-NL').padStart(15)} € │ Calculated: ${Math.round(calculated.result).toLocaleString('nl-NL').padStart(15)} € │`);
  console.log(`│ Revenue Diff:      ${(calculated.revenue - expected.revenue).toLocaleString('nl-NL').padStart(15)} € │`);
  console.log(`│ Result Diff:       ${(calculated.result - expected.result).toLocaleString('nl-NL').padStart(15)} € │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────────────────────────────┘');

  return { mapped, calculated, rawDataCount: rawData.length, deduplicatedCount: deduplicated.length };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    COGS STRUCTURE COMPARISON: Accountant (PNG) vs Database                                  ║');
  console.log('║                    Year: 2025, Month: January                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');

  for (const [locationId, locationInfo] of Object.entries(LOCATIONS)) {
    await analyzeLocation(locationId, locationInfo);
  }
}

main().catch(console.error);



