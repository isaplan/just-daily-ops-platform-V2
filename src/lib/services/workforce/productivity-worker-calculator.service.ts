/**
 * Productivity Worker Calculator Service
 * Calculates worker-level aggregations from eitje_aggregated workerStats
 * Validates hourly wages and filters out workers without wages
 */

import { ObjectId } from 'mongodb';
import { WorkerProductivity } from '@/models/workforce/productivity.model';
import { aggregateByPeriod } from './productivity-period-utils';
import { getTeamCategory, normalizeTeamName } from '@/lib/utils/team-categorization';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export interface CalculateWorkerDataParams {
  laborRecords: any[];
  locationDataMap: Map<string, { totalRevenue: number }>; // Location-level revenue for distribution
  locationIdMap: Map<string, string>;
  locationMap: Map<string, { id: string; name: string }>;
  periodType: 'year' | 'month' | 'week' | 'day' | 'hour';
}

export interface WorkerCalculationResult {
  workers: WorkerProductivity[];
  missingWageWorkers: Array<{
    workerId: string;
    workerName: string;
    eitjeUserId: number;
    locationId: string;
    locationName: string;
    period: string;
  }>;
}

/**
 * Map unifiedUserIds to eitjeUserIds
 */
async function mapUnifiedToEitjeUserIds(unifiedUserIds: Set<string>): Promise<Map<string, number>> {
  const db = await getDatabase();
  const mapping = new Map<string, number>();

  if (unifiedUserIds.size === 0) {
    return mapping;
  }

  try {
    const unifiedUsers = await db.collection('unified_users')
      .find({
        _id: { $in: Array.from(unifiedUserIds).map(id => new ObjectId(id)) }
      })
      .toArray();

    for (const user of unifiedUsers) {
      const unifiedIdStr = user._id.toString();
      if (user.externalIds && Array.isArray(user.externalIds)) {
        const eitjeMapping = user.externalIds.find((e: any) => e.source === 'eitje');
        if (eitjeMapping && eitjeMapping.externalId) {
          const eitjeId = Number(eitjeMapping.externalId);
          if (!isNaN(eitjeId) && eitjeId > 0) {
            mapping.set(unifiedIdStr, eitjeId);
          }
        }
      }
    }

    console.log(`[Productivity Worker Calculator] Mapped ${mapping.size} unifiedUserIds to eitjeUserIds`);
  } catch (error) {
    console.warn('[Productivity Worker Calculator] Error mapping unifiedUserIds to eitjeUserIds:', error);
  }

  return mapping;
}

/**
 * Fetch hourly wages for workers from worker_profiles
 */
async function fetchWorkerWages(eitjeUserIds: number[]): Promise<Map<number, number>> {
  const db = await getDatabase();
  const wageMap = new Map<number, number>();

  if (eitjeUserIds.length === 0) {
    return wageMap;
  }

  try {
    // Fetch worker profiles with hourly wages
    const profiles = await db.collection('worker_profiles')
      .find({
        eitje_user_id: { $in: eitjeUserIds },
        $or: [
          { effective_to: null },
          { effective_to: { $gte: new Date() } }
        ]
      })
      .sort({ eitje_user_id: 1, effective_from: -1 })
      .toArray();

    // Group by user_id and take the most recent profile
    const profileMap = new Map<number, any>();
    profiles.forEach((profile: any) => {
      const userId = profile.eitje_user_id;
      if (userId && !profileMap.has(userId)) {
        profileMap.set(userId, profile);
      }
    });

    // Extract hourly wages
    profileMap.forEach((profile, userId) => {
      if (profile.hourly_wage !== null && profile.hourly_wage !== undefined && profile.hourly_wage > 0) {
        wageMap.set(userId, Number(profile.hourly_wage));
      }
    });

    console.log(`[Productivity Worker Calculator] Fetched hourly wages for ${wageMap.size} out of ${eitjeUserIds.length} workers`);
  } catch (error) {
    console.warn('[Productivity Worker Calculator] Error fetching hourly wages:', error);
  }

  return wageMap;
}

