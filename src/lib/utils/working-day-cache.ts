/**
 * Working Day Cache Utility (Client-Safe)
 * 
 * This file is safe to import in Client Components.
 * It only manages the cache, without importing MongoDB.
 */

// Cache settings to avoid repeated DB queries
let cachedSettings: { workingDayStartHour: number; cachedAt: number } | null = null;

/**
 * Clear cache (call after updating settings)
 * This is safe to call from Client Components
 */
export function clearWorkingDayCache(): void {
  cachedSettings = null;
}

/**
 * Get cached settings (for server-side use only)
 * This is exported for internal use by working-day.ts
 */
export function getCachedSettings(): { workingDayStartHour: number; cachedAt: number } | null {
  return cachedSettings;
}

/**
 * Set cached settings (for server-side use only)
 * This is exported for internal use by working-day.ts
 */
export function setCachedSettings(hour: number): void {
  cachedSettings = {
    workingDayStartHour: hour,
    cachedAt: Date.now(),
  };
}

