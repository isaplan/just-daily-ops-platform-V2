/**
 * Worker Aggregation Daily Service
 * Modular functions for building daily/weekly/monthly/yearly productivity breakdowns
 * Uses correct data sources: processed_hours_aggregated, unified_users, bork_raw_data
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export interface WorkerDailyHours {
  date: string; // YYYY-MM-DD
  locationId: ObjectId;
  locationName: string;
  workedHours: number;
  wageCost: number;
  typeName: string;
}

/**
 * Fetch daily hours from ALL available aggregated sources
 * ✅ Uses processed_hours_aggregated AND eitje_aggregated (hierarchical structure)
 */
export async function fetchWorkerDailyHours(
  eitjeUserId: number,
  startDate: Date,
  endDate: Date
): Promise<WorkerDailyHours[]> {
  const db = await getDatabase();

  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[Worker Daily] Fetching daily hours for user ${eitjeUserId} from ALL sources: ${startDateStr} to ${endDateStr}`);

    // ✅ SOURCE 1: processed_hours_aggregated (try multiple field names)
    const processedRecords = await db.collection('processed_hours_aggregated')
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
      .sort({ date: 1, locationId: 1 })
      .toArray();

    console.log(`[Worker Daily] Found ${processedRecords.length} records from processed_hours_aggregated`);

    // Group by date and location, sum hours and costs
    const dailyMap = new Map<string, WorkerDailyHours>();

    // Process processed_hours_aggregated records
    processedRecords.forEach((record: any) => {
      const date = record.date; // Already YYYY-MM-DD string
      const locationId = record.locationId instanceof ObjectId 
        ? record.locationId 
        : new ObjectId(record.locationId);
      const locationName = record.locationName || 'Unknown Location';
      const key = `${date}_${locationId.toString()}`;

      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          date,
          locationId,
          locationName,
          workedHours: 0,
          wageCost: 0,
          typeName: record.typeName || '',
        });
      }

      const daily = dailyMap.get(key)!;
      daily.workedHours += Number(record.workedHours || record.worked_hours || 0);
      daily.wageCost += Number(record.wageCost || record.wage_cost || 0);
    });

    // ✅ SOURCE 2: ALWAYS also extract from eitje_aggregated (merge with processed_hours_aggregated)
    console.log(`[Worker Daily] Also extracting from eitje_aggregated hierarchical structure...`);
    
    // Map eitje_user_id to unifiedUserId
    const unifiedUsers = await db.collection('unified_users')
      .find({
        'systemMappings.system': 'eitje',
        'systemMappings.externalId': String(eitjeUserId),
      })
      .toArray();

    const unifiedUserId = unifiedUsers.length > 0 ? unifiedUsers[0]._id : null;
    
    if (unifiedUserId) {
      const eitjeRecords = await db.collection('eitje_aggregated')
          .find({
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          })
          .toArray();

        console.log(`[Worker Daily] Found ${eitjeRecords.length} eitje_aggregated records to extract worker data from`);

        // Extract worker data from eitje_aggregated hierarchical structure
        let extractedFromEitje = 0;
        for (const eitjeRecord of eitjeRecords) {
          if (!eitjeRecord.hoursByDay || !Array.isArray(eitjeRecord.hoursByDay)) {
            continue;
          }

          const recordDate = eitjeRecord.date instanceof Date
            ? eitjeRecord.date.toISOString().split('T')[0]
            : new Date(eitjeRecord.date).toISOString().split('T')[0];

          // Skip if outside date range
          if (recordDate < startDateStr || recordDate > endDateStr) {
            continue;
          }

          // Extract from hoursByDay -> byLocation -> byTeam -> byWorker
          for (const dayData of eitjeRecord.hoursByDay) {
            if (dayData.date !== recordDate) continue;

            if (dayData.byLocation && Array.isArray(dayData.byLocation)) {
              for (const locData of dayData.byLocation) {
                const locationId = locData.locationId instanceof ObjectId
                  ? locData.locationId
                  : new ObjectId(locData.locationId);
                const locationName = locData.locationName || 'Unknown Location';

                if (locData.byTeam && Array.isArray(locData.byTeam)) {
                  for (const teamData of locData.byTeam) {
                    if (teamData.byWorker && Array.isArray(teamData.byWorker)) {
                      for (const workerData of teamData.byWorker) {
                        // Match worker by unifiedUserId
                        const workerUnifiedId = workerData.unifiedUserId instanceof ObjectId
                          ? workerData.unifiedUserId
                          : new ObjectId(workerData.unifiedUserId);
                        
                        if (workerUnifiedId.toString() !== unifiedUserId.toString()) {
                          continue; // Skip other workers
                        }

                        const key = `${recordDate}_${locationId.toString()}`;
                        
                        if (!dailyMap.has(key)) {
                          dailyMap.set(key, {
                            date: recordDate,
                            locationId,
                            locationName,
                            workedHours: 0,
                            wageCost: 0,
                            typeName: '',
                          });
                        }

                        const daily = dailyMap.get(key)!;
                        daily.workedHours += Number(workerData.totalHoursWorked || 0);
                        daily.wageCost += Number(workerData.totalWageCost || 0);
                        extractedFromEitje++;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        console.log(`[Worker Daily] Extracted ${extractedFromEitje} worker entries from eitje_aggregated hierarchical structure`);
    } else {
      console.warn(`[Worker Daily] ⚠️  Could not find unifiedUserId for eitje_user_id ${eitjeUserId}`);
    }

    console.log(`[Worker Daily] Total daily records: ${dailyMap.size}`);

    return Array.from(dailyMap.values());
  } catch (error) {
    console.error(`[Worker Daily] Error fetching daily hours for user ${eitjeUserId}:`, error);
    return [];
  }
}

/**
 * Fetch daily revenue from bork_aggregated by waiter name
 * ✅ Uses aggregated collection (NOT raw data!)
 */
export async function fetchWorkerDailyRevenue(
  userName: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const db = await getDatabase();

  try {
    if (!userName) {
      return new Map();
    }

    console.log(`[Worker Daily] Fetching daily revenue for waiter "${userName}" from bork_aggregated: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // ✅ Query bork_aggregated (aggregated collection!)
    const borkRecords = await db.collection('bork_aggregated')
      .find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    console.log(`[Worker Daily] Found ${borkRecords.length} bork_aggregated records`);

    const revenueMap = new Map<string, number>();

    // Extract waiter revenue from waiterBreakdown array
    for (const record of borkRecords) {
      const recordDate = record.date instanceof Date
        ? record.date.toISOString().split('T')[0]
        : new Date(record.date).toISOString().split('T')[0];

      // Check if this record has waiterBreakdown
      if (record.waiterBreakdown && Array.isArray(record.waiterBreakdown)) {
        for (const waiter of record.waiterBreakdown) {
          // Match waiter by name (case-insensitive, handle variations)
          const waiterName = waiter.waiterName || '';
          if (
            waiterName.toLowerCase() === userName.toLowerCase() ||
            waiterName.toLowerCase().includes(userName.toLowerCase()) ||
            userName.toLowerCase().includes(waiterName.toLowerCase())
          ) {
            const existingRevenue = revenueMap.get(recordDate) || 0;
            revenueMap.set(recordDate, existingRevenue + Number(waiter.totalRevenue || 0));
          }
        }
      }
    }

    console.log(`[Worker Daily] Found revenue for ${revenueMap.size} days from bork_aggregated`);
    return revenueMap;
  } catch (error) {
    console.error(`[Worker Daily] Error fetching daily revenue for "${userName}":`, error);
    return new Map();
  }
}

