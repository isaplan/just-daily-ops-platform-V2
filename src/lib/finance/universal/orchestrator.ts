import * as XLSX from 'xlsx';
import { ImportType, ProcessingResult, FieldMapping } from './types';
import { FIELD_REQUIREMENTS } from './config/fieldRequirements';
import { detectHeaderRow } from './matching/headerDetector';
import { processRows } from './processing/rowProcessor';
import { insertBatchWithBisection } from './database/batchInserter';
import { logMappingSnapshot } from './database/logger';

// Re-export commonly used functions for backward compatibility
export { analyzeSheet } from './analysis/sheetAnalyzer';
export { parseDateValue } from './parsers/dateParser';
export { parseNumber } from './parsers/numberParser';
export { parseHours } from './parsers/hoursParser';
export { parseMonth } from './parsers/monthParser';

/**
 * Main entry point: Process Excel file with field mapping
 * Orchestrates: analysis → processing → database insertion
 */
export async function processWithMapping(
  workbook: XLSX.WorkBook,
  importId: string,
  locationId: string,
  importType: ImportType,
  mapping: FieldMapping,
  metadata?: { date?: string; [key: string]: any }
): Promise<ProcessingResult> {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const headerRow = detectHeaderRow(firstSheet, importType);
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  const headers = data[headerRow] || [];
  const dataRows = data.slice(headerRow + 1);
  
  console.log('🔄 Processing with mapping START:', {
    importId,
    importType,
    locationId,
    headerRow,
    totalRows: data.length,
    dataRows: dataRows.length,
    headers: headers,
    mapping: mapping,
    mappedFields: Object.keys(mapping)
  });
  
  // Create reverse mapping (header -> field)
  const reverseMapping: Record<string, string> = {};
  for (const [field, header] of Object.entries(mapping)) {
    reverseMapping[header] = field;
  }
  
  const errors: any[] = [];
  const requirements = FIELD_REQUIREMENTS[importType];
  
  // Log mapping snapshot for traceability
  const missingRequired = requirements.required.filter(f => !mapping[f]);
  await logMappingSnapshot(importId, importType, {
    headerRow,
    headers,
    proposedMapping: mapping,
    confidence: {}, // Confidence scores not available here, would need to pass from analyzeSheet
    missingRequired
  });
  
  // Process all rows
  const { validRecords, errors: processingErrors } = await processRows(
    dataRows,
    headers,
    reverseMapping,
    importId,
    importType,
    headerRow,
    locationId,
    metadata
  );
  
  errors.push(...processingErrors);
  
  if (validRecords.length === 0) {
    return { processedCount: 0, skippedCount: dataRows.length, errors };
  }
  
  // PowerBI aggregation (fix duplicate key issues)
  let finalRecords = validRecords;
  if (importType === 'powerbi_pnl') {
    const aggregated = new Map<string, any>();
    for (const record of validRecords) {
      const key = `${record.location_id}|${record.year}|${record.month}|${record.gl_account}`;
      if (aggregated.has(key)) {
        aggregated.get(key)!.amount += record.amount;
      } else {
        aggregated.set(key, { ...record });
      }
    }
    finalRecords = Array.from(aggregated.values());
  }
  
  // Determine table name
  const tableMap: Record<ImportType, string> = {
    bork_sales: 'bork_sales_data',
    eitje_labor: 'eitje_labor_hours',
    eitje_productivity: 'eitje_productivity_data',
    powerbi_pnl: 'powerbi_pnl_data'
  };
  const tableName = tableMap[importType];
  
  // Filter records to only include mapped fields + system fields
  const systemFields = ['import_id', 'location_id', 'created_at', 'raw_data'];
  
  // Defensive: ensure mapping exists
  const mappingFields = mapping ? Object.keys(mapping) : [];
  const allowedFields = [...systemFields, ...mappingFields];
  
  // If no mapping provided, skip filtering (fail-safe for legacy compatibility)
  const cleanedRecords = mappingFields.length > 0 
    ? finalRecords.map(record => {
        const cleaned: any = {};
        for (const key of Object.keys(record)) {
          if (allowedFields.includes(key)) {
            cleaned[key] = record[key];
          }
        }
        return cleaned;
      })
    : finalRecords; // Pass through unfiltered if no mapping
  
  // Batch insert with error handling
  const BATCH_SIZE = 500;
  let processedCount = 0;
  
  for (let i = 0; i < cleanedRecords.length; i += BATCH_SIZE) {
    const batch = cleanedRecords.slice(i, i + BATCH_SIZE);
    const inserted = await insertBatchWithBisection(batch, tableName, importId, importType, errors);
    processedCount += inserted;
  }
  
  const skippedCount = dataRows.length - processedCount;
  
  return { processedCount, skippedCount, errors };
}
