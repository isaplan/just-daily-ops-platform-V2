/**
 * Worker Hourly Revenue Service
 * Calculates absolute and relative revenue per worker per hour
 * 
 * Absolute Revenue: Service staff only (direct waiter revenue from workerBreakdownHourly)
 * Relative Revenue: All staff (proportional sharing based on hours worked)
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { getTeamCategory } from '@/lib/utils/team-categorization';

export interface WorkerHourlyHours {
  workerId: string;
  workerName: string;
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other';
  date: string; // YYYY-MM-DD
  locationId: ObjectId;
  hoursByHour: Map<number, number>; // hour (0-23) -> hours worked in that hour
}

export interface WorkerHourlyRevenue {
  workerId: string;
  workerName: string;
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other';
  date: string;
  locationId: ObjectId;
  absoluteRevenue: number; // Direct waiter revenue (service staff only)
  relativeRevenue: number; // Proportional revenue (all staff)
  totalHours: number;
}

/**
 * Calculate hourly hours worked per worker from processed_hours_aggregated
 * Extracts which hours (0-23) each worker worked based on startTime/endTime
 */
export async function calculateWorkerHourlyHours(
  eitjeUserId: number,
  userName: string,
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other',
  startDate: Date,
  endDate: Date
): Promise<Map<string, WorkerHourlyHours>> {
  const db = await getDatabase();
  const result = new Map<string, WorkerHourlyHours>();

  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query processed_hours_aggregated
    const records = await db.collection('processed_hours_aggregated')
      .find({
        $or: [
          { userId: eitjeUserId },
          { user_id: eitjeUserId },
          { eitjeUserId: eitjeUserId },
        ],
        date: {
          $gte: startDateStr,
          $lte: endDateStr,
        },
      })
      .toArray();

    for (const record of records) {
      const date = record.date instanceof Date
        ? record.date.toISOString().split('T')[0]
        : String(record.date).split('T')[0];
      
      const locationId = record.locationId instanceof ObjectId
        ? record.locationId
        : new ObjectId(record.locationId);
      
      const key = `${date}_${locationId.toString()}_${eitjeUserId}`;
      
      if (!result.has(key)) {
        result.set(key, {
          workerId: String(eitjeUserId),
          workerName: userName,
          teamCategory,
          date,
          locationId,
          hoursByHour: new Map<number, number>(),
        });
      }

      const workerHours = result.get(key)!;
      
      // Extract hours from startTime/endTime
      const startTime = record.startTime || record.start_time || record.extracted?.start || record.extracted?.startTime;
      const endTime = record.endTime || record.end_time || record.extracted?.end || record.extracted?.endTime;
      
      if (startTime && endTime) {
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const startHour = start.getHours();
            const endHour = end.getHours();
            const startMinutes = start.getMinutes();
            const endMinutes = end.getMinutes();
            
            // Calculate hours worked in each hour slot
            if (startHour === endHour) {
              // Same hour - calculate fractional hours
              const minutesWorked = endMinutes - startMinutes;
              const hoursWorked = minutesWorked / 60;
              const existing = workerHours.hoursByHour.get(startHour) || 0;
              workerHours.hoursByHour.set(startHour, existing + hoursWorked);
            } else {
              // Multiple hours - calculate fractional for start/end, full hours in between
              // Start hour: from startMinutes to 60
              const startHourFraction = (60 - startMinutes) / 60;
              const existingStart = workerHours.hoursByHour.get(startHour) || 0;
              workerHours.hoursByHour.set(startHour, existingStart + startHourFraction);
              
              // Full hours in between
              for (let h = startHour + 1; h < endHour; h++) {
                const existing = workerHours.hoursByHour.get(h) || 0;
                workerHours.hoursByHour.set(h, existing + 1);
              }
              
              // End hour: from 0 to endMinutes
              const endHourFraction = endMinutes / 60;
              const existingEnd = workerHours.hoursByHour.get(endHour) || 0;
              workerHours.hoursByHour.set(endHour, existingEnd + endHourFraction);
            }
          }
        } catch (e) {
          // If time parsing fails, use workedHours as fallback (distribute evenly across day)
          const workedHours = Number(record.workedHours || record.worked_hours || 0);
          if (workedHours > 0) {
            // Distribute evenly across 8 hours (typical shift)
            const hoursPerSlot = workedHours / 8;
            for (let h = 10; h < 18; h++) {
              const existing = workerHours.hoursByHour.get(h) || 0;
              workerHours.hoursByHour.set(h, existing + hoursPerSlot);
            }
          }
        }
      } else {
        // No start/end time - use workedHours as fallback
        const workedHours = Number(record.workedHours || record.worked_hours || 0);
        if (workedHours > 0) {
          const hoursPerSlot = workedHours / 8;
          for (let h = 10; h < 18; h++) {
            const existing = workerHours.hoursByHour.get(h) || 0;
            workerHours.hoursByHour.set(h, existing + hoursPerSlot);
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`[Worker Hourly Revenue] Error calculating hourly hours for ${eitjeUserId}:`, error);
    return new Map();
  }
}

