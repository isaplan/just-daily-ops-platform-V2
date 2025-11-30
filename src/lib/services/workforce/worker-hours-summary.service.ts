/**
 * Worker Hours Summary Service Layer
 * Service functions to calculate contract hours vs worked hours, and leave accrual vs taken
 * Checks aggregated collection first, falls back to on-demand calculation
 */

import { fetchWorkerHoursBreakdown } from './worker-hours.service';
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

export interface WorkerHoursSummary {
  // Worked Hours Section
  workedHours: {
    totalContractHours: number;  // contractHours * weeks in period
    totalHoursWorked: number;    // gewerkt hours
    difference: number;           // worked - contract (+ or -)
  };
  
  // Leave Hours Section
  leaveHours: {
    totalOpgebouwdVerlof: number;  // Accrued leave (calculated based on Dutch law)
    totalOpgenomenVerlof: number;  // Taken leave (verlof hours)
    difference: number;             // accrued - taken (+ or -)
  };
  
  // Total Results
  totalResults: {
    contractHours: number;
    workedHours: number;
    contractDifference: number;
    accruedLeave: number;
    takenLeave: number;
    leaveDifference: number;
  };
}

/**
 * Calculate weeks between two dates
 */
function calculateWeeks(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays / 7;
}

/**
 * Calculate accrued leave based on Dutch law (25 days/year = ~200 hours/year)
 * This is a standard calculation - can be overridden with actual Eitje data if available
 */
