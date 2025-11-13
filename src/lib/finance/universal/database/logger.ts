import { supabase } from '@/integrations/supabase/client';
import { ImportType, ValidationError, FieldMapping } from '../types';

/**
 * Log mapping snapshot to database for traceability
 */
export async function logMappingSnapshot(
  importId: string,
  importType: ImportType,
  snapshot: {
    headerRow: number;
    headers: string[];
    proposedMapping: FieldMapping;
    confidence: Record<string, number>;
    missingRequired: string[];
  }
): Promise<void> {
  try {
    await supabase.from('import_validation_logs').insert([{
      import_id: importId,
      validation_type: 'mapping_snapshot',
      severity: 'info',
      message: 'Auto-mapping decided',
      details: {
        importType,
        ...snapshot
      }
    }]);
  } catch (err) {
    console.error('Failed to log mapping snapshot:', err);
  }
}

/**
 * Log validation error to database
 */
export async function logValidationError(
  importId: string,
  importType: ImportType,
  error: ValidationError
): Promise<void> {
  try {
    await supabase.from('import_validation_logs').insert([{
      import_id: importId,
      validation_type: 'parser_v2_row_skip',
      severity: 'warning',
      message: error.reason,
      details: {
        importType,
        rowIndex: error.rowIndex,
        field: error.field,
        value: error.value,
        originalRow: error.originalRow
      }
    }]);
  } catch (err) {
    console.error('Failed to log validation error:', err);
  }
}
