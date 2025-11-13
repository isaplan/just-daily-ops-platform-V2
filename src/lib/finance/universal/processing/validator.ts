import { ImportType, ValidationError } from '../types';
import { FIELD_REQUIREMENTS } from '../config/fieldRequirements';

/**
 * Validate that record has all required fields
 */
export function validateRecord(
  record: any,
  importType: ImportType
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = FIELD_REQUIREMENTS[importType];
  
  for (const requiredField of requirements.required) {
    if (!record[requiredField]) {
      errors.push({
        rowIndex: -1, // Will be set by caller
        reason: `Missing required field: ${requiredField}`,
        field: requiredField,
        originalRow: record
      });
    }
  }
  
  return errors;
}
