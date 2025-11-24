/**
 * Time utility functions for hierarchical time-series data
 * Shared across products aggregation and labor aggregation services
 */

/**
 * Get year key for hierarchical time-series (e.g., "2025")
 */
export function getYearKey(date: Date): string {
  return String(date.getUTCFullYear());
}

/**
 * Get month key for hierarchical time-series (e.g., "2025-11")
 */
export function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get ISO week string (e.g., "2025-W46")
 */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get week key for hierarchical time-series (returns week number only, e.g., "46")
 */
export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return String(weekNo).padStart(2, '0');
}

/**
 * Check if date is older than one month
 */
export function isOlderThanOneMonth(date: Date): boolean {
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return date < oneMonthAgo;
}

/**
 * Check if date is older than one week
 */
export function isOlderThanOneWeek(date: Date): boolean {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date < oneWeekAgo;
}

/**
 * Check if date is in current week
 */
export function isCurrentWeek(date: Date): boolean {
  const now = new Date();
  const nowWeek = getWeekKey(now);
  const dateWeek = getWeekKey(date);
  const nowYear = getYearKey(now);
  const dateYear = getYearKey(date);
  return nowWeek === dateWeek && nowYear === dateYear;
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}


