import { supabase } from "@/integrations/supabase/client";

export interface PowerBIAggregatedRecord {
  location_id: string;
  year: number;
  month: number;
  netto_omzet: number;
  opbrengst_vorderingen: number;
  kostprijs_omzet: number;
  lasten_personeel: number;
  overige_bedrijfskosten: number;
  afschrijvingen: number;
  financiele_baten_lasten: number;
  total_costs: number;
  resultaat: number;
  import_id: string;
}

export interface PowerBIRawRecord {
  location_id: string;
  year: number;
  month: number;
  category: string;
  subcategory: string | null;
  gl_account: string;
  amount: number;
  import_id: string;
}

/**
 * Aggregates raw PowerBI P&L data into monthly totals
 */
export async function aggregatePowerBIData(
  locationId: string,
  year: number,
  month: number,
  importId: string
): Promise<PowerBIAggregatedRecord | null> {
  try {
    console.log(`[PowerBI Aggregator] Processing ${locationId} ${year}-${month}`);

    // Fetch raw data for the specific location, year, and month
    const { data: rawData, error: fetchError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year, month, category, subcategory, gl_account, amount, import_id')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);

    if (fetchError) {
      console.error('[PowerBI Aggregator] Fetch error:', fetchError);
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }

    if (!rawData || rawData.length === 0) {
      console.log(`[PowerBI Aggregator] No data found for ${locationId} ${year}-${month}`);
      return null;
    }

    console.log(`[PowerBI Aggregator] Found ${rawData.length} raw records`);

    // Aggregate by category
    const aggregated = aggregateByCategory(rawData);

    // Calculate totals
    const total_costs = Object.values(aggregated.costs).reduce((sum, val) => sum + val, 0);
    const resultaat = aggregated.revenue + aggregated.opbrengst + total_costs;

    // Use the import_id from the raw data or fall back to the provided one
    const rawImportId = rawData.length > 0 ? rawData[0].import_id : null;
    const finalImportId = rawImportId || importId;

    const result: PowerBIAggregatedRecord = {
      location_id: locationId,
      year,
      month,
      netto_omzet: aggregated.revenue,
      opbrengst_vorderingen: aggregated.opbrengst,
      kostprijs_omzet: aggregated.costs.kostprijs,
      lasten_personeel: aggregated.costs.personeel,
      overige_bedrijfskosten: aggregated.costs.overige,
      afschrijvingen: aggregated.costs.afschrijvingen,
      financiele_baten_lasten: aggregated.costs.financieel,
      total_costs,
      resultaat,
      import_id: finalImportId
    };

    console.log(`[PowerBI Aggregator] Aggregated result:`, {
      revenue: result.netto_omzet,
      overige_bedrijfskosten: result.overige_bedrijfskosten,
      total_costs: result.total_costs,
      resultaat: result.resultaat
    });

    return result;

  } catch (error) {
    console.error('[PowerBI Aggregator] Error:', error);
    throw error;
  }
}

/**
 * Aggregates raw data by gl_account (main categories)
 */
function aggregateByCategory(rawData: PowerBIRawRecord[]): {
  revenue: number;
  opbrengst: number;
  costs: {
    kostprijs: number;
    personeel: number;
    overige: number;
    afschrijvingen: number;
    financieel: number;
  };
} {
  // Get revenue and opbrengst from category
  const revenue = sumCategory(rawData, 'Netto-omzet uit leveringen geproduceerde goederen');
  const opbrengst = sumCategory(rawData, 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten');

  const costs = {
    kostprijs: sumCategory(rawData, 'Inkoopwaarde handelsgoederen'),
    personeel: sumCategory(rawData, 'Lonen en salarissen'),
    overige: sumCategory(rawData, 'Overige personeelsgerelateerde kosten'),
    afschrijvingen: sumCategory(rawData, 'Afschrijvingen op immateriële vaste activa'),
    financieel: sumCategory(rawData, 'Rentelasten en soortgelijke kosten')
  };

  return { revenue, opbrengst, costs };
}

/**
 * Sums amounts for a specific category
 */
function sumCategory(data: PowerBIRawRecord[], category: string): number {
  return data
    .filter(record => record.category === category)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}

/**
 * Sums amounts for a specific gl_account (main category)
 */
function sumByGlAccount(data: PowerBIRawRecord[], glAccount: string): number {
  return data
    .filter(record => record.gl_account === glAccount)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}

/**
 * Stores aggregated data in the database
 */
export async function storeAggregatedData(
  aggregatedData: PowerBIAggregatedRecord
): Promise<void> {
  try {
    const { error } = await supabase
      .from('powerbi_pnl_aggregated_data')
      .upsert(aggregatedData, {
        onConflict: 'location_id,year,month'
      });

    if (error) {
      console.error('[PowerBI Aggregator] Store error:', error);
      throw new Error(`Failed to store aggregated data: ${error.message}`);
    }

    console.log(`[PowerBI Aggregator] Stored aggregated data for ${aggregatedData.location_id} ${aggregatedData.year}-${aggregatedData.month}`);

  } catch (error) {
    console.error('[PowerBI Aggregator] Store error:', error);
    throw error;
  }
}

/**
 * Processes all available data for a location and year
 */
export async function processAllDataForLocation(
  locationId: string,
  year: number,
  importId: string
): Promise<{ processed: number; errors: string[] }> {
  try {
    console.log(`[PowerBI Aggregator] Processing all data for location ${locationId}, year ${year}`);

    // Get all available months for this location and year
    const { data: monthsData, error: monthsError } = await supabase
      .from('powerbi_pnl_data')
      .select('month')
      .eq('location_id', locationId)
      .eq('year', year);

    if (monthsError) {
      throw new Error(`Failed to fetch months: ${monthsError.message}`);
    }

    const months = [...new Set(monthsData.map(d => d.month))].sort();
    console.log(`[PowerBI Aggregator] Found months: ${months.join(', ')}`);

    let processed = 0;
    const errors: string[] = [];

    for (const month of months) {
      try {
        const aggregated = await aggregatePowerBIData(locationId, year, month, importId);
        if (aggregated) {
          await storeAggregatedData(aggregated);
          processed++;
        }
      } catch (error) {
        const errorMsg = `Failed to process ${locationId} ${year}-${month}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[PowerBI Aggregator]', errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`[PowerBI Aggregator] Completed: ${processed} months processed, ${errors.length} errors`);
    return { processed, errors };

  } catch (error) {
    console.error('[PowerBI Aggregator] Process all error:', error);
    throw error;
  }
}

/**
 * Processes all available data for all locations and years
 */
export async function processAllData(
  importId: string
): Promise<{ processed: number; errors: string[] }> {
  try {
    console.log('[PowerBI Aggregator] Processing all data');

    // Get all unique location/year combinations
    const { data: combinations, error: combinationsError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year')
      .order('location_id')
      .order('year');

    if (combinationsError) {
      throw new Error(`Failed to fetch combinations: ${combinationsError.message}`);
    }

    const uniqueCombinations = Array.from(
      new Set(combinations.map(c => `${c.location_id}-${c.year}`))
    ).map(combo => {
      const [location_id, year] = combo.split('-');
      return { location_id, year: parseInt(year) };
    });

    console.log(`[PowerBI Aggregator] Found ${uniqueCombinations.length} location/year combinations`);

    let totalProcessed = 0;
    const allErrors: string[] = [];

    for (const combo of uniqueCombinations) {
      try {
        const result = await processAllDataForLocation(combo.location_id, combo.year, importId);
        totalProcessed += result.processed;
        allErrors.push(...result.errors);
      } catch (error) {
        const errorMsg = `Failed to process ${combo.location_id} ${combo.year}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[PowerBI Aggregator]', errorMsg);
        allErrors.push(errorMsg);
      }
    }

    console.log(`[PowerBI Aggregator] All data processing completed: ${totalProcessed} months processed, ${allErrors.length} errors`);
    return { processed: totalProcessed, errors: allErrors };

  } catch (error) {
    console.error('[PowerBI Aggregator] Process all error:', error);
    throw error;
  }
}
