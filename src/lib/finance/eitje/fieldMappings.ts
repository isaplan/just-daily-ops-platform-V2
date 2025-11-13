/**
 * Eitje API Field Mappings
 * 
 * Defines explicit field mappings for Eitje API responses based on actual API documentation.
 * The API uses inconsistent field naming across endpoints, so we provide fallback paths.
 */

export interface EitjeShiftResponse {
  id: number;
  date: string;
  user_id?: number;
  team_id?: number;
  environment_id?: number;
  
  // Time fields (multiple naming conventions)
  start_time?: string;
  start?: string;
  startDateTime?: string;
  end_time?: string;
  end?: string;
  endDateTime?: string;
  
  // Break fields
  break_minutes?: number;
  breaks?: number;
  breakMinutes?: number;
  
  // Hours fields
  hours_worked?: number;
  hours?: number;
  totalHours?: number;
  
  // Cost fields (may be nested)
  wage_cost?: number;
  costs?: {
    wage?: number;
    [key: string]: any;
  };
  
  // Metadata
  status?: string;
  skill_set?: string;
  shift_type?: string;
}

/**
 * Field mapping configuration
 * Maps database field → array of possible API field paths (in priority order)
 */
export const EITJE_FIELD_MAPPINGS = {
  time_registration_shifts: {
    eitje_shift_id: ['id'],
    date: ['date'],
    start_time: ['start_time', 'start', 'startDateTime'],
    end_time: ['end_time', 'end', 'endDateTime'],
    break_minutes: ['break_minutes', 'breaks', 'breakMinutes'],
    hours_worked: ['hours_worked', 'hours', 'totalHours'],
    wage_cost: ['wage_cost', 'costs.wage', 'wageCost'],
    eitje_user_id: ['user_id', 'userId'],
    eitje_team_id: ['team_id', 'teamId'],
    environment_id: ['environment_id', 'environmentId'],
    skill_set: ['skill_set', 'skillSet'],
    shift_type: ['shift_type', 'shiftType'],
    status: ['status']
  },
  planning_shifts: {
    eitje_shift_id: ['id'],
    date: ['date'],
    start_time: ['start_time', 'start', 'startDateTime'],
    end_time: ['end_time', 'end', 'endDateTime'],
    break_minutes: ['break_minutes', 'breaks', 'breakMinutes'],
    hours_worked: ['hours_worked', 'hours', 'totalHours'],
    wage_cost: ['wage_cost', 'costs.wage', 'wageCost'],
    eitje_user_id: ['user_id', 'userId'],
    eitje_team_id: ['team_id', 'teamId'],
    environment_id: ['environment_id', 'environmentId'],
    skill_set: ['skill_set', 'skillSet'],
    shift_type: ['shift_type', 'shiftType'],
    status: ['status']
  },
  revenue_days: {
    id: ['id'],
    environment_id: ['environment_id', 'environmentId'],
    date: ['date'],
    revenue: ['revenue', 'totalRevenue', 'total']
  },
  teams: {
    eitje_team_id: ['id'],
    name: ['name'],
    environment_id: ['environment_id', 'environmentId']
  },
  users: {
    eitje_user_id: ['id'],
    name: ['name'],
    email: ['email']
  },
  environments: {
    eitje_environment_id: ['id'],
    name: ['name']
  }
} as const;

/**
 * Extract field value from API response using fallback paths
 * @param record - API response record
 * @param fieldPaths - Array of possible field paths (e.g., ['wage_cost', 'costs.wage'])
 * @param defaultValue - Value to return if no path yields data
 * @returns Extracted value or default
 */
export function extractField(
  record: any,
  fieldPaths: readonly string[],
  defaultValue: any = null
): any {
  for (const path of fieldPaths) {
    const value = getNestedValue(record, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get value from nested object using dot notation path
 * @param obj - Object to traverse
 * @param path - Dot-notation path (e.g., 'costs.wage')
 * @returns Value at path or undefined
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Compute hours worked from start/end times
 * @param startTime - Start time string (HH:MM:SS or ISO datetime)
 * @param endTime - End time string
 * @param breakMinutes - Break duration in minutes
 * @returns Hours worked as decimal (e.g., 7.5) or null if invalid
 */
export function computeHoursWorked(
  startTime: string | null,
  endTime: string | null,
  breakMinutes: number = 0
): number | null {
  if (!startTime || !endTime) return null;
  
  try {
    // Parse time strings (handle both HH:MM:SS and ISO datetime)
    const parseTime = (timeStr: string): Date => {
      if (timeStr.includes('T')) {
        // ISO datetime
        return new Date(timeStr);
      } else {
        // HH:MM:SS - use arbitrary date
        const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
        const date = new Date(2000, 0, 1, hours, minutes, seconds);
        return date;
      }
    };
    
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    // Handle overnight shifts (end < start)
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const workMinutes = diffMinutes - breakMinutes;
    
    return workMinutes > 0 ? Number((workMinutes / 60).toFixed(2)) : null;
  } catch (error) {
    console.error('Error computing hours worked:', error, { startTime, endTime });
    return null;
  }
}

/**
 * Validate shift record structure
 * @param record - API response record
 * @param endpoint - Endpoint name
 * @returns Array of validation warnings
 */
export function validateShiftStructure(record: any, endpoint: string): string[] {
  const warnings: string[] = [];
  const mappings = EITJE_FIELD_MAPPINGS[endpoint as keyof typeof EITJE_FIELD_MAPPINGS];
  
  if (!mappings) {
    warnings.push(`Unknown endpoint: ${endpoint}`);
    return warnings;
  }
  
  // Check critical fields
  const criticalFields = ['eitje_shift_id', 'date'];
  for (const field of criticalFields) {
    const paths = (mappings as any)[field];
    if (paths && !extractField(record, paths)) {
      warnings.push(`Missing critical field: ${field}`);
    }
  }
  
  // Check if shift has time data
  if (endpoint.includes('shift')) {
    const hasStartTime = !!extractField(record, (mappings as any).start_time);
    const hasEndTime = !!extractField(record, (mappings as any).end_time);
    
    if (!hasStartTime || !hasEndTime) {
      warnings.push('Missing start_time or end_time');
    }
  }
  
  return warnings;
}

/**
 * Get expected fields for an endpoint
 * @param endpoint - Endpoint name
 * @returns Array of field names we expect
 */
export function getExpectedFields(endpoint: string): string[] {
  const mappings = EITJE_FIELD_MAPPINGS[endpoint as keyof typeof EITJE_FIELD_MAPPINGS];
  return mappings ? Object.keys(mappings) : [];
}

/**
 * Log field discovery - identifies unexpected fields in API response
 * @param record - API response record
 * @param endpoint - Endpoint name
 * @returns Array of unexpected field names found
 */
export function discoverNewFields(record: any, endpoint: string): string[] {
  const expectedPaths = new Set<string>();
  const mappings = EITJE_FIELD_MAPPINGS[endpoint as keyof typeof EITJE_FIELD_MAPPINGS];
  
  if (mappings) {
    Object.values(mappings).forEach((paths: any) => {
      paths.forEach((path: string) => expectedPaths.add(path.split('.')[0]));
    });
  }
  
  const actualFields = Object.keys(record || {});
  return actualFields.filter(field => !expectedPaths.has(field));
}
