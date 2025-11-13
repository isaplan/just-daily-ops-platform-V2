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