function calculateAccruedLeave(
  contractStartDate: Date,
  contractEndDate: Date | null,
  periodStartDate: Date,
  periodEndDate: Date
): number {
  // Calculate contract duration in years
  const actualContractEnd = contractEndDate && contractEndDate < periodEndDate 
    ? contractEndDate 
    : periodEndDate;
  
  const contractDurationYears = (actualContractEnd.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  // Dutch standard: 25 days/year = ~200 hours/year (assuming 8 hours/day)
  const hoursPerYear = 200;
  const accruedLeave = Math.max(0, contractDurationYears * hoursPerYear);
  
  return accruedLeave;
}

/**
 * Fetch hours summary for a worker
 * @param eitjeUserId - Worker's Eitje user ID
 * @param contractHours - Weekly contract hours
 * @param contractStartDate - Contract start date (YYYY-MM-DD)
 * @param contractEndDate - Contract end date (YYYY-MM-DD or null for active)
 * @param startDate - Period start date (YYYY-MM-DD)
 * @param endDate - Period end date (YYYY-MM-DD)
 * @returns Hours summary with contract vs worked, and leave accrual vs taken
 */
export async function fetchWorkerHoursSummary(
  eitjeUserId: number,
  contractHours: number | null,
  contractStartDate: string,
  contractEndDate: string | null,
  startDate: string,
  endDate: string
): Promise<WorkerHoursSummary> {
  console.log(`[Worker Hours Summary Service] Fetching hours summary for worker ${eitjeUserId}`, { startDate, endDate });
  
  // Check if this is a common period
  const periodType = getPeriodType(startDate, endDate);
  
  if (periodType) {
    // Try aggregated collection first
    try {
      const db = await getDatabase();
      const aggregated = await db.collection('worker_profiles_aggregated').findOne({
        eitjeUserId
      });
      
      if (aggregated && aggregated[periodType]?.hoursSummary) {
        console.log(`[Worker Hours Summary Service] ✅ Found pre-computed hours summary for ${periodType}`);
        const summary = aggregated[periodType].hoursSummary;
        return {
          workedHours: {
            totalContractHours: summary.totalContractHours,
            totalHoursWorked: summary.totalHoursWorked,
            difference: summary.contractDifference,
          },
          leaveHours: {
            totalOpgebouwdVerlof: summary.totalOpgebouwdVerlof,
            totalOpgenomenVerlof: summary.totalOpgenomenVerlof,
            difference: summary.leaveDifference,
          },
          totalResults: {
            contractHours: summary.totalContractHours,
            workedHours: summary.totalHoursWorked,
            contractDifference: summary.contractDifference,
            accruedLeave: summary.totalOpgebouwdVerlof,
            takenLeave: summary.totalOpgenomenVerlof,
            leaveDifference: summary.leaveDifference,
          },
        };
      }
    } catch (error) {
      console.warn('[Worker Hours Summary Service] Error checking aggregated collection, falling back to calculation:', error);
    }
  }
  
  // Fallback to on-demand calculation
  console.log(`[Worker Hours Summary Service] Calculating hours summary on-demand`);
  
  try {
    // Parse dates
    const contractStart = new Date(contractStartDate);
    const contractEnd = contractEndDate ? new Date(contractEndDate) : null;
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    
    // Calculate actual period (intersection of contract period and query period)
    const actualStart = contractStart > periodStart ? contractStart : periodStart;
    const actualEnd = contractEnd && contractEnd < periodEnd ? contractEnd : periodEnd;
    
    // Ensure dates are valid
    if (actualStart >= actualEnd) {
      // No valid period, return zeros
      return {
        workedHours: {
          totalContractHours: 0,
          totalHoursWorked: 0,
          difference: 0,
        },
        leaveHours: {
          totalOpgebouwdVerlof: 0,
          totalOpgenomenVerlof: 0,
          difference: 0,
        },
        totalResults: {
          contractHours: 0,
          workedHours: 0,
          contractDifference: 0,
          accruedLeave: 0,
          takenLeave: 0,
          leaveDifference: 0,
        },
      };
    }
    
    // 1. Calculate Total Contract Hours
    const weeksInPeriod = calculateWeeks(actualStart, actualEnd);
    const totalContractHours = (contractHours || 0) * weeksInPeriod;
    
    // 2. Fetch Total Hours Worked (gewerkt) - with error handling
    let hoursBreakdown;
    try {
      hoursBreakdown = await fetchWorkerHoursBreakdown(
        eitjeUserId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error('[Worker Hours Summary] Error fetching hours breakdown:', error);
      // Return zeros for worked hours if fetch fails
      hoursBreakdown = {
        gewerkt: 0,
        ziek: 0,
        verlof: 0,
        total: 0,
      };
    }
    
    const totalHoursWorked = hoursBreakdown.gewerkt;
    
    // 3. Calculate Total Opgebouwd Verlof (accrued leave)
    const totalOpgebouwdVerlof = calculateAccruedLeave(
      contractStart,
      contractEnd,
      periodStart,
      periodEnd
    );
    
    // 4. Get Total Opgenomen Verlof (taken leave)
    const totalOpgenomenVerlof = hoursBreakdown.verlof;
    
    // Calculate differences
    const workedDifference = totalHoursWorked - totalContractHours;
    const leaveDifference = totalOpgebouwdVerlof - totalOpgenomenVerlof;
    
    return {
      workedHours: {
        totalContractHours,
        totalHoursWorked,
        difference: workedDifference,
      },
      leaveHours: {
        totalOpgebouwdVerlof,
        totalOpgenomenVerlof,
        difference: leaveDifference,
      },
      totalResults: {
        contractHours: totalContractHours,
        workedHours: totalHoursWorked,
        contractDifference: workedDifference,
        accruedLeave: totalOpgebouwdVerlof,
        takenLeave: totalOpgenomenVerlof,
        leaveDifference: leaveDifference,
      },
    };
  } catch (error) {
    console.error('[Worker Hours Summary] Error calculating hours summary:', error);
    // Return zeros on error to prevent UI crashes
    return {
      workedHours: {
        totalContractHours: 0,
        totalHoursWorked: 0,
        difference: 0,
      },
      leaveHours: {
        totalOpgebouwdVerlof: 0,
        totalOpgenomenVerlof: 0,
        difference: 0,
      },
      totalResults: {
        contractHours: 0,
        workedHours: 0,
        contractDifference: 0,
        accruedLeave: 0,
        takenLeave: 0,
        leaveDifference: 0,
      },
    };
  }
}

