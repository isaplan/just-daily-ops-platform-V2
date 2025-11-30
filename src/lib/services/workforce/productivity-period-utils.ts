/**
 * Productivity Period Utilities
 * Pure utility functions for period/date calculations
 * No dependencies - can be used anywhere
 */

/**
 * Aggregate by period (Year/Month/Week/Day/Hour)
 */
export function aggregateByPeriod(
  date: Date,
  periodType: 'year' | 'month' | 'week' | 'day' | 'hour'
): string {
  const year = date.getFullYear();
  
  if (periodType === 'year') {
    return String(year);
  }
  
  if (periodType === 'month') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  if (periodType === 'week') {
    const week = getWeekNumber(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  
  if (periodType === 'hour') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}`;
  }
  
  // day (default)
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}