/**
 * Calculate absolute revenue (service staff only)
 * Uses workerBreakdownHourly from bork_aggregated
 */
export async function calculateAbsoluteRevenue(
  userName: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const db = await getDatabase();
  const revenueMap = new Map<string, number>();

  try {
    if (!userName) {
      return revenueMap;
    }

    // Query bork_aggregated
    const borkRecords = await db.collection('bork_aggregated')
      .find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    // Extract hourly revenue from workerBreakdownHourly
    for (const record of borkRecords) {
      const recordDate = record.date instanceof Date
        ? record.date.toISOString().split('T')[0]
        : new Date(record.date).toISOString().split('T')[0];

      if (record.workerBreakdownHourly && Array.isArray(record.workerBreakdownHourly)) {
        for (const workerHour of record.workerBreakdownHourly) {
          const waiterName = workerHour.waiterName || '';
          
          // Match waiter by name (case-insensitive)
          if (
            waiterName.toLowerCase() === userName.toLowerCase() ||
            waiterName.toLowerCase().includes(userName.toLowerCase()) ||
            userName.toLowerCase().includes(waiterName.toLowerCase())
          ) {
            const existingRevenue = revenueMap.get(recordDate) || 0;
            revenueMap.set(recordDate, existingRevenue + Number(workerHour.totalRevenue || 0));
          }
        }
      }
    }

    return revenueMap;
  } catch (error) {
    console.error(`[Worker Hourly Revenue] Error calculating absolute revenue for "${userName}":`, error);
    return new Map();
  }
}

/**
 * Calculate relative revenue (all staff, proportional)
 * Uses divisionHourlyBreakdown from bork_aggregated
 * Allocates proportionally based on hours worked per hour
 */
