import { DUTCH_MONTHS } from '../config/constants';

/**
 * Parse month from Dutch/English names or numbers
 */
export function parseMonth(value: any): number | null {
  if (!value) return null;
  
  if (typeof value === 'number') {
    return value >= 1 && value <= 12 ? value : null;
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    
    // Check Dutch months
    if (DUTCH_MONTHS[lower]) {
      return DUTCH_MONTHS[lower];
    }
    
    // Check English months
    const englishMonths = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
    const index = englishMonths.findIndex(m => m.startsWith(lower));
    if (index >= 0) {
      return index + 1;
    }
    
    // Try numeric
    const num = parseInt(lower, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return num;
    }
  }
  
  return null;
}
