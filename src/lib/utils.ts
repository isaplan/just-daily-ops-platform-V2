import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number with thousand separators (European format: 1.000.000)
 * If value is >= 1.000, rounds to whole numbers (no decimals)
 */
export function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  // If value is >= 1000, round to whole number (0 decimals)
  const actualDecimals = Math.abs(num) >= 1000 ? 0 : decimals;
  const rounded = actualDecimals === 0 ? Math.round(num) : num;
  
  const fixed = rounded.toFixed(actualDecimals);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

/**
 * Format currency with thousand separators (European format: €1.000.000,00)
 * If value is >= 1.000, rounds to whole numbers (no decimals)
 */
export function formatCurrency(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  const formatted = formatNumber(num, decimals);
  return formatted === '-' ? '-' : `€${formatted}`;
}
