import { ImportType, ValidationError } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { matchLocation } from '@/lib/finance/common/location-matcher';
import { buildRecord } from './recordBuilder';
import { logValidationError } from '../database/logger';

/**
 * Process all data rows from sheet
 * Coordinates recordBuilder + validator + location matching
 */
export async function processRows(
  dataRows: any[][],
  headers: string[],
  reverseMapping: Record<string, string>,
  importId: string,
  importType: ImportType,
  headerRow: number,
  locationId?: string,
  metadata?: { date?: string; [key: string]: any }
): Promise<{
  validRecords: any[];
  errors: ValidationError[];
}> {
  const records: any[] = [];
  const errors: ValidationError[] = [];
  
  // Fetch locations for per-row matching (for Eitje productivity)
  const { data: locations } = await supabase.from('locations').select('id, name');
  
  // Process rows based on import type
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Skip metadata rows - check if row has any recognizable mapped fields
    const hasAnyMappedField = headers.some((header, colIndex) => {
      return reverseMapping[header] !== undefined && row[colIndex] !== undefined && row[colIndex] !== '';
    });
    
    if (!hasAnyMappedField) {
      console.log(`⏭️ Skipping metadata row at data index ${rowIndex} - no recognized fields`);
      continue;
    }
    
    // Debug first row
    if (rowIndex === 0) {
      console.log('🔍 First data row processing:', {
        rowIndex: rowIndex + headerRow + 1,
        rowData: row.slice(0, 8),
        headers: headers.slice(0, 8),
        reverseMapping: reverseMapping
      });
    }
    
    const { record, errors: rowErrors, hasRequiredFields, rowLocationName, rawData } = buildRecord(
      row,
      headers,
      reverseMapping,
      importId,
      importType,
      locationId
    );
    
    // Update row indices in errors
    rowErrors.forEach(err => {
      err.rowIndex = rowIndex + headerRow + 1;
    });
    errors.push(...rowErrors);
    
    // Per-row location matching for Eitje files
    if ((importType === 'eitje_productivity' || importType === 'eitje_labor') && rowLocationName && locations) {
      const matched = await matchLocation(rowLocationName, locations);
      if (matched) {
        record.location_id = matched.id;
      } else {
        console.warn(`⚠️ Location not matched for row ${rowIndex}: "${rowLocationName}"`);
        errors.push({
          rowIndex: rowIndex + headerRow + 1,
          reason: `Location "${rowLocationName}" not found in database`,
          field: 'location_name',
          value: rowLocationName,
          originalRow: row
        });
        continue; // Skip this row
      }
    } else if ((importType === 'eitje_productivity' || importType === 'eitje_labor') && !rowLocationName) {
      console.warn(`⚠️ Missing location for Eitje row ${rowIndex}`);
      errors.push({
        rowIndex: rowIndex + headerRow + 1,
        reason: 'Missing location_name for Eitje row',
        field: 'location_name',
        originalRow: row
      });
      continue; // Skip this row
    }
    
    if (hasRequiredFields) {
      if (importType === 'bork_sales') {
        record.raw_data = rawData;
        
        // Inject date from metadata if not present in record
        if (metadata?.date && !record.date) {
          record.date = metadata.date;
          console.log(`📅 Injected date ${metadata.date} into Bork sales record`);
        }
      }
      records.push(record);
    } else {
      await logValidationError(importId, importType, {
        rowIndex: rowIndex + headerRow + 1,
        reason: 'Missing required fields',
        originalRow: row
      });
    }
  }
  
  return { validRecords: records, errors };
}
