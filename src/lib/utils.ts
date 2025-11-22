import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number with European notation (10.000,89) and abbreviations (1.7m, 1.5k)
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param useAbbreviation - Whether to use abbreviations for large numbers (default: true)
 */
export function formatNumber(num: number | null | undefined, decimals: number = 2, useAbbreviation: boolean = true): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // Use abbreviations for large numbers if enabled
  if (useAbbreviation) {
    // Millions (>= 1.000.000)
    if (absNum >= 1000000) {
      const millions = absNum / 1000000;
      // Use dot for decimal in abbreviations (e.g., "1.7m" not "1,7m")
      const formatted = millions.toFixed(1);
      return `${sign}${formatted}m`;
    }
    
    // Thousands (>= 1.000)
    if (absNum >= 1000) {
      const thousands = absNum / 1000;
      // Use dot for decimal in abbreviations (e.g., "245.2k" not "245,2k")
      const formatted = thousands.toFixed(1);
      return `${sign}${formatted}k`;
    }
  }
  
  // Format with European notation (dots for thousands, comma for decimals)
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Return with comma as decimal separator
  return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

/**
 * Format currency with European notation (€10.000,89) and abbreviations (€1.7m, €1.5k)
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param useAbbreviation - Whether to use abbreviations for large numbers (default: true)
 */
export function formatCurrency(num: number | null | undefined, decimals: number = 2, useAbbreviation: boolean = true): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  const formatted = formatNumber(num, decimals, useAbbreviation);
  return formatted === '-' ? '-' : `€${formatted}`;
}
