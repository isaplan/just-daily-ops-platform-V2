import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Compare Accountant's COGS vs Calculated COGS
 * 
 * This endpoint compares the expected COGS structure (from accountant)
 * with the calculated COGS from our aggregation service.
 * 
 * Expected COGS structure (from accountant):
 * 1. Netto-omzet (Revenue)
 * 2. Kostprijs van de omzet (Cost of Sales)
 * 3. Lasten uit hoofde van personeelsbeloningen (Labor Costs)
 * 4. Afschrijvingen op immateriële en materiële vaste activa (Depreciation)
 * 5. Overige bedrijfskosten (Other Operating Costs)
 * 6. Opbrengst van vorderingen (Revenue from Receivables)
 * 7. Financiële baten en lasten (Financial Income/Expenses)
 * 8. Resultaat (Net Result)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') || '550e8400-e29b-41d4-a716-446655440001'; // Van Kinsbergen default
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '9'); // September default

    const supabase = await createClient();

    // Fetch aggregated data (our calculated values)
    const { data: aggregatedData, error: aggError } = await supabase
      .from('powerbi_pnl_aggregated')
      .select('*')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (aggError && aggError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch aggregated data: ${aggError.message}`
      }, { status: 500 });
    }

    // Fetch raw data to calculate expected values
    const { data: rawData, error: rawError } = await supabase
      .from('powerbi_pnl_data')
      .select('*')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);

    if (rawError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch raw data: ${rawError.message}`
      }, { status: 500 });
    }

    // Define accountant's expected COGS structure
    const accountantStructure = {
      // 1. Netto-omzet (Revenue)
      netto_omzet: {
        label: 'Netto-omzet',
        expectedCategories: [
          'Netto-omzet uit leveringen geproduceerde goederen',
          'Netto-omzet uit verkoop van handelsgoederen',
          'Netto-omzet groepen'
        ],
        calculated: aggregatedData?.revenue_total || 0,
        fromRaw: 0
      },
      
      // 2. Kostprijs van de omzet (Cost of Sales)
      kostprijs_van_de_omzet: {
        label: 'Kostprijs van de omzet',
        expectedCategories: [
          'Inkoopwaarde handelsgoederen',
          'Kostprijs van de omzet'
        ],
        calculated: aggregatedData?.cost_of_sales_total || aggregatedData?.inkoopwaarde_handelsgoederen || 0,
        fromRaw: 0
      },
      
      // 3. Lasten uit hoofde van personeelsbeloningen (Labor Costs)
      lasten_personeelsbeloningen: {
        label: 'Lasten uit hoofde van personeelsbeloningen',
        expectedCategories: [
          'Lonen en salarissen',
          'Lasten uit hoofde van personeelsbeloningen',
          'Arbeidskosten'
        ],
        calculated: aggregatedData?.labor_total || aggregatedData?.lonen_en_salarissen || 0,
        fromRaw: 0
      },
      
      // 4. Afschrijvingen op immateriële en materiële vaste activa (Depreciation)
      afschrijvingen: {
        label: 'Afschrijvingen op immateriële en materiële vaste activa',
        expectedCategories: [
          'Afschrijvingen op immateriële en materiële vaste activa',
          'Afschrijvingen op immateriële vaste activa',
          'Afschrijvingen op materiële vaste activa',
          'Afschrijvingen'
        ],
        calculated: aggregatedData?.afschrijvingen || 0,
        fromRaw: 0
      },
      
      // 5. Overige bedrijfskosten (Other Operating Costs)
      overige_bedrijfskosten: {
        label: 'Overige bedrijfskosten',
        expectedCategories: [
          'Overige bedrijfskosten',
          'Huisvestingskosten',
          'Exploitatie- en machinekosten',
          'Verkoop gerelateerde kosten',
          'Autokosten',
          'Kantoorkosten',
          'Assurantiekosten',
          'Accountants- en advieskosten',
          'Administratieve lasten',
          'Andere kosten'
        ],
        calculated: aggregatedData?.other_costs_total || aggregatedData?.overige_bedrijfskosten || 0,
        fromRaw: 0
      },
      
      // 6. Opbrengst van vorderingen (Revenue from Receivables)
      opbrengst_vorderingen: {
        label: 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten',
        expectedCategories: [
          'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
        ],
        calculated: aggregatedData?.opbrengst_vorderingen || 0,
        fromRaw: 0
      },
      
      // 7. Financiële baten en lasten (Financial Income/Expenses)
      financiele_baten_lasten: {
        label: 'Financiële baten en lasten',
        expectedCategories: [
          'Financiële baten en lasten'
        ],
        calculated: aggregatedData?.financiele_baten_lasten || 0,
        fromRaw: 0
      },
      
      // 8. Resultaat (Net Result)
      resultaat: {
        label: 'Resultaat',
        calculated: aggregatedData?.resultaat || 0,
        fromRaw: 0,
        isCalculated: true // This is calculated, not directly from raw data
      }
    };

    // Calculate fromRaw values by summing raw data matching expected categories
    if (rawData && rawData.length > 0) {
      Object.keys(accountantStructure).forEach((key) => {
        const structure = accountantStructure[key as keyof typeof accountantStructure];
        if (structure.isCalculated) return; // Skip calculated fields
        
        // Sum amounts from raw data matching expected categories
        const matchingRecords = rawData.filter(record => {
          const categoryMatch = structure.expectedCategories.some(cat => 
            record.category === cat || record.subcategory === cat
          );
          return categoryMatch;
        });
        
        // Sum amounts (note: costs are negative in raw data)
        structure.fromRaw = matchingRecords.reduce((sum, record) => {
          // For costs, amounts are already negative, so we sum them
          // For revenue, amounts are positive, so we sum them
          return sum + (record.amount || 0);
        }, 0);
      });
      
      // Calculate resultaat from raw data
      accountantStructure.resultaat.fromRaw = 
        accountantStructure.netto_omzet.fromRaw +
        accountantStructure.kostprijs_van_de_omzet.fromRaw +
        accountantStructure.lasten_personeelsbeloningen.fromRaw +
        accountantStructure.afschrijvingen.fromRaw +
        accountantStructure.overige_bedrijfskosten.fromRaw +
        accountantStructure.opbrengst_vorderingen.fromRaw +
        accountantStructure.financiele_baten_lasten.fromRaw;
    }

    // Calculate differences
    const comparison = Object.entries(accountantStructure).map(([key, structure]) => {
      const difference = structure.calculated - structure.fromRaw;
      const percentageDiff = structure.fromRaw !== 0 
        ? (difference / Math.abs(structure.fromRaw)) * 100 
        : 0;
      
      return {
        key,
        label: structure.label,
        accountantValue: structure.fromRaw,
        calculatedValue: structure.calculated,
        difference,
        percentageDifference: percentageDiff,
        isMatch: Math.abs(difference) < 0.01, // Consider match if difference < 1 cent
        expectedCategories: structure.expectedCategories || []
      };
    });

    return NextResponse.json({
      success: true,
      locationId,
      year,
      month,
      comparison,
      summary: {
        totalCategories: comparison.length,
        matchingCategories: comparison.filter(c => c.isMatch).length,
        categoriesWithDifferences: comparison.filter(c => !c.isMatch).length,
        totalDifference: comparison.reduce((sum, c) => sum + Math.abs(c.difference), 0)
      },
      rawDataCount: rawData?.length || 0,
      hasAggregatedData: !!aggregatedData
    });

  } catch (error) {
    console.error('[API /finance/pnl-balance/compare-cogs] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



