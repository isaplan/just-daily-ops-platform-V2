/**
 * Worker Aggregation Service (Phase 2)
 * Builds and maintains worker_profiles_aggregated collection
 * Pre-computes worker data for fast, scalable queries
 */

import { ObjectId } from 'mongodb';
import { WorkerProfilesAggregated } from '@/lib/mongodb/v2-schema';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { buildWorkerProductivityHierarchy } from './worker-aggregation-daily.service';

export interface WorkerProfile {
  _id: ObjectId;
  eitje_user_id: number;
  location_id?: string;
  contract_type?: string;
  contract_hours?: number;
  hourly_wage?: number;
  wage_override?: boolean;
  effective_from?: Date;
  effective_to?: Date;
  notes?: string;
  teams?: Array<{ team_id: string; team_name: string }>;
}

/**
 * Calculate active years and months for a worker based on contract dates
 */
export function calculateActiveDateRanges(
  effectiveFrom?: Date | null,
  effectiveTo?: Date | null
): { activeYears: number[]; activeMonths: Array<{ year: number; month: number }> } {
  const activeYears: Set<number> = new Set();
  const activeMonths: Array<{ year: number; month: number }> = [];
  const monthSet = new Set<string>();

  const startDate = effectiveFrom || new Date('2020-01-01');
  const endDate = effectiveTo || new Date();

  let current = new Date(startDate);
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // 1-12

    activeYears.add(year);

    const monthKey = `${year}-${month}`;
    if (!monthSet.has(monthKey)) {
      monthSet.add(monthKey);
      activeMonths.push({ year, month });
    }

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return {
    activeYears: Array.from(activeYears).sort(),
    activeMonths: activeMonths.sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    ),
  };
}

/**
 * Calculate hours breakdown (gewerkt, ziek, verlof) for a date range
 * ✅ Uses processed_hours_aggregated (correct data source)
 */
export async function calculateHoursBreakdown(
  eitjeUserId: number,
  startDate: Date,
  endDate: Date
): Promise<{ gewerkt: number; ziek: number; verlof: number; total: number }> {
  const db = await getDatabase();

  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`[Worker Aggregation] Calculating hours for user ${eitjeUserId} from processed_hours_aggregated: ${startDateStr} to ${endDateStr}`);

    // ✅ Query processed_hours_aggregated (correct data source!)
    const records = await db.collection('processed_hours_aggregated')
      .find({
        userId: eitjeUserId, // ✅ Direct match on userId (eitje_user_id)
        date: {
          $gte: startDateStr,
          $lte: endDateStr,
        },
      })
      .toArray();

    console.log(`[Worker Aggregation] Found ${records.length} processed_hours_aggregated records for user ${eitjeUserId}`);

    const breakdown = {
      gewerkt: 0,
      ziek: 0,
      verlof: 0,
      total: 0,
    };

    records.forEach((record: any) => {
      const hours = Number(record.workedHours || 0);
      const typeName = (record.typeName || '').toLowerCase();

      if (typeName.includes('ziek') || typeName.includes('sick')) {
        breakdown.ziek += hours;
      } else if (typeName.includes('verlof') || typeName.includes('leave') || typeName.includes('vacation')) {
        breakdown.verlof += hours;
      } else {
        // Default to gewerkt (worked hours)
        breakdown.gewerkt += hours;
      }

      breakdown.total += hours;
    });

    console.log(`[Worker Aggregation] Hours breakdown for user ${eitjeUserId}:`, breakdown);
    return breakdown;
  } catch (error) {
    console.warn(`[Worker Aggregation] Error calculating hours for user ${eitjeUserId}:`, error);
    return { gewerkt: 0, ziek: 0, verlof: 0, total: 0 };
  }
}

/**
 * Calculate sales summary for a worker based on waiter name
 * ✅ Uses bork_aggregated.waiterBreakdown (aggregated collection, NOT raw data!)
 */