/**
 * Extract workerStats from eitje_aggregated record (from hierarchical structure)
 */
function extractWorkerStats(record: any, locationId: string): any[] {
  const workerStats: any[] = [];

  // Check if workerStats is at top level
  if (record.workerStats && Array.isArray(record.workerStats)) {
    return record.workerStats;
  }

  // Extract from hierarchical structure: hoursByDay -> byLocation -> byTeam -> byWorker
  if (record.hoursByDay && Array.isArray(record.hoursByDay)) {
    const recordDate = record.date instanceof Date 
      ? record.date.toISOString().split('T')[0]
      : new Date(record.date).toISOString().split('T')[0];
    
    const dayData = record.hoursByDay.find((d: any) => {
      const dDate = d.date instanceof Date 
        ? d.date.toISOString().split('T')[0]
        : (typeof d.date === 'string' ? d.date : '');
      return dDate === recordDate || dDate === recordDate.split('T')[0];
    });
    
    if (dayData && dayData.byLocation && Array.isArray(dayData.byLocation)) {
      for (const locationData of dayData.byLocation) {
        const locId = locationData.locationId?.toString() || locationData.locationId;
        if (locId === locationId) {
          if (locationData.byTeam && Array.isArray(locationData.byTeam)) {
            for (const team of locationData.byTeam) {
              if (team.byWorker && Array.isArray(team.byWorker)) {
                for (const worker of team.byWorker) {
                  workerStats.push({
                    unifiedUserId: worker.unifiedUserId,
                    workerName: worker.workerName || 'Unknown',
                    teamId: team.teamId,
                    teamName: team.teamName || '',
                    hours: worker.totalHoursWorked || 0,
                    cost: worker.totalWageCost || 0,
                  });
                }
              }
            }
          }
          break;
        }
      }
    }
  }

  return workerStats;
}

/**
 * Calculate worker-level aggregations from labor records with workerStats
 */
export async function calculateWorkerData(
  params: CalculateWorkerDataParams
): Promise<WorkerCalculationResult> {
  const { laborRecords, locationDataMap, locationIdMap, locationMap, periodType } = params;
  const workerMap = new Map<string, WorkerProductivity>();
  const missingWageWorkers: WorkerCalculationResult['missingWageWorkers'] = [];
  const eitjeUserIds = new Set<number>();
  const unifiedUserIds = new Set<string>();

  console.log(`[Productivity Worker Calculator] Processing ${laborRecords.length} labor records for worker breakdown...`);

  // Diagnostic: Check if records have workerStats or hierarchical data
  let recordsWithTopLevelStats = 0;
  let recordsWithHierarchicalData = 0;
  for (const record of laborRecords.slice(0, 5)) {
    if (record.workerStats && Array.isArray(record.workerStats) && record.workerStats.length > 0) {
      recordsWithTopLevelStats++;
    }
    if (record.hoursByDay && Array.isArray(record.hoursByDay) && record.hoursByDay.length > 0) {
      recordsWithHierarchicalData++;
    }
  }
  console.log(`[Productivity Worker Calculator] Sample check (first 5 records): ${recordsWithTopLevelStats} have top-level workerStats, ${recordsWithHierarchicalData} have hoursByDay`);

  // First pass: collect all unifiedUserIds and eitjeUserIds from workerStats
  let totalWorkerStats = 0;
  for (const record of laborRecords) {
    // Handle locationId
    let locationId = '';
    if (record.locationId) {
      if (record.locationId instanceof ObjectId) {
        locationId = record.locationId.toString();
      } else if (typeof record.locationId === 'object' && record.locationId.toString) {
        locationId = record.locationId.toString();
      } else {
        locationId = String(record.locationId);
      }
    }

    // Extract workerStats (from top level or hierarchical structure)
    const workerStats = extractWorkerStats(record, locationId);
    totalWorkerStats += workerStats.length;

    for (const workerStat of workerStats) {
      // Try to get eitjeUserId directly
      const eitjeUserId = workerStat.workerId || workerStat.eitjeUserId || workerStat.userId || workerStat.eitje_user_id;
      const unifiedUserId = workerStat.unifiedUserId;

      if (eitjeUserId) {
        const userId = typeof eitjeUserId === 'number' ? eitjeUserId : Number(eitjeUserId);
        if (!isNaN(userId) && userId > 0) {
          eitjeUserIds.add(userId);
        }
      }
      if (unifiedUserId) {
        const unifiedIdStr = typeof unifiedUserId === 'string' 
          ? unifiedUserId 
          : (unifiedUserId instanceof ObjectId ? unifiedUserId.toString() : String(unifiedUserId));
        if (unifiedIdStr) {
          unifiedUserIds.add(unifiedIdStr);
        }
      }
    }
  }

  // Map unifiedUserIds to eitjeUserIds
  const unifiedToEitjeMap = await mapUnifiedToEitjeUserIds(unifiedUserIds);
  unifiedToEitjeMap.forEach((eitjeId, unifiedId) => {
    eitjeUserIds.add(eitjeId);
  });

  console.log(`[Productivity Worker Calculator] Found ${totalWorkerStats} workerStats entries, extracted ${eitjeUserIds.size} unique eitjeUserIds`);
  
  if (eitjeUserIds.size === 0 && totalWorkerStats > 0) {
    console.warn(`[Productivity Worker Calculator] ⚠️ Found ${totalWorkerStats} workerStats but couldn't extract eitjeUserIds!`);
    // Log sample workerStat structure for debugging
    for (const record of laborRecords.slice(0, 3)) {
      let locationId = '';
      if (record.locationId) {
        locationId = record.locationId instanceof ObjectId 
          ? record.locationId.toString() 
          : String(record.locationId);
      }
      const workerStats = extractWorkerStats(record, locationId);
      if (workerStats.length > 0) {
        console.warn(`[Productivity Worker Calculator] Sample workerStat structure:`, JSON.stringify(workerStats[0], null, 2));
        break;
      }
    }
  }

  // Fetch hourly wages for all workers
  const wageMap = await fetchWorkerWages(Array.from(eitjeUserIds));

  // Second pass: process workerStats and calculate costs
  for (const record of laborRecords) {
    const date = record.date instanceof Date ? record.date : new Date(record.date);
    const periodKey = aggregateByPeriod(date, periodType);
    
    // Handle locationId
    let locationId = '';
    if (record.locationId) {
      if (record.locationId instanceof ObjectId) {
        locationId = record.locationId.toString();
      } else if (typeof record.locationId === 'object' && record.locationId.toString) {
        locationId = record.locationId.toString();
      } else {
        locationId = String(record.locationId);
      }
    }
    
    const locationName = locationIdMap.get(locationId) || locationMap.get(locationId)?.name || 'Unknown Location';
    const locationKey = `${periodKey}_${locationId}`;
    const locationRevenue = locationDataMap.get(locationKey)?.totalRevenue || record.totalRevenue || 0;

    // Extract workerStats (from top level or hierarchical structure)
    const workerStats = extractWorkerStats(record, locationId);

    if (workerStats.length > 0) {
      // Calculate total worker hours for revenue distribution
      let totalWorkerHours = 0;
      const workersWithWages: Array<{ 
        workerStat: any; 
        hours: number; 
        cost: number; 
        eitjeUserId: number;
        workerName: string;
      }> = [];

      for (const workerStat of workerStats) {
        // Get eitjeUserId - try direct or map from unifiedUserId
        let eitjeUserId: number | null = null;
        const unifiedUserId = workerStat.unifiedUserId;
        
        // Try direct eitjeUserId first
        const directEitjeId = workerStat.workerId || workerStat.eitjeUserId || workerStat.userId || workerStat.eitje_user_id;
        if (directEitjeId) {
          const userId = typeof directEitjeId === 'number' ? directEitjeId : Number(directEitjeId);
          if (!isNaN(userId) && userId > 0) {
            eitjeUserId = userId;
          }
        }
        
        // If no direct eitjeUserId, try mapping from unifiedUserId
        if (!eitjeUserId && unifiedUserId) {
          const unifiedIdStr = typeof unifiedUserId === 'string' 
            ? unifiedUserId 
            : (unifiedUserId instanceof ObjectId ? unifiedUserId.toString() : String(unifiedUserId));
          eitjeUserId = unifiedToEitjeMap.get(unifiedIdStr) || null;
        }
        
        const workerName = workerStat.workerName || workerStat.userName || workerStat.name || 'Unknown Worker';
        const hours = workerStat.hours || workerStat.hoursWorked || workerStat.totalHoursWorked || 0;
        
        if (!eitjeUserId || hours === 0) {
          continue;
        }

        // Check if worker has hourly wage
        const hourlyWage = wageMap.get(eitjeUserId);
        
        if (!hourlyWage || hourlyWage === 0) {
          // Track missing wage workers
          missingWageWorkers.push({
            workerId: String(eitjeUserId),
            workerName,
            eitjeUserId,
            locationId,
            locationName,
            period: periodKey,
          });
          continue; // Skip workers without wages
        }

        // Calculate cost using hourly wage
        const cost = hours * hourlyWage;
        totalWorkerHours += hours;
        workersWithWages.push({ workerStat, hours, cost, eitjeUserId, workerName });
      }

      // Create worker records
      for (const { workerStat, hours, cost, eitjeUserId, workerName } of workersWithWages) {
        const workerId = String(eitjeUserId);

        // Get team info for categorization
        const teamName = workerStat.teamName || workerStat.team?.name || 'Unknown';
        const normalizedTeamName = normalizeTeamName(teamName);
        const teamCategory = getTeamCategory(normalizedTeamName);

        const key = `${periodKey}_${workerId}_${locationId}`;
        
        if (!workerMap.has(key)) {
          workerMap.set(key, {
            workerId,
            workerName,
            period: periodKey,
            periodType,
            locationId,
            locationName,
            teamCategory,
            subTeam: normalizedTeamName,
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
            revenuePerHour: 0,
            laborCostPercentage: 0,
            productivityScore: 0,
          });
        }

        const workerRecord = workerMap.get(key)!;
        workerRecord.totalHoursWorked += hours;
        workerRecord.totalWageCost += cost;
        
        // Distribute revenue proportionally based on worker hours
        if (totalWorkerHours > 0) {
          const revenueShare = (hours / totalWorkerHours) * locationRevenue;
          workerRecord.totalRevenue += revenueShare;
        }
      }
    }
  }

  // Calculate derived metrics
  const workers = Array.from(workerMap.values()).map(worker => {
    worker.revenuePerHour = worker.totalHoursWorked > 0 
      ? worker.totalRevenue / worker.totalHoursWorked 
      : 0;
    worker.laborCostPercentage = worker.totalRevenue > 0
      ? (worker.totalWageCost / worker.totalRevenue) * 100
      : 0;
    worker.productivityScore = worker.revenuePerHour;
    worker.goalStatus = applyProductivityGoals(worker.revenuePerHour, worker.laborCostPercentage);
    return worker;
  });

  // Sort by period (descending), then location, then worker name
  workers.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    if (a.locationName !== b.locationName) {
      return (a.locationName || '').localeCompare(b.locationName || '');
    }
    return (a.workerName || '').localeCompare(b.workerName || '');
  });

  // Remove duplicates from missingWageWorkers (same worker, different periods)
  const uniqueMissingWages = new Map<string, WorkerCalculationResult['missingWageWorkers'][0]>();
  missingWageWorkers.forEach(worker => {
    const key = `${worker.eitjeUserId}_${worker.locationId}`;
    if (!uniqueMissingWages.has(key)) {
      uniqueMissingWages.set(key, worker);
    }
  });

  console.log(`[Productivity Worker Calculator] Calculated ${workers.length} worker records`);
  console.log(`[Productivity Worker Calculator] Found ${uniqueMissingWages.size} workers missing hourly wages`);

  return {
    workers,
    missingWageWorkers: Array.from(uniqueMissingWages.values()),
  };
}
