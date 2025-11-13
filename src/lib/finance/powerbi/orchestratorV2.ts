import * as XLSX from "xlsx";
import { FieldMapping, ProcessingResult } from "../universal/types";
import { processWithMapping, parseMonth } from "../universal/orchestrator";
import { deletePowerBIData } from "./database";
import { detectHeaderRow } from "../universal/matching/headerDetector";
import { batchProcessSummaries } from "./summaryProcessor";

/**
 * Extract year-month combinations from PowerBI sheet
 */
const extractYearMonthCombinations = (
  workbook: XLSX.WorkBook,
  mapping: FieldMapping
): Set<string> => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const headerRow = detectHeaderRow(firstSheet, 'powerbi_pnl');
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  const headers = data[headerRow] || [];
  const dataRows = data.slice(headerRow + 1);
  
  // Find year and month column indices
  const yearIdx = headers.findIndex((h: string) => 
    h && mapping.year && h.toString().toLowerCase() === mapping.year.toLowerCase()
  );
  const monthIdx = headers.findIndex((h: string) => 
    h && mapping.month && h.toString().toLowerCase() === mapping.month.toLowerCase()
  );
  
  const combinations = new Set<string>();
  
  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    
    const yearVal = row[yearIdx];
    const monthVal = row[monthIdx];
    
    if (yearVal && monthVal) {
      const year = parseInt(String(yearVal));
      const month = typeof monthVal === 'number' ? monthVal : parseMonth(String(monthVal));
      
      if (!isNaN(year) && month !== null && year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
        combinations.add(`${year}-${month}`);
      }
    }
  }
  
  return combinations;
};

/**
 * PowerBI P&L V2 processor using universal parser engine
 * Deletes existing data before inserting to enable overwrite mode
 */
export const processPowerBIPnLV2 = async (
  workbook: XLSX.WorkBook,
  importId: string,
  locationId: string,
  mapping: FieldMapping
): Promise<ProcessingResult> => {
  console.log('PowerBI V2: Starting processing with overwrite mode');
  
  // Step 1: Extract year-month combinations from file
  const yearMonthCombinations = extractYearMonthCombinations(workbook, mapping);
  console.log('PowerBI V2: Found year-month combinations:', Array.from(yearMonthCombinations));
  
  // Step 2: Delete existing data for these combinations
  if (yearMonthCombinations.size > 0) {
    console.log('PowerBI V2: Deleting existing data...');
    await deletePowerBIData(locationId, yearMonthCombinations);
    console.log('PowerBI V2: Deletion complete');
  }
  
  // Step 3: Process and insert new data
  console.log('PowerBI V2: Processing and inserting new data...');
  const result = await processWithMapping(workbook, importId, locationId, 'powerbi_pnl', mapping);
  console.log('PowerBI V2: Processing complete:', result);
  
  // Step 4: Process into summary tables (pnl_line_items + pnl_monthly_summary)
  console.log('PowerBI V2: Processing into summary tables...');
  const uniqueCombinations = Array.from(yearMonthCombinations).map(combo => {
    const [year, month] = combo.split('-').map(Number);
    return { locationId, year, month, importId };
  });

  const { totalLineItems, totalSummaries } = await batchProcessSummaries(uniqueCombinations);
  console.log(`PowerBI V2: Created ${totalLineItems} line items and ${totalSummaries} summaries`);
  
  return result;
};