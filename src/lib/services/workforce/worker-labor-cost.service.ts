/**
 * Worker Labor Cost Service Layer
 * Service functions to fetch labor cost for a specific worker
 * Checks aggregated collection first, falls back to on-demand calculation
 */

import { getProcessedHours, HoursFilters } from '@/lib/services/graphql/queries';
import { getDatabase } from '@/lib/mongodb/v2-connection';

/**
 * Get period type from date range
 */
function getPeriodType(startDate: string, endDate: string): 'thisMonth' | 'lastMonth' | 'total' | null {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  if (start.getTime() === thisMonthStart.getTime() && end.getTime() === thisMonthEnd.getTime()) {
    return 'thisMonth';
  }
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  if (start.getTime() === lastMonthStart.getTime() && end.getTime() === lastMonthEnd.getTime()) {
    return 'lastMonth';
  }
  
  const totalStart = new Date(2000, 0, 1);
  if (start.getTime() <= totalStart.getTime() && end >= now) {
    return 'total';
  }
  
  return null;
}

export interface WorkerLaborCost {
  totalCost: number;
  totalHours: number;
  averageHourlyCost: number;
}

/**
 * Fetch total labor cost for a worker
 * Checks aggregated collection first for common periods, calculates on-demand for custom periods
 * @param eitjeUserId - Worker's Eitje user ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns WorkerLaborCost object with totalCost, totalHours, and averageHourlyCost
 */
export async function fetchWorkerLaborCost(
  eitjeUserId: number,
  startDate: string,
  endDate: string
): Promise<WorkerLaborCost> {
  console.log(`[Worker Labor Cost Service] Fetching labor cost for worker ${eitjeUserId}`, { startDate, endDate });
  
  // Check if this is a common period
  const periodType = getPeriodType(startDate, endDate);
  
  if (periodType) {
    // Try aggregated collection first
    try {
      const db = await getDatabase();
      const aggregated = await db.collection('worker_profiles_aggregated').findOne({
        eitjeUserId
      });
      
      if (aggregated && aggregated[periodType]?.laborCost !== undefined) {
        console.log(`[Worker Labor Cost Service] ✅ Found pre-computed labor cost for ${periodType}`);
        const laborCost = aggregated[periodType].laborCost;
        const totalHours = aggregated[periodType]?.totalHours || 0;
        return {
          totalCost: laborCost,
          totalHours: totalHours,
          averageHourlyCost: totalHours > 0 ? laborCost / totalHours : 0,
        };
      }
    } catch (error) {
      console.warn('[Worker Labor Cost Service] Error checking aggregated collection, falling back to calculation:', error);
    }
  }
  
  // Fallback to on-demand calculation
  console.log(`[Worker Labor Cost Service] Calculating labor cost on-demand`);
  
  let totalCost = 0;
  let totalHours = 0;

  try {
    // Fetch all processed hours for this worker
    const filters: HoursFilters = {
      userId: eitjeUserId,
    };
    
    // Fetch all pages to get complete data
    let page = 1;
    let hasMore = true;
    const allRecords: any[] = [];

    while (hasMore) {
      const result = await getProcessedHours(
        startDate,
        endDate,
        page,
        1000, // Large limit to get all records
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

    // Sum all wage_cost and worked_hours values
    totalCost = allRecords.reduce((sum, record) => {
      return sum + (record.wage_cost || 0);
    }, 0);
    
    totalHours = allRecords.reduce((sum, record) => {
      return sum + (record.worked_hours || 0);
    }, 0);
  } catch (error) {
    console.error('[Worker Labor Cost Service] Error fetching labor cost:', error);
  }

  return {
    totalCost,
    totalHours,
    averageHourlyCost: totalHours > 0 ? totalCost / totalHours : 0,
  };
}