export async function calculateSalesSummary(
  userName?: string | null,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRevenue: number;
  totalTransactions: number;
  averageTicketValue: number;
  totalItems: number;
}> {
  const db = await getDatabase();

  try {
    if (!userName) {
      return { totalRevenue: 0, totalTransactions: 0, averageTicketValue: 0, totalItems: 0 };
    }

    console.log(`[Worker Aggregation] Calculating sales for waiter "${userName}" from bork_aggregated`);

    // ✅ Query bork_aggregated.waiterBreakdown (aggregated collection, NOT raw data!)
    const query: any = {};
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Fetch all bork_aggregated records in date range
    const borkRecords = await db.collection('bork_aggregated')
      .find(query)
      .toArray();

    // Aggregate sales from waiterBreakdown arrays
    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalItems = 0;

    // Normalize userName for matching (extract first name if full name provided)
    const userNameLower = userName.toLowerCase().trim();
    const userNameParts = userNameLower.split(/\s+/);
    const firstName = userNameParts[0]; // First name for matching

    for (const record of borkRecords) {
      if (record.waiterBreakdown && Array.isArray(record.waiterBreakdown)) {
        for (const waiter of record.waiterBreakdown) {
          const waiterName = (waiter.waiterName || '').toLowerCase().trim();
          
          // Match waiter by name (multiple strategies):
          // 1. Exact match (case-insensitive)
          // 2. First name match (waiter name is first name of user)
          // 3. Contains match (waiter name contains user name or vice versa)
          const exactMatch = waiterName === userNameLower;
          const firstNameMatch = waiterName === firstName;
          const containsMatch = waiterName.includes(userNameLower) || userNameLower.includes(waiterName);
          
          if (exactMatch || firstNameMatch || containsMatch) {
            totalRevenue += Number(waiter.totalRevenue || 0);
            totalTransactions += Number(waiter.totalTransactions || 0);
            totalItems += Number(waiter.totalItemsSold || 0);
          }
        }
      }
    }

    const averageTicketValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    console.log(`[Worker Aggregation] Sales for ${userName}:`, {
      totalRevenue,
      totalTransactions,
      averageTicketValue,
      totalItems,
    });

    return { totalRevenue, totalTransactions, averageTicketValue, totalItems };
  } catch (error) {
    console.warn(`[Worker Aggregation] Error calculating sales for ${userName}:`, error);
    return { totalRevenue: 0, totalTransactions: 0, averageTicketValue: 0, totalItems: 0 };
  }
}

/**
 * Calculate labor cost for a worker
 */
export async function calculateLaborCost(
  eitjeUserId: number,
  hourlyWage: number | null | undefined,
  startDate: Date,
  endDate: Date
): Promise<number> {
  if (!hourlyWage || hourlyWage <= 0) {
    return 0;
  }

  try {
    const hoursBreakdown = await calculateHoursBreakdown(eitjeUserId, startDate, endDate);
    const totalHours = hoursBreakdown.total;
    const cost = totalHours * hourlyWage;

    console.log(`[Worker Aggregation] Labor cost for user ${eitjeUserId}: ${totalHours} hours × €${hourlyWage} = €${cost}`);
    return cost;
  } catch (error) {
    console.warn(`[Worker Aggregation] Error calculating labor cost for user ${eitjeUserId}:`, error);
    return 0;
  }
}

/**
 * Build aggregated record for one worker with pre-computed data
 */
export async function buildWorkerAggregated(
  workerProfile: WorkerProfile,
  locationName?: string | null,
  userName?: string | null,
  unifiedUserId?: ObjectId | null,
  unifiedUserName?: string | null,
  borkUserId?: string | null,
  borkUserName?: string | null
): Promise<WorkerProfilesAggregated | null> {
  const { activeYears, activeMonths } = calculateActiveDateRanges(
    workerProfile.effective_from,
    workerProfile.effective_to
  );

  const isActive = !workerProfile.effective_to || new Date(workerProfile.effective_to) > new Date();
  const today = new Date();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

  const allTimeStart = workerProfile.effective_from || new Date('2020-01-01');
  const allTimeEnd = today;

  try {
    console.log(`[Worker Aggregation] Building aggregated record for user ${workerProfile.eitje_user_id} (${workerProfile._id})`);

    // ✅ OPTIMIZATION: Check if worker has any data before expensive operations
    const totalHoursCheck = await calculateHoursBreakdown(workerProfile.eitje_user_id, allTimeStart, allTimeEnd);
    const totalSalesCheck = await calculateSalesSummary(userName || null, allTimeStart, allTimeEnd);
    
    const hasData = totalHoursCheck.total > 0 || totalSalesCheck.totalRevenue > 0;
    
    if (!hasData) {
      console.log(`[Worker Aggregation] ⚠️  Skipping worker ${workerProfile.eitje_user_id} - no hours or sales data found`);
      // Still build basic record but skip expensive hierarchy
      const [
        thisMonthHours,
        thisMonthSales,
        thisMonthCost,
        lastMonthHours,
        lastMonthSales,
        lastMonthCost,
      ] = await Promise.all([
        calculateHoursBreakdown(workerProfile.eitje_user_id, thisMonthStart, thisMonthEnd),
        calculateSalesSummary(userName || null, thisMonthStart, thisMonthEnd),
        calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, thisMonthStart, thisMonthEnd),
        calculateHoursBreakdown(workerProfile.eitje_user_id, lastMonthStart, lastMonthEnd),
        calculateSalesSummary(userName || null, lastMonthStart, lastMonthEnd),
        calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, lastMonthStart, lastMonthEnd),
      ]);

      const aggregated: WorkerProfilesAggregated = {
        _id: workerProfile._id,
        eitjeUserId: workerProfile.eitje_user_id,
        userName: userName || null,
        unifiedUserId: unifiedUserId || null,
        unifiedUserName: unifiedUserName || null,
        borkUserId: borkUserId || null,
        borkUserName: borkUserName || null,
        locationId: workerProfile.location_id ? new ObjectId(workerProfile.location_id) : undefined,
        locationName: locationName || null,
        contractType: workerProfile.contract_type,
        contractHours: workerProfile.contract_hours,
        hourlyWage: workerProfile.hourly_wage,
        wageOverride: workerProfile.wage_override || false,
        effectiveFrom: workerProfile.effective_from,
        effectiveTo: workerProfile.effective_to,
        notes: workerProfile.notes,
        teams: workerProfile.teams,
        activeYears,
        activeMonths,
        thisMonth: {
          hoursBreakdown: thisMonthHours,
          salesSummary: thisMonthSales,
          laborCost: thisMonthCost,
        },
        lastMonth: {
          hoursBreakdown: lastMonthHours,
          salesSummary: lastMonthSales,
          laborCost: lastMonthCost,
        },
        total: {
          hoursBreakdown: totalHoursCheck,
          salesSummary: totalSalesCheck,
          laborCost: await calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, allTimeStart, allTimeEnd),
        },
        productivityByYear: undefined, // Skip hierarchy for workers with no data
        isActive,
        lastAggregated: new Date(),
        createdAt: workerProfile._id ? new Date() : new Date(),
        updatedAt: new Date(),
      };

      console.log(`[Worker Aggregation] ✅ Built basic aggregated record for user ${workerProfile.eitje_user_id} (no hierarchy - no data)`);
      return aggregated;
    }

    // ✅ Worker has data - proceed with full aggregation including hierarchy
    // Calculate all periods in parallel (thisMonth, lastMonth, total)
    const [
      thisMonthHours,
      thisMonthSales,
      thisMonthCost,
      lastMonthHours,
      lastMonthSales,
      lastMonthCost,
      totalHours,
      totalSales,
      totalCost,
      productivityHierarchy,
    ] = await Promise.all([
      calculateHoursBreakdown(workerProfile.eitje_user_id, thisMonthStart, thisMonthEnd),
      calculateSalesSummary(userName || null, thisMonthStart, thisMonthEnd), // ✅ Use userName, not profile ID
      calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, thisMonthStart, thisMonthEnd),
      calculateHoursBreakdown(workerProfile.eitje_user_id, lastMonthStart, lastMonthEnd),
      calculateSalesSummary(userName || null, lastMonthStart, lastMonthEnd), // ✅ Use userName, not profile ID
      calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, lastMonthStart, lastMonthEnd),
      totalHoursCheck, // Reuse already calculated
      totalSalesCheck, // Reuse already calculated
      calculateLaborCost(workerProfile.eitje_user_id, workerProfile.hourly_wage, allTimeStart, allTimeEnd),
      // ✅ Build hierarchical daily/weekly/monthly/yearly breakdowns (only if worker has data)
      buildWorkerProductivityHierarchy(
        workerProfile.eitje_user_id,
        userName || '',
        workerProfile.hourly_wage,
        allTimeStart,
        allTimeEnd
      ),
    ]);

    const aggregated: WorkerProfilesAggregated = {
      _id: workerProfile._id,
      eitjeUserId: workerProfile.eitje_user_id,
      userName: userName || null, // ✅ Use passed userName, don't use profile ID!
      unifiedUserId: unifiedUserId || null, // ✅ Unified user ID from unified_users
      unifiedUserName: unifiedUserName || null, // ✅ Unified user name (primary source of truth)
      borkUserId: borkUserId || null, // ✅ Bork user ID from system mappings
      borkUserName: borkUserName || null, // ✅ Bork user name (usually same as unifiedUserName)
      locationId: workerProfile.location_id ? new ObjectId(workerProfile.location_id) : undefined,
      locationName: locationName || null, // ✅ Use passed locationName
      contractType: workerProfile.contract_type,
      contractHours: workerProfile.contract_hours,
      hourlyWage: workerProfile.hourly_wage,
      wageOverride: workerProfile.wage_override || false,
      effectiveFrom: workerProfile.effective_from,
      effectiveTo: workerProfile.effective_to,
      notes: workerProfile.notes,
      teams: workerProfile.teams,
      activeYears,
      activeMonths,
      thisMonth: {
        hoursBreakdown: thisMonthHours,
        salesSummary: thisMonthSales,
        laborCost: thisMonthCost,
      },
      lastMonth: {
        hoursBreakdown: lastMonthHours,
        salesSummary: lastMonthSales,
        laborCost: lastMonthCost,
      },
      total: {
        hoursBreakdown: totalHours,
        salesSummary: totalSales,
        laborCost: totalCost,
      },
      // ✅ Add hierarchical productivity breakdowns
      productivityByYear: productivityHierarchy.length > 0 ? productivityHierarchy : undefined,
      isActive,
      lastAggregated: new Date(),
      createdAt: workerProfile._id ? new Date() : new Date(),
      updatedAt: new Date(),
    };

    console.log(`[Worker Aggregation] ✅ Built aggregated record for user ${workerProfile.eitje_user_id} (name: ${userName})`);
    console.log(`[Worker Aggregation] Productivity hierarchy: ${productivityHierarchy.length} years`);
    if (productivityHierarchy.length === 0) {
      console.warn(`[Worker Aggregation] ⚠️  No productivity hierarchy data for user ${workerProfile.eitje_user_id}`);
      console.warn(`[Worker Aggregation] ⚠️  This might mean no data in processed_hours_aggregated or bork_raw_data`);
    }
    return aggregated;
  } catch (error) {
    console.error(`[Worker Aggregation] ❌ Error building aggregated record:`, error);
    return null;
  }
}
