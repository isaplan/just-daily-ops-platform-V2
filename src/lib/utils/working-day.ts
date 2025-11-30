/**
 * Working Day Utility (Server-Side Only)
 * 
 * Business Rule: Working days start at configured hour (default: 06:00) and end at (hour-1):59:59 the next day.
 * This ensures revenue and hours are attributed to the correct working day.
 * 
 * Reads workingDayStartHour from company_settings collection (cached for performance).
 * 
 * ⚠️ WARNING: This file imports MongoDB and should ONLY be used in Server Components and API Routes.
 * For Client Components, use working-day-cache.ts instead.
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { getCachedSettings, setCachedSettings } from './working-day-cache';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get working day start hour from company settings (with caching)
 */
async function getWorkingDayStartHour(): Promise<number> {
  // Check cache first
  const cached = getCachedSettings();
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.workingDayStartHour;
  }
  
  try {
    const db = await getDatabase();
    const settings = await db.collection('company_settings').findOne({});
    const hour = settings?.workingDayStartHour ?? 6; // Default: 06:00
    
    // Update cache
    setCachedSettings(hour);
    
    return hour;
  } catch (error) {
    console.error('[Working Day] Error fetching settings, using default:', error);
    return 6; // Default fallback
  }
}

/**
 * Convert a timestamp to working day date string (YYYY-MM-DD)
 * Shifts the date by -workingDayStartHour to account for working day start time
 */
export async function getWorkingDay(date: Date | string): Promise<string> {
  const dateObj = date instanceof Date ? date : new Date(date);
  const startHour = await getWorkingDayStartHour();
  
  // Subtract startHour to shift to working day
  const workingDayDate = new Date(dateObj);
  workingDayDate.setHours(workingDayDate.getHours() - startHour);
  
  // Return as YYYY-MM-DD string
  return workingDayDate.toISOString().split('T')[0];
}

/**
 * Convert a timestamp to working day Date object (at midnight UTC)
 */
export async function getWorkingDayDate(date: Date | string): Promise<Date> {
  const workingDayStr = await getWorkingDay(date);
  return new Date(workingDayStr + 'T00:00:00.000Z');
}

/**
 * Convert calendar date range to working day date range
 * Used for querying data that needs working day alignment
 */
export async function getWorkingDayRange(startDate: Date | string, endDate: Date | string): Promise<{
  start: Date;
  end: Date;
}> {
  const start = await getWorkingDayDate(startDate);
  const end = await getWorkingDayDate(endDate);
  end.setHours(23, 59, 59, 999); // End of day
  
  return { start, end };
}

// Note: Cache clearing is now in working-day-cache.ts for client-side safety

