import { supabase } from '@/integrations/supabase/client';
import { ImportType, ValidationError } from '../types';
import { logValidationError } from './logger';

/**
 * Insert records in batches with bisection retry on errors
 */
export async function insertBatchWithBisection(
  records: any[],
  tableName: string,
  importId: string,
  importType: ImportType,
  errors: ValidationError[]
): Promise<number> {
  if (records.length === 0) return 0;
  
  try {
    const { error } = await supabase.from(tableName as any).insert(records);
    if (!error) return records.length;
    
    // If batch fails and it's a single record, log and skip
    if (records.length === 1) {
      const validationError: ValidationError = {
        rowIndex: -1,
        reason: `Database insert failed: ${error.message}`,
        originalRow: records[0]
      };
      errors.push(validationError);
      await logValidationError(importId, importType, validationError);
      return 0;
    }
    
    // Bisect and retry
    const mid = Math.floor(records.length / 2);
    const left = await insertBatchWithBisection(records.slice(0, mid), tableName, importId, importType, errors);
    const right = await insertBatchWithBisection(records.slice(mid), tableName, importId, importType, errors);
    return left + right;
  } catch (err) {
    console.error('Insert batch error:', err);
    return 0;
  }
}
