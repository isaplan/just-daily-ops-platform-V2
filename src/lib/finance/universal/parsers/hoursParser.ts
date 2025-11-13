import { parseNumber } from './numberParser';

/**
 * Parse hours from HH:MM format or decimal
 */
export function parseHours(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  // Handle HH:MM format (e.g., "8:30" or "125:45")
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const timeMatch = trimmed.match(/^(\d{1,3}):([0-5]\d)$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours + (minutes / 60);
    }
  }
  
  // Fallback to parseNumber for plain numeric strings/numbers
  return parseNumber(value);
}
