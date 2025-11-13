import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * Diagnostic API to check raw data and calculations
 * Shows actual vs expected results for Van Kinsbergen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') || '550e8400-e29b-41d4-a716-446655440001'; // Van Kinsbergen
    const year = parseInt(searchParams.get('year') || '2025');

    const supabase = await createClient();

    // Expected results from accountant (from large.png)
    const expectedResults: Record<number, { revenue: number; result: number }> = {
      1: { revenue: 141481, result: -21849 },
      2: { revenue: 127765, result: -15759 },
      3: { revenue: 172610, result: -39542 },
      4: { revenue: 183713, result: 17157 },
      5: { revenue: 185092, result: -4614 },
      6: { revenue: 173132, result: -16161 },
      7: { revenue: 188347, result: 11091 },
      8: { revenue: 171269, result: -3017 },
      9: { revenue: 138042, result: -11215 }
    };

    const diagnostics: any[] = [];

    for (let month = 1; month <= 9; month++) {
      const expected = expectedResults[month];
      if (!expected) continue;

      // Fetch raw data
      const { data: rawData, error: rawError } = await supabase
        .from('powerbi_pnl_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('year', year)
        .eq('month', month);

      if (rawError) {
        diagnostics.push({
          month,
          error: `Failed to fetch raw data: ${rawError.message}`
        });
        continue;
      }

      // Fetch aggregated data
      const { data: aggregatedData, error: aggError } = await supabase
        .from('powerbi_pnl_aggregated')
        .select('*')
        .eq('location_id', locationId)
        .eq('year', year)
        .eq('month', month)
        .single();

      // Calculate from raw data
      let calculatedRevenue = 0;
      let calculatedCosts = 0;
      const revenueRecords: any[] = [];
      const costRecords: any[] = [];

      rawData?.forEach(record => {
        const amount = record.amount || 0;
        const category = (record.category || '').toLowerCase();
        
        // Revenue categories (positive amounts)
        if (category.includes('netto-omzet') || 
            category.includes('omzet') && amount > 0 ||
            category.includes('opbrengst') && amount > 0) {
          calculatedRevenue += amount;
          revenueRecords.push({
            category: record.category,
            subcategory: record.subcategory,
            gl_account: record.gl_account,
            amount
          });
        } 
        // Cost categories (negative amounts)
        else if (amount < 0 || 
                 category.includes('inkoop') ||
                 category.includes('kostprijs') ||
                 category.includes('lonen') ||
                 category.includes('salaris') ||
                 category.includes('arbeid') ||
                 category.includes('personeel') ||
                 category.includes('huisvesting') ||
                 category.includes('exploitatie') ||
                 category.includes('verkoop') ||
                 category.includes('auto') ||
                 category.includes('kantoor') ||
                 category.includes('assurantie') ||
                 category.includes('accountant') ||
                 category.includes('administratief') ||
                 category.includes('andere') ||
                 category.includes('afschrijving') ||
                 category.includes('financieel') ||
                 category.includes('overige bedrijfskosten')) {
          calculatedCosts += amount; // Keep negative
          costRecords.push({
            category: record.category,
            subcategory: record.subcategory,
            gl_account: record.gl_account,
            amount
          });
        }
        // Special case: opbrengst_vorderingen (positive revenue)
        else if (category.includes('opbrengst van vorderingen')) {
          calculatedRevenue += amount;
          revenueRecords.push({
            category: record.category,
            subcategory: record.subcategory,
            gl_account: record.gl_account,
            amount
          });
        }
      });

      // Calculate result: Revenue + Costs (costs are negative, so this is Revenue - |Costs|)
      const calculatedResult = calculatedRevenue + calculatedCosts;

      // Expected COGS = Revenue - Result
      const expectedCogs = expected.revenue - expected.result;

      diagnostics.push({
        month,
        expected: {
          revenue: expected.revenue,
          result: expected.result,
          cogs: expectedCogs
        },
        calculated: {
          revenue: calculatedRevenue,
          costs: calculatedCosts,
          result: calculatedResult,
          cogs: calculatedRevenue - calculatedResult
        },
        aggregated: aggregatedData ? {
          revenue: aggregatedData.revenue_total || aggregatedData.total_revenue || 0,
          result: aggregatedData.resultaat || 0,
          cost_of_sales: aggregatedData.cost_of_sales_total || aggregatedData.inkoopwaarde_handelsgoederen || 0,
          labor: aggregatedData.labor_total || aggregatedData.lonen_en_salarissen || 0,
          other_costs: aggregatedData.other_costs_total || aggregatedData.overige_bedrijfskosten || 0
        } : null,
        differences: {
          revenue: calculatedRevenue - expected.revenue,
          result: calculatedResult - expected.result,
          cogs: (calculatedRevenue - calculatedResult) - expectedCogs
        },
        rawDataCount: rawData?.length || 0,
        revenueRecordCount: revenueRecords.length,
        costRecordCount: costRecords.length,
        sampleRevenueRecords: revenueRecords.slice(0, 5),
        sampleCostRecords: costRecords.slice(0, 5)
      });
    }

    return NextResponse.json({
      success: true,
      locationId,
      year,
      diagnostics,
      summary: {
        totalMonths: diagnostics.length,
        monthsWithData: diagnostics.filter(d => d.rawDataCount > 0).length,
        averageRevenueDifference: diagnostics.reduce((sum, d) => sum + Math.abs(d.differences.revenue), 0) / diagnostics.length,
        averageResultDifference: diagnostics.reduce((sum, d) => sum + Math.abs(d.differences.result), 0) / diagnostics.length
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-balance/diagnose] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