/**
 * Get week number from date string (YYYY-MM-DD)
 */
function getWeekNumber(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return week.toString();
}

/**
 * Build hierarchical year/month/week/day structure
 */
export async function buildWorkerProductivityHierarchy(
  eitjeUserId: number,
  userName: string,
  hourlyWage: number | null | undefined,
  startDate: Date,
  endDate: Date
): Promise<Array<{
  year: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  byMonth: Array<{
    year: number;
    month: number;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    revenuePerHour: number;
    laborCostPercentage: number;
    byWeek: Array<{
      week: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      revenuePerHour: number;
      laborCostPercentage: number;
    }>;
    byDay: Array<{
      date: string;
      locationId: ObjectId;
      locationName: string;
      totalHoursWorked: number;
      totalWageCost: number;
      totalRevenue: number;
      revenuePerHour: number;
      laborCostPercentage: number;
    }>;
  }>;
}>> {
  try {
    console.log(`[Worker Daily] Building productivity hierarchy for user ${eitjeUserId} (${userName})`);
    console.log(`[Worker Daily] Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Fetch daily hours and revenue in parallel
    const [dailyHours, dailyRevenue] = await Promise.all([
      fetchWorkerDailyHours(eitjeUserId, startDate, endDate),
      fetchWorkerDailyRevenue(userName, startDate, endDate),
    ]);

    console.log(`[Worker Daily] Processing ${dailyHours.length} daily hour records`);
    console.log(`[Worker Daily] Found revenue for ${dailyRevenue.size} days`);
    
    if (dailyHours.length === 0) {
      console.warn(`[Worker Daily] ⚠️  No daily hours found for user ${eitjeUserId} in date range`);
      console.warn(`[Worker Daily] ⚠️  Check if processed_hours_aggregated has data for this user`);
      return [];
    }

    // Build hierarchical structure
    const yearMap = new Map<string, any>();

    dailyHours.forEach((daily) => {
      const date = new Date(daily.date);
      const year = date.getFullYear().toString();
      const month = date.getMonth() + 1;
      const week = getWeekNumber(daily.date);
      const revenue = dailyRevenue.get(daily.date) || 0;

      // Calculate metrics
      const revenuePerHour = daily.workedHours > 0 ? revenue / daily.workedHours : 0;
      const laborCostPercentage = revenue > 0 ? (daily.wageCost / revenue) * 100 : 0;

      // Initialize year if needed
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          byMonth: new Map<string, any>(),
        });
      }

      const yearData = yearMap.get(year)!;
      yearData.totalHoursWorked += daily.workedHours;
      yearData.totalWageCost += daily.wageCost;
      yearData.totalRevenue += revenue;

      // Initialize month if needed
      const monthKey = `${year}-${month}`;
      if (!yearData.byMonth.has(monthKey)) {
        yearData.byMonth.set(monthKey, {
          year: parseInt(year),
          month,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          byWeek: new Map<string, any>(),
          byDay: [],
        });
      }

      const monthData = yearData.byMonth.get(monthKey)!;
      monthData.totalHoursWorked += daily.workedHours;
      monthData.totalWageCost += daily.wageCost;
      monthData.totalRevenue += revenue;

      // Initialize week if needed
      if (!monthData.byWeek.has(week)) {
        monthData.byWeek.set(week, {
          week,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
        });
      }

      const weekData = monthData.byWeek.get(week)!;
      weekData.totalHoursWorked += daily.workedHours;
      weekData.totalWageCost += daily.wageCost;
      weekData.totalRevenue += revenue;

      // Add day record
      monthData.byDay.push({
        date: daily.date,
        locationId: daily.locationId,
        locationName: daily.locationName,
        totalHoursWorked: daily.workedHours,
        totalWageCost: daily.wageCost,
        totalRevenue: revenue,
        revenuePerHour,
        laborCostPercentage,
      });
    });

    // Calculate derived metrics and convert Maps to Arrays
    const result = Array.from(yearMap.values()).map((yearData) => {
      yearData.revenuePerHour = yearData.totalHoursWorked > 0
        ? yearData.totalRevenue / yearData.totalHoursWorked
        : 0;
      yearData.laborCostPercentage = yearData.totalRevenue > 0
        ? (yearData.totalWageCost / yearData.totalRevenue) * 100
        : 0;

      // Process months
      yearData.byMonth = Array.from(yearData.byMonth.values()).map((monthData) => {
        monthData.revenuePerHour = monthData.totalHoursWorked > 0
          ? monthData.totalRevenue / monthData.totalHoursWorked
          : 0;
        monthData.laborCostPercentage = monthData.totalRevenue > 0
          ? (monthData.totalWageCost / monthData.totalRevenue) * 100
          : 0;

        // Process weeks
        monthData.byWeek = Array.from(monthData.byWeek.values()).map((weekData) => {
          weekData.revenuePerHour = weekData.totalHoursWorked > 0
            ? weekData.totalRevenue / weekData.totalHoursWorked
            : 0;
          weekData.laborCostPercentage = weekData.totalRevenue > 0
            ? (weekData.totalWageCost / weekData.totalRevenue) * 100
            : 0;
          return weekData;
        });

        // Sort days by date
        monthData.byDay.sort((a: any, b: any) => a.date.localeCompare(b.date));

        return monthData;
      });

      // Sort months by month number
      yearData.byMonth.sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      return yearData;
    });

    // Sort years descending
    result.sort((a, b) => b.year.localeCompare(a.year));

    console.log(`[Worker Daily] ✅ Built hierarchy: ${result.length} years, ${result.reduce((sum, y) => sum + y.byMonth.length, 0)} months`);
    return result;
  } catch (error) {
    console.error(`[Worker Daily] Error building productivity hierarchy:`, error);
    return [];
  }
}

