import * as XLSX from "xlsx";
import { FieldMapping, ProcessingResult } from "../universal/types";
import { processWithMapping } from "../universal/orchestrator";
import { extractBorkDateRange } from "./extractors";

/**
 * Bork Sales V2 processor using universal parser engine
 * Extracts date from metadata and injects into all records
 */
export const processBorkSalesV2 = async (
  workbook: XLSX.WorkBook,
  importId: string,
  locationId: string,
  mapping: FieldMapping
): Promise<ProcessingResult> => {
  // Extract date from file metadata (Bork stores date in first 10 rows, not as column)
  const dateRange = extractBorkDateRange(workbook);
  
  if (!dateRange) {
    console.warn('⚠️ [Bork V2] No date range found in file metadata');
    throw new Error('Could not extract date range from Bork file. Please ensure the file contains a date range in the format "DD/MM/YYYY - DD/MM/YYYY".');
  }
  
  // Use the start date as the transaction date
  const transactionDate = dateRange.start;
  console.log(`📅 [Bork V2] Using transaction date: ${transactionDate} (from range: ${dateRange.start} - ${dateRange.end})`);
  
  // Process with mapping, passing date in metadata
  const result = await processWithMapping(
    workbook, 
    importId, 
    locationId, 
    'bork_sales', 
    mapping,
    { date: transactionDate }
  );
  
  console.log(`✅ [Bork V2] Processed ${result.processedCount} records with date ${transactionDate}`);
  
  return result;
};