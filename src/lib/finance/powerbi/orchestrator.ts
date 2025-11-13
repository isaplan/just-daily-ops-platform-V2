import * as XLSX from "xlsx";
import { parsePowerBISheet } from "./parser";
import { deletePowerBIData, insertPowerBIData } from "./database";

/**
 * Orchestrates PowerBI P&L data processing
 * Steps: Parse workbook → Delete existing data → Insert new data
 * Returns count of processed records
 */
export const processPowerBIPnL = async (
  workbook: XLSX.WorkBook,
  importId: string,
  locationId: string
): Promise<{ processedCount: number }> => {
  try {
    console.log('PowerBI Orchestrator: Starting processing...');
    
    // Step 1: Parse the workbook into structured records
    const { records, yearMonthCombinations } = parsePowerBISheet(
      workbook,
      locationId,
      importId
    );
    console.log(`Step 1 Complete: Parsed ${records.length} records`);

    if (records.length === 0) {
      throw new Error(
        'No records parsed from PowerBI file. Check that:\n' +
        '1. File has correct column structure (columns 0-6)\n' +
        '2. Year values are valid (2020-2030)\n' +
        '3. Month names are in Dutch format\n' +
        '4. Data starts from row 4 (after headers at rows 1-3)'
      );
    }

    // Step 2: Delete existing data for these year-month combinations
    console.log(`Step 2: Deleting existing data for ${yearMonthCombinations.size} year-month combinations...`);
    await deletePowerBIData(locationId, yearMonthCombinations);
    console.log('Step 2 Complete: Deleted existing data');

    // Step 3: Insert new records in batches
    console.log(`Step 3: Inserting ${records.length} records in batches...`);
    const processedCount = await insertPowerBIData(records);
    console.log(`Step 3 Complete: Inserted ${processedCount} records`);

    return { processedCount };
  } catch (error) {
    console.error('PowerBI Processing Error:', error);
    throw new Error(`PowerBI processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
