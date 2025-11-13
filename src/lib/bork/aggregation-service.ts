import { createClient } from '@/integrations/supabase/server';

export interface AggregatedSalesData {
  id?: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  unique_products: number;
  top_category: string | null;
  category_breakdown: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface RawSalesRecord {
  id: string;
  location_id: string;
  date: string;
  product_name: string;
  category: string | null;
  quantity: number;
  price: number;
  revenue: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregates raw bork_sales_data into bork_sales_aggregated by date and location
 */
export async function aggregateSalesData(
  locationId: string,
  date: string
): Promise<{ success: boolean; data?: AggregatedSalesData; error?: string }> {
  try {
    console.log(`[Aggregation] Starting aggregation for location ${locationId}, date ${date}`);
    
    const supabase = await createClient();
    
    // Query all raw sales data for this location and date
    const { data: rawData, error: queryError } = await supabase
      .from('bork_sales_data')
      .select('*')
      .eq('location_id', locationId)
      .eq('date', date);
    
    if (queryError) {
      console.error('[Aggregation] Query error:', queryError);
      return { success: false, error: `Database query failed: ${queryError.message}` };
    }
    
    if (!rawData || rawData.length === 0) {
      console.log(`[Aggregation] No raw data found for location ${locationId}, date ${date}`);
      return { success: false, error: 'No raw data found for aggregation' };
    }
    
    console.log(`[Aggregation] Found ${rawData.length} raw records to aggregate`);
    
    // Calculate aggregated metrics
    const aggregated = calculateAggregatedMetrics(rawData);
    
    // Upsert into bork_sales_aggregated table
    const { data: upsertData, error: upsertError } = await supabase
      .from('bork_sales_aggregated')
      .upsert({
        location_id: locationId,
        date: date,
        ...aggregated
      }, {
        onConflict: 'location_id,date'
      })
      .select()
      .single() as { data: AggregatedSalesData | null; error: any };
    
    if (upsertError) {
      console.error('[Aggregation] Upsert error:', upsertError);
      return { success: false, error: `Failed to save aggregated data: ${upsertError.message}` };
    }
    
    console.log(`[Aggregation] Successfully aggregated and saved data for ${locationId}, ${date}`);
    
    return { success: true, data: upsertData };
    
  } catch (error) {
    console.error('[Aggregation] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown aggregation error' 
    };
  }
}

/**
 * Calculate aggregated metrics from raw sales data
 * DEFENSIVE: Works with actual current schema (no VAT fields)
 */
function calculateAggregatedMetrics(rawData: RawSalesRecord[]): Omit<AggregatedSalesData, 'id' | 'location_id' | 'date' | 'created_at' | 'updated_at'> {
  console.log(`[Aggregation] Calculating metrics for ${rawData.length} records`);
  
  // Basic totals - DEFENSIVE: Use only available fields
  const totalQuantity = rawData.reduce((sum, record) => sum + (record.quantity || 0), 0);
  const totalRevenue = rawData.reduce((sum, record) => sum + (record.revenue || 0), 0);
  
  // DEFENSIVE: Since we don't have VAT breakdown in current schema, use estimates
  // Assume 21% VAT rate for all items (conservative estimate)
  const estimatedVatRate = 0.21; // 21% VAT
  const totalRevenueExclVat = totalRevenue / (1 + estimatedVatRate);
  const totalVatAmount = totalRevenue - totalRevenueExclVat;
  const totalRevenueInclVat = totalRevenue;
  
  // Cost estimation (assume 30% cost margin)
  const estimatedCostMargin = 0.30;
  const totalCost = totalRevenueExclVat * estimatedCostMargin;
  
  const avgPrice = totalQuantity > 0 ? totalRevenueExclVat / totalQuantity : 0;
  
  // DEFENSIVE: VAT breakdown (use estimates since no VAT data available)
  const vat9Base = 0; // No 9% VAT data available
  const vat9Amount = 0;
  const vat21Base = totalRevenueExclVat; // Assume all is 21% VAT
  const vat21Amount = totalVatAmount;
  
  // Product metrics
  const productCount = rawData.length;
  const uniqueProducts = new Set(rawData.map(r => r.product_name)).size;
  
  // Category analysis
  const categoryRevenue: Record<string, number> = {};
  rawData.forEach(record => {
    const category = record.category || 'Unknown';
    categoryRevenue[category] = (categoryRevenue[category] || 0) + (record.revenue || 0);
  });
  
  const topCategory = Object.entries(categoryRevenue)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  
  const categoryBreakdown = Object.entries(categoryRevenue).map(([category, revenue]) => ({
    category,
    revenue,
    percentage: totalRevenueInclVat > 0 ? (revenue / totalRevenueInclVat) * 100 : 0
  }));
  
  console.log(`[Aggregation] Calculated: quantity=${totalQuantity}, revenue=${totalRevenue}, excl_vat=${totalRevenueExclVat}`);
  
  return {
    total_quantity: totalQuantity,
    total_revenue_excl_vat: totalRevenueExclVat,
    total_revenue_incl_vat: totalRevenueInclVat,
    total_vat_amount: totalVatAmount,
    total_cost: totalCost,
    avg_price: avgPrice,
    vat_9_base: vat9Base,
    vat_9_amount: vat9Amount,
    vat_21_base: vat21Base,
    vat_21_amount: vat21Amount,
    product_count: productCount,
    unique_products: uniqueProducts,
    top_category: topCategory,
    category_breakdown: categoryBreakdown
  };
}

/**
 * Get dates that have changed since last aggregation for a location
 */
async function getChangedDates(
  supabase: any,
  locationId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  try {
    // Get last aggregation time for this location
    const { data: lastAgg, error: lastAggError } = await supabase
      .from('bork_sales_aggregated')
      .select('last_location_aggregation')
      .eq('location_id', locationId)
      .order('last_location_aggregation', { ascending: false })
      .limit(1);
    
    if (lastAggError) {
      console.error('[Aggregation] Error getting last aggregation time:', lastAggError);
      // If we can't get last aggregation time, process all dates
      return [];
    }
    
    const lastAggTime = lastAgg?.[0]?.last_location_aggregation || new Date('1900-01-01');
    console.log(`[Aggregation] Last aggregation for location ${locationId}: ${lastAggTime}`);
    
    // Get all dates with raw data newer than last aggregation
    const { data: changedDates, error: changedError } = await supabase
      .from('bork_sales_data')
      .select('date')
      .eq('location_id', locationId)
      .gte('date', startDate)
      .lte('date', endDate)
      .gt('updated_at', lastAggTime);
    
    if (changedError) {
      console.error('[Aggregation] Error getting changed dates:', changedError);
      // If we can't get changed dates, process all dates
      return [];
    }
    
    const uniqueChangedDates = [...new Set(changedDates?.map(d => d.date) || [])];
    console.log(`[Aggregation] Found ${uniqueChangedDates.length} changed dates since last aggregation`);
    
    return uniqueChangedDates;
    
  } catch (error) {
    console.error('[Aggregation] Error in getChangedDates:', error);
    // If change detection fails, process all dates
    return [];
  }
}

/**
 * Aggregate sales data for a date range (incremental approach)
 */
export async function aggregateSalesDataForDateRange(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; aggregatedDates: string[]; errors: string[]; incremental: boolean }> {
  try {
    console.log(`[Aggregation] Starting incremental aggregation for location ${locationId}, ${startDate} to ${endDate}`);
    
    const supabase = await createClient();
    
    // Get changed dates since last aggregation
    const changedDates = await getChangedDates(supabase, locationId, startDate, endDate);
    
    let datesToProcess: string[];
    let isIncremental = true;
    
    if (changedDates.length === 0) {
      // No changes detected, check if we have any data at all
      const { data: allDates, error: allDatesError } = await supabase
        .from('bork_sales_data')
        .select('date')
        .eq('location_id', locationId)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (allDatesError || !allDates || allDates.length === 0) {
        console.log(`[Aggregation] No raw data found for location ${locationId} in date range ${startDate} to ${endDate}`);
        return { success: true, aggregatedDates: [], errors: [], incremental: false };
      }
      
      // If no changes detected but we have data, process all dates (fallback)
      datesToProcess = [...new Set(allDates.map(d => d.date))];
      isIncremental = false;
      console.log(`[Aggregation] No changes detected, processing all ${datesToProcess.length} dates (fallback)`);
    } else {
      datesToProcess = changedDates;
      console.log(`[Aggregation] Processing ${datesToProcess.length} changed dates incrementally`);
    }
    
    const aggregatedDates: string[] = [];
    const errors: string[] = [];
    
    // Process each date
    for (const date of datesToProcess) {
      const result = await aggregateSalesData(locationId, date);
      if (result.success) {
        aggregatedDates.push(date);
        console.log(`[Aggregation] Successfully aggregated ${date}`);
      } else {
        errors.push(`${date}: ${result.error}`);
        console.error(`[Aggregation] Failed to aggregate ${date}:`, result.error);
      }
    }
    
    // Update last aggregation timestamp for this location
    if (aggregatedDates.length > 0) {
      const { error: updateError } = await supabase
        .from('bork_sales_aggregated')
        .update({ last_location_aggregation: new Date().toISOString() })
        .eq('location_id', locationId)
        .in('date', aggregatedDates);
      
      if (updateError) {
        console.error('[Aggregation] Error updating last aggregation timestamp:', updateError);
      } else {
        console.log(`[Aggregation] Updated last aggregation timestamp for location ${locationId}`);
      }
    }
    
    console.log(`[Aggregation] ${isIncremental ? 'Incremental' : 'Full'} aggregation complete: ${aggregatedDates.length} successful, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      aggregatedDates,
      errors,
      incremental: isIncremental
    };
    
  } catch (error) {
    console.error('[Aggregation] Batch aggregation error:', error);
    return {
      success: false,
      aggregatedDates: [],
      errors: [error instanceof Error ? error.message : 'Unknown batch aggregation error'],
      incremental: false
    };
  }
}
