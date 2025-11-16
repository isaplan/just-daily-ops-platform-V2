/**
 * JSONB Field Extractor
 * 
 * Recursively extracts all nested fields from JSON objects
 * and flattens them into a single-level object for easier querying.
 * 
 * This is used when storing raw API responses to extract all
 * nested JSONB fields into the `extracted` field.
 */

/**
 * Recursively extract all fields from a JSON object
 * Handles nested objects, arrays, and primitive values
 */
export function extractJsonbFields(
  obj: any,
  prefix: string = '',
  maxDepth: number = 10,
  currentDepth: number = 0
): Record<string, any> {
  const extracted: Record<string, any> = {};

  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return extracted;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return extracted;
  }

  // Handle arrays - extract fields from each item
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const arrayPrefix = prefix ? `${prefix}_${index}` : `${index}`;
      const itemExtracted = extractJsonbFields(item, arrayPrefix, maxDepth, currentDepth + 1);
      Object.assign(extracted, itemExtracted);
    });
    return extracted;
  }

  // Handle primitive values
  if (typeof obj !== 'object') {
    if (prefix) {
      extracted[prefix] = obj;
    }
    return extracted;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    if (prefix) {
      extracted[prefix] = obj.toISOString();
    }
    return extracted;
  }

  // Handle objects - recursively extract all fields
  for (const [key, value] of Object.entries(obj)) {
    const fieldKey = prefix ? `${prefix}_${key}` : key;

    // If value is a primitive, add it directly
    if (value === null || value === undefined) {
      extracted[fieldKey] = null;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      extracted[fieldKey] = value;
    } else if (value instanceof Date) {
      extracted[fieldKey] = value.toISOString();
    } else if (Array.isArray(value)) {
      // For arrays, extract first item's structure and add array length
      extracted[`${fieldKey}_count`] = value.length;
      if (value.length > 0) {
        const arrayExtracted = extractJsonbFields(value[0], `${fieldKey}_item`, maxDepth, currentDepth + 1);
        Object.assign(extracted, arrayExtracted);
      }
    } else if (typeof value === 'object') {
      // Recursively extract nested object
      const nestedExtracted = extractJsonbFields(value, fieldKey, maxDepth, currentDepth + 1);
      Object.assign(extracted, nestedExtracted);
    }
  }

  return extracted;
}

/**
 * Extract fields with common field name mappings
 * Maps common API field names to standardized names
 */
export function extractJsonbFieldsWithMapping(
  obj: any,
  mappings?: Record<string, string>
): Record<string, any> {
  const extracted = extractJsonbFields(obj);
  
  if (!mappings) {
    return extracted;
  }

  // Apply field name mappings
  const mapped: Record<string, any> = {};
  for (const [originalKey, value] of Object.entries(extracted)) {
    // Check if this key should be mapped
    let mappedKey = originalKey;
    for (const [pattern, replacement] of Object.entries(mappings)) {
      if (originalKey.includes(pattern)) {
        mappedKey = originalKey.replace(pattern, replacement);
        break;
      }
    }
    mapped[mappedKey] = value;
  }

  return mapped;
}

/**
 * Extract specific known fields from Eitje API responses
 * Common fields we want to extract for easier querying
 */
export function extractEitjeFields(rawResponse: any): Record<string, any> {
  const extracted: Record<string, any> = {};
  
  // Extract common Eitje fields
  if (rawResponse.id !== undefined) extracted.id = rawResponse.id;
  if (rawResponse.environment_id !== undefined) extracted.environmentId = rawResponse.environment_id;
  if (rawResponse.environment?.id !== undefined) extracted.environmentId = rawResponse.environment.id;
  if (rawResponse.user_id !== undefined) extracted.userId = rawResponse.user_id;
  if (rawResponse.user?.id !== undefined) extracted.userId = rawResponse.user.id;
  if (rawResponse.team_id !== undefined) extracted.teamId = rawResponse.team_id;
  if (rawResponse.team?.id !== undefined) extracted.teamId = rawResponse.team.id;
  if (rawResponse.date !== undefined) extracted.date = rawResponse.date;
  if (rawResponse.start_time !== undefined) extracted.startTime = rawResponse.start_time;
  if (rawResponse.end_time !== undefined) extracted.endTime = rawResponse.end_time;
  if (rawResponse.hours !== undefined) extracted.hours = rawResponse.hours;
  if (rawResponse.hours_worked !== undefined) extracted.hoursWorked = rawResponse.hours_worked;
  if (rawResponse.revenue !== undefined) extracted.revenue = rawResponse.revenue;
  if (rawResponse.amt_in_cents !== undefined) extracted.amountInCents = rawResponse.amt_in_cents;
  if (rawResponse.amount !== undefined) extracted.amount = rawResponse.amount;
  
  // Extract all other fields recursively
  const allExtracted = extractJsonbFields(rawResponse);
  Object.assign(extracted, allExtracted);
  
  return extracted;
}






