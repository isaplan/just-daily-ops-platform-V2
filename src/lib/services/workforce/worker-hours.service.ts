/**
 * Worker Hours Service Layer
 * Service functions to fetch hours breakdown for a specific worker
 * Checks aggregated collection first, falls back to on-demand calculation
 */

import { getProcessedHours, HoursFilters } from '@/lib/services/graphql/queries';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export interface WorkerHoursBreakdown {
  gewerkt: number; // Worked hours (type_name is null/empty)
  ziek: number; // Sick leave hours
  verlof: number; // Leave/vacation hours
  total: number; // Total hours
}

/**
 * Get period type from date range
 */
function getPeriodType(startDate: string, endDate: string): 'thisMonth' | 'lastMonth' | 'total' | null {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if it's this month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  if (start.getTime() === thisMonthStart.getTime() && end.getTime() === thisMonthEnd.getTime()) {
    return 'thisMonth';
  }
  
  // Check if it's last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  if (start.getTime() === lastMonthStart.getTime() && end.getTime() === lastMonthEnd.getTime()) {
    return 'lastMonth';
  }
  
  // Check if it's total (all time)
  const totalStart = new Date(2000, 0, 1);
  if (start.getTime() <= totalStart.getTime() && end >= now) {
    return 'total';
  }
  
  return null; // Custom period
}

/**
 * Fetch hours breakdown for a worker
 * Checks aggregated collection first for common periods, calculates on-demand for custom periods
 * @param eitjeUserId - Worker's Eitje user ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Hours breakdown by type
 */
/**
 * Fetch all records by paginating through all pages
 */
async function fetchAllProcessedHours(
  startDate: string,
  endDate: string,
  filters: HoursFilters
): Promise<any[]> {
  const allRecords: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getProcessedHours(
      startDate,
      endDate,
      page,
      1000, // Large limit per page
      filters
    );

    if (result.success && result.records) {
      allRecords.push(...result.records);
      
      // Check if there are more pages
      hasMore = page < (result.totalPages || 1);
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

export async function fetchWorkerHoursBreakdown(
  eitjeUserId: number,
  startDate: string,
  endDate: string
): Promise<WorkerHoursBreakdown> {
  console.log(`[Worker Hours Service] Fetching hours breakdown for worker ${eitjeUserId}`, { startDate, endDate });
  
  // Check if this is a common period (thisMonth, lastMonth, total)
  const periodType = getPeriodType(startDate, endDate);
  
  if (periodType) {
    // Try aggregated collection first
    try {
      const db = await getDatabase();
      const aggregated = await db.collection('worker_profiles_aggregated').findOne({
        eitjeUserId
      });
      
      if (aggregated && aggregated[periodType]?.hoursBreakdown) {
        console.log(`[Worker Hours Service] ✅ Found pre-computed hours breakdown for ${periodType}`);
        return aggregated[periodType].hoursBreakdown;
      }
    } catch (error) {
      console.warn('[Worker Hours Service] Error checking aggregated collection, falling back to calculation:', error);
    }
  }
  
  // Fallback to on-demand calculation
  console.log(`[Worker Hours Service] Calculating hours breakdown on-demand`);
  
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
    
    const workedRecords = await fetchAllProcessedHours(
      startDate,
      endDate,
      workedFilters
    );

    breakdown.gewerkt = workedRecords.reduce((sum, record) => {
      return sum + (record.worked_hours || 0);
    }, 0);

    // Fetch sick leave hours
    const ziekFilters: HoursFilters = {
      userId: eitjeUserId,
      typeName: 'Ziek',
    };
    
    const ziekRecords = await fetchAllProcessedHours(
      startDate,
      endDate,
      ziekFilters
    );

    breakdown.ziek = ziekRecords.reduce((sum, record) => {
      return sum + (record.worked_hours || 0);
    }, 0);

    // Fetch leave/vacation hours
    const verlofFilters: HoursFilters = {
      userId: eitjeUserId,
      typeName: 'Verlof',
    };
    
    const verlofRecords = await fetchAllProcessedHours(
      startDate,
      endDate,
      verlofFilters
    );

    breakdown.verlof = verlofRecords.reduce((sum, record) => {
      return sum + (record.worked_hours || 0);
    }, 0);

    breakdown.total = breakdown.gewerkt + breakdown.ziek + breakdown.verlof;
  } catch (error) {
    console.error('[Worker Hours Service] Error fetching hours breakdown:', error);
    // Return zeros on error to prevent UI crashes
  }

  return breakdown;
}


