import { ImportType, ValidationError } from '../types';
import { FIELD_REQUIREMENTS } from '../config/fieldRequirements';
import { parseDateValue } from '../parsers/dateParser';
import { parseNumber } from '../parsers/numberParser';
import { parseHours } from '../parsers/hoursParser';
import { parseMonth } from '../parsers/monthParser';

/**
 * Build database record from raw row data using field mapping
 */
export function buildRecord(
  row: any[],
  headers: string[],
  reverseMapping: Record<string, string>,
  importId: string,
  importType: ImportType,
  locationId?: string
): {
  record: any;
  errors: ValidationError[];
  hasRequiredFields: boolean;
  rowLocationName: string | null;
  rawData: any;
} {
  const requirements = FIELD_REQUIREMENTS[importType];
  const errors: ValidationError[] = [];
  
  const record: any = {
    import_id: importId,
    created_at: new Date().toISOString(),
    // Only add location_id if provided (null for multi-location Eitje)
    ...(locationId && { location_id: locationId })
  };
  
  const rawData: any = {};
  let hasRequiredFields = true;
  let rowLocationName: string | null = null;
  
  // Map fields
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const header = headers[colIndex];
    const value = row[colIndex];
    const field = reverseMapping[header];
    
    if (field) {
      // Capture location_name for per-row matching
      if (field === 'location_name') {
        rowLocationName = value ? String(value).trim() : null;
        continue; // Don't add to record, just capture
      }
      
      // Map to database field
      if (field === 'date') {
        const parsed = parseDateValue(value);
        if (parsed) {
          record[field] = parsed;
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1, // Will be set by caller
            reason: `Invalid date value`,
            field,
            value,
            originalRow: row
          });
        }
      } else if (['hours', 'hours_worked'].includes(field)) {
        // Use parseHours for hour fields (handles HH:MM format)
        const parsed = parseHours(value);
        if (parsed !== null) {
          record[field] = parsed;
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1,
            reason: `Invalid hours value (expected HH:MM or decimal)`,
            field,
            value,
            originalRow: row
          });
        }
      } else if (field === 'base_hourly_wage') {
        // Specifically handle currency-formatted wage values (e.g., "€14,03")
        const parsed = parseNumber(value);
        if (parsed !== null) {
          record[field] = parsed;
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1,
            reason: `Invalid wage value (expected numeric, got: "${value}")`,
            field,
            value,
            originalRow: row
          });
        }
      } else if (['quantity', 'price', 'revenue', 'hourly_rate', 'labor_cost', 
                  'labor_cost_percentage', 'productivity_per_hour', 'amount'].includes(field)) {
        const parsed = parseNumber(value);
        if (parsed !== null) {
          record[field] = parsed;
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1,
            reason: `Invalid numeric value`,
            field,
            value,
            originalRow: row
          });
        }
      } else if (field === 'month') {
        const parsed = parseMonth(value);
        if (parsed !== null) {
          record[field] = parsed;
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1,
            reason: `Invalid month value`,
            field,
            value,
            originalRow: row
          });
        }
      } else if (field === 'year') {
        const parsed = parseNumber(value);
        if (parsed !== null && parsed >= 2020 && parsed <= 2030) {
          record[field] = Math.floor(parsed);
        } else if (requirements.required.includes(field)) {
          hasRequiredFields = false;
          errors.push({
            rowIndex: -1,
            reason: `Invalid year value`,
            field,
            value,
            originalRow: row
          });
        }
      } else {
        // Text fields
        record[field] = value ? String(value).trim() : null;
        if (!record[field] && requirements.required.includes(field)) {
          hasRequiredFields = false;
          const headerName = Object.keys(reverseMapping).find(h => reverseMapping[h] === field) || '(unmapped)';
          errors.push({
            rowIndex: -1,
            reason: `Missing required field: ${field}. Header "${headerName}" mapped to field "${field}" but value is empty or invalid.`,
            field,
            value,
            originalRow: row
          });
        }
      }
    } else {
      // Store in raw_data
      rawData[header] = value;
    }
  }
  
  // Check required fields
  for (const requiredField of requirements.required) {
    if (!record[requiredField]) {
      hasRequiredFields = false;
    }
  }
  
  return { record, errors, hasRequiredFields, rowLocationName, rawData };
}