export async function calculateRelativeRevenue(
  eitjeUserId: number,
  userName: string,
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other',
  locationId: ObjectId,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const db = await getDatabase();
  const revenueMap = new Map<string, number>();

  try {
    // Get hourly hours worked
    const workerHourlyHours = await calculateWorkerHourlyHours(
      eitjeUserId,
      userName,
      teamCategory,
      startDate,
      endDate
    );

    // Query bork_aggregated for division hourly breakdown
    const borkRecords = await db.collection('bork_aggregated')
      .find({
        locationId: locationId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    // Process each day
    for (const record of borkRecords) {
      const recordDate = record.date instanceof Date
        ? record.date.toISOString().split('T')[0]
        : new Date(record.date).toISOString().split('T')[0];

      const key = `${recordDate}_${locationId.toString()}_${eitjeUserId}`;
      const workerHours = workerHourlyHours.get(key);
      
      if (!workerHours || workerHours.hoursByHour.size === 0) {
        continue; // No hours worked this day
      }

      // Determine which division revenue to use
      let division: 'Food' | 'Beverage' | null = null;
      if (teamCategory === 'Kitchen') {
        division = 'Food';
      } else if (teamCategory === 'Service') {
        // Service staff share ALL revenue (Food + Beverage)
        division = null; // Will use total hourly revenue
      }

      // Get division hourly breakdown
      if (!record.divisionHourlyBreakdown || !Array.isArray(record.divisionHourlyBreakdown)) {
        continue;
      }

      // Pre-calculate all workers' hourly hours for this day (once per day, not per hour)
      const allWorkersHoursRecords = await db.collection('processed_hours_aggregated')
        .find({
          locationId: locationId,
          date: recordDate,
        })
        .toArray();

      // Build hourly hours map for all workers (hour -> total hours)
      const allWorkersHoursByHour = new Map<number, number>(); // hour -> total hours
      
      for (const workerRecord of allWorkersHoursRecords) {
        const workerStartTime = workerRecord.startTime || workerRecord.start_time || workerRecord.extracted?.start;
        const workerEndTime = workerRecord.endTime || workerRecord.end_time || workerRecord.extracted?.end;
        
        if (workerStartTime && workerEndTime) {
          try {
            const workerStart = new Date(workerStartTime);
            const workerEnd = new Date(workerEndTime);
            
            if (!isNaN(workerStart.getTime()) && !isNaN(workerEnd.getTime())) {
              const workerStartHour = workerStart.getHours();
              const workerEndHour = workerEnd.getHours();
              
              // Calculate hours for each hour slot
              for (let h = workerStartHour; h <= workerEndHour; h++) {
                let workerHoursInThisHour = 0;
                
                if (workerStartHour === workerEndHour) {
                  // Same hour - calculate fractional
                  const minutesWorked = workerEnd.getMinutes() - workerStart.getMinutes();
                  workerHoursInThisHour = minutesWorked / 60;
                } else if (h === workerStartHour) {
                  // Start hour
                  workerHoursInThisHour = (60 - workerStart.getMinutes()) / 60;
                } else if (h === workerEndHour) {
                  // End hour
                  workerHoursInThisHour = workerEnd.getMinutes() / 60;
                } else if (h > workerStartHour && h < workerEndHour) {
                  // Full hour
                  workerHoursInThisHour = 1;
                }
                
                const existing = allWorkersHoursByHour.get(h) || 0;
                allWorkersHoursByHour.set(h, existing + workerHoursInThisHour);
              }
            }
          } catch (e) {
            // Skip if time parsing fails
          }
        }
      }

      let totalRelativeRevenue = 0;

      // Calculate revenue per hour
      for (let hour = 0; hour < 24; hour++) {
        const workerHoursInHour = workerHours.hoursByHour.get(hour) || 0;
        if (workerHoursInHour === 0) {
          continue; // Worker didn't work this hour
        }

        // Get hourly revenue
        let hourlyRevenue = 0;

        if (division === null) {
          // Service staff: share total revenue (Food + Beverage)
          const foodHour = record.divisionHourlyBreakdown.find(
            (d: any) => d.division === 'Food' && d.hour === hour
          );
          const beverageHour = record.divisionHourlyBreakdown.find(
            (d: any) => d.division === 'Beverage' && d.hour === hour
          );
          
          hourlyRevenue = (foodHour?.totalRevenue || 0) + (beverageHour?.totalRevenue || 0);
        } else {
          // Kitchen/Bar staff: share division-specific revenue
          const divisionHour = record.divisionHourlyBreakdown.find(
            (d: any) => d.division === division && d.hour === hour
          );
          
          if (!divisionHour) {
            continue; // No revenue for this division/hour
          }
          
          hourlyRevenue = divisionHour.totalRevenue || 0;
        }

        // Get total hours for all workers in this hour
        const totalDivisionHoursInHour = allWorkersHoursByHour.get(hour) || 0;

        // Calculate proportional revenue for this hour
        if (totalDivisionHoursInHour > 0 && hourlyRevenue > 0) {
          const proportionalRevenue = (workerHoursInHour / totalDivisionHoursInHour) * hourlyRevenue;
          totalRelativeRevenue += proportionalRevenue;
        }
      }

      if (totalRelativeRevenue > 0) {
        revenueMap.set(recordDate, totalRelativeRevenue);
      }
    }

    return revenueMap;
  } catch (error) {
    console.error(`[Worker Hourly Revenue] Error calculating relative revenue for ${eitjeUserId}:`, error);
    return new Map();
  }
}

/**
 * Calculate both absolute and relative revenue for a worker
 */
export async function calculateWorkerHourlyRevenue(
  eitjeUserId: number,
  userName: string,
  teamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other',
  locationId: ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{
  absoluteRevenue: Map<string, number>;
  relativeRevenue: Map<string, number>;
}> {
  const [absoluteRevenue, relativeRevenue] = await Promise.all([
    calculateAbsoluteRevenue(userName, startDate, endDate),
    calculateRelativeRevenue(eitjeUserId, userName, teamCategory, locationId, startDate, endDate),
  ]);

  return {
    absoluteRevenue,
    relativeRevenue,
  };
}

