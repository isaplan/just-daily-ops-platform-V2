import { supabase } from "@/integrations/supabase/client";
import type { PowerBIPnLRecord } from "./parser";

/**
 * Deletes existing PowerBI P&L data for given location and year-month combinations
 * Called before inserting new data to avoid duplicates
 * Uses a single query with OR conditions for better performance
 */
export const deletePowerBIData = async (
  locationId: string,
  yearMonthCombinations: Set<string>
): Promise<void> => {
  // Build array of conditions for OR query
  const conditions = Array.from(yearMonthCombinations).map(combo => {
    const [year, month] = combo.split('-').map(Number);
    return { year, month };
  });

  console.log(`Deleting PowerBI data for location ${locationId}, ${conditions.length} year-month combinations`);

  // Delete all matching records in a single query
  // We need to delete each year-month combo separately because Supabase doesn't support complex OR conditions easily
  for (const { year, month } of conditions) {
    const { error, count } = await supabase
      .from('powerbi_pnl_data')
      .delete({ count: 'exact' })
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);
    
    if (error) {
      console.error(`Failed to delete data for ${year}-${month}:`, error);
      throw new Error(`Failed to delete existing data: ${error.message}`);
    }
    
    console.log(`Deleted ${count ?? 0} records for ${year}-${month}`);
  }
};

/**
 * Inserts PowerBI P&L records in batches to database
 * Uses configurable batch size for performance
 */
export const insertPowerBIData = async (
  records: PowerBIPnLRecord[],
  batchSize: number = 500
): Promise<number> => {
  let processedCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('powerbi_pnl_data').insert(batch);
    
    if (error) {
      console.error(`Batch insert failed at index ${i}:`, {
        error,
        batchSize: batch.length,
        sampleRecord: batch[0],
      });
      throw new Error(`Failed to insert batch at index ${i}: ${error.message}`);
    }
    
    processedCount += batch.length;
  }

  return processedCount;
};
