/**
 * Parse numeric values, handling European formats and currency symbols
 */
export function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    let cleaned = value.trim();
    
    // Remove currency symbols (€, $, £, ¥, ₹) and whitespace
    cleaned = cleaned.replace(/[€$£¥₹\s]/g, '');
    
    // Check if European format (1.234,56)
    const hasCommaDecimal = /\d+,\d{1,2}$/.test(cleaned);
    const hasDotThousands = /\d{1,3}(\.\d{3})+/.test(cleaned);
    
    if (hasCommaDecimal && hasDotThousands) {
      // European: 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasCommaDecimal && !cleaned.includes('.')) {
      // European: 1234,56 -> 1234.56
      cleaned = cleaned.replace(',', '.');
    } else {
      // US format or no decimal: remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

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

/**
 * Format number as currency
 */
export function formatCurrency(value: number | null, currency: string = '€'): string {
  if (value === null) return 'N/A';
  
  return `${currency}${value.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null, decimals: number = 1): string {
  if (value === null) return 'N/A';
  
  return `${value.toFixed(decimals)}%`;
}
