import * as XLSX from "xlsx";

/**
 * Parse date from Excel serial, ISO string, or various formats
 */
export function parseDateValue(value: any): string | null {
  if (!value) return null;
  
  // Excel serial number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  // String dates
  if (typeof value === 'string') {
    const cleaned = value.trim();
    
    // ISO format (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return cleaned.substring(0, 10);
    }
    
    // dd/mm/yyyy or dd-mm-yyyy
    const dmyMatch = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // yyyy/mm/dd or yyyy-mm-dd
    const ymdMatch = cleaned.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try Date.parse as fallback
    try {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return null;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get date range string
 */
export function getDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Unknown';
  if (!end) return formatDate(start);
  if (!start) return formatDate(end);
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}
