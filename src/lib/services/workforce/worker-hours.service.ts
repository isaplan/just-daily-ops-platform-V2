/**
 * Worker Hours Service Layer
 * Service functions to fetch hours breakdown for a specific worker
 */

import { getProcessedHours, HoursFilters } from '@/lib/services/graphql/queries';

export interface WorkerHoursBreakdown {
  gewerkt: number; // Worked hours (type_name is null/empty)
  ziek: number; // Sick leave hours
  verlof: number; // Leave/vacation hours
  total: number; // Total hours
}

/**
 * Fetch hours breakdown for a worker
 * @param eitjeUserId - Worker's Eitje user ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Hours breakdown by type
 */
export async function fetchWorkerHoursBreakdown(
  eitjeUserId: number,
  startDate: string,
  endDate: string
): Promise<WorkerHoursBreakdown> {
  const breakdown: WorkerHoursBreakdown = {
    gewerkt: 0,
    ziek: 0,
    verlof: 0,
    total: 0,
  };

  try {
    // Fetch worked hours (type_name is null/empty or 'WORKED')
    const workedFilters: HoursFilters = {
      userId: eitjeUserId,
      typeName: null, // This will be converted to 'WORKED' by the service
    };
    
    const workedResult = await getProcessedHours(
      startDate,
      endDate,
      1,
      1000, // Large limit to get all records
      workedFilters
    );

    if (workedResult.success && workedResult.records) {
      breakdown.gewerkt = workedResult.records.reduce((sum, record) => {
        return sum + (record.worked_hours || 0);
      }, 0);
    }

    // Fetch sick leave hours
    const ziekFilters: HoursFilters = {
      userId: eitjeUserId,
      typeName: 'Ziek',
    };
    
    const ziekResult = await getProcessedHours(
      startDate,
      endDate,
      1,
      1000,
      ziekFilters
    );

    if (ziekResult.success && ziekResult.records) {
      breakdown.ziek = ziekResult.records.reduce((sum, record) => {
        return sum + (record.worked_hours || 0);
      }, 0);
    }

    // Fetch leave/vacation hours
    const verlofFilters: HoursFilters = {
      userId: eitjeUserId,
      typeName: 'Verlof',
    };
    
    const verlofResult = await getProcessedHours(
      startDate,
      endDate,
      1,
      1000,
      verlofFilters
    );

    if (verlofResult.success && verlofResult.records) {
      breakdown.verlof = verlofResult.records.reduce((sum, record) => {
        return sum + (record.worked_hours || 0);
      }, 0);
    }

    breakdown.total = breakdown.gewerkt + breakdown.ziek + breakdown.verlof;
  } catch (error) {
    console.error('[Worker Hours Service] Error fetching hours breakdown:', error);
  }

  return breakdown;
}


