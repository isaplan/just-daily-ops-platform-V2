import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-test-aggregation] Testing aggregation calculations');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || '550e8400-e29b-41d4-a716-446655440001';
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '1');

    // Fetch raw data
    const supabase = await createClient();
    const { data: rawData, error: fetchError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year, month, category, subcategory, gl_account, amount, import_id')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);

    if (fetchError) {
      console.error('[API /finance/pnl-test-aggregation] Fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 });
    }

    console.log(`[API /finance/pnl-test-aggregation] Found ${rawData.length} raw records`);

        // Test aggregation logic using COMPLETE category mapping
        const revenue = 
          sumByCategory(rawData, 'Netto-omzet uit leveringen geproduceerde goederen') +
          sumByCategory(rawData, 'Netto-omzet uit verkoop van handelsgoederen') +
          sumByCategory(rawData, 'Netto-omzet groepen');
        
        const opbrengst = sumByCategory(rawData, 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten');
        
        const costs = {
          kostprijs: sumByCategory(rawData, 'Inkoopwaarde handelsgoederen'),
          personeel: 
            sumByCategory(rawData, 'Lonen en salarissen') +
            sumByCategory(rawData, 'Overige lasten uit hoofde van personeelsbeloningen') +
            sumByCategory(rawData, 'Overige personeelsgerelateerde kosten') +
            sumByCategory(rawData, 'Pensioenlasten') +
            sumByCategory(rawData, 'Sociale lasten') +
            sumByCategory(rawData, 'Werkkostenregeling - detail'),
          overige: 
            sumByCategory(rawData, 'Accountants- en advieskosten') +
            sumByCategory(rawData, 'Administratieve lasten') +
            sumByCategory(rawData, 'Andere kosten') +
            sumByCategory(rawData, 'Assurantiekosten') +
            sumByCategory(rawData, 'Autokosten') +
            sumByCategory(rawData, 'Exploitatie- en machinekosten') +
            sumByCategory(rawData, 'Huisvestingskosten') +
            sumByCategory(rawData, 'Kantoorkosten') +
            sumByCategory(rawData, 'Verkoop gerelateerde kosten'),
          afschrijvingen: 
            sumByCategory(rawData, 'Afschrijvingen op immateriële vaste activa') +
            sumByCategory(rawData, 'Afschrijvingen op materiële vaste activa'),
          financieel: 
            sumByCategory(rawData, 'Rentelasten en soortgelijke kosten') +
            sumByCategory(rawData, 'Rentebaten en soortgelijke opbrengsten') +
            sumByCategory(rawData, 'Rente belastingen')
        };

    const total_costs = Object.values(costs).reduce((sum, val) => sum + val, 0);
    // Note: costs are already negative in the database, so we add them instead of subtracting
    const resultaat = revenue + opbrengst + total_costs;

    // Get unique gl_accounts and categories
    const glAccounts = [...new Set(rawData.map(d => d.gl_account))];
    const categories = [...new Set(rawData.map(d => d.category))];

    const result = {
      success: true,
      locationId,
      year,
      month,
      recordCount: rawData.length,
      calculations: {
        revenue,
        opbrengst,
        costs,
        total_costs,
        resultaat
      },
      glAccounts: glAccounts.sort(),
      categories: categories.sort()
    };

    console.log('[API /finance/pnl-test-aggregation] Aggregation results:', result.calculations);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API /finance/pnl-test-aggregation] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function sumByCategory(data: any[], category: string): number {
  return data
    .filter(record => record.category === category)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}

function sumByGlAccount(data: any[], glAccount: string): number {
  return data
    .filter(record => record.gl_account === glAccount)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}
