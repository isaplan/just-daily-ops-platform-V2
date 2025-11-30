/**
 * Productivity Division Calculator Service
 * Calculates division-level aggregations from eitje_aggregated teamStats
 * Maps teams to divisions (Kitchen -> Food, Service -> Beverage, etc.)
 */

import { ObjectId } from 'mongodb';
import { ProductivityByDivision } from '@/models/workforce/productivity.model';
import { aggregateByPeriod } from './productivity-period-utils';
import { getTeamCategory } from '@/lib/utils/team-categorization';
import { applyProductivityGoals } from '@/lib/utils/productivity-goals';
import { getDatabase } from '@/lib/mongodb/v2-connection';
export interface CalculateDivisionDataParams {
  laborRecords: any[];
  locationDataMap: Map<string, { totalRevenue: number }>; // Location-level revenue for distribution
  locationIdMap: Map<string, string>;
  locationMap: Map<string, { id: string; name: string }>;
  periodType: 'year' | 'month' | 'week' | 'day' | 'hour';
}

/**
 * Calculate division-level aggregations from labor records with teamStats
 */
export async function calculateDivisionData(
  params: CalculateDivisionDataParams
): Promise<ProductivityByDivision[]> {
  const { laborRecords, locationDataMap, locationIdMap, locationMap, periodType } = params;
  const divisionMap = new Map<string, ProductivityByDivision>();

  console.log(`[Productivity Division Calculator] Processing ${laborRecords.length} labor records for division breakdown...`);
  
  // Load team names from database (teamStats only has teamId, not teamName)
  const db = await getDatabase();
  const teamRecords = await db.collection('eitje_raw_data')
    .find({ endpoint: 'teams' })
    .toArray();
  
  const teamIdToNameMap = new Map<string, string>();
  teamRecords.forEach((teamRecord: any) => {
    const teamId = teamRecord.extracted?.id || teamRecord.rawApiResponse?.id;
    const teamName = teamRecord.extracted?.name || teamRecord.rawApiResponse?.name;
    if (teamId && teamName) {
      teamIdToNameMap.set(String(teamId), teamName);
    }
  });
  
  console.log(`[Productivity Division Calculator] Loaded ${teamIdToNameMap.size} team names from eitje_raw_data`);

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

    // Process teamStats to get division-level data
    // ⚠️ teamStats only has teamId, hours, cost - NO teamName!
    if (record.teamStats && Array.isArray(record.teamStats) && record.teamStats.length > 0) {
      // Group teams by division and calculate total hours per division
      const divisionTotals = new Map<'Food' | 'Beverage' | 'Management' | 'Other', {
        hours: number;
        cost: number;
      }>();

      let totalDivisionHours = 0;

      for (const teamStat of record.teamStats) {
        // ⚠️ teamStats only has teamId (string/number), hours, cost - NO teamName!
        // Look up team name from eitje_raw_data teams endpoint
        const teamId = String(teamStat.teamId || '');
        let teamName = teamIdToNameMap.get(teamId) || (teamStat as any).teamName || 'Unknown';
        
        const teamCategory = getTeamCategory(teamName);
        
        // Map team category to division
        let division: 'Food' | 'Beverage' | 'Management' | 'Other' = 'Other';
        if (teamCategory === 'Kitchen') {
          division = 'Food';
        } else if (teamCategory === 'Service') {
          division = 'Beverage';
        } else if (teamCategory === 'Management') {
          division = 'Management';
        } else {
          division = 'Other';
        }

        // Accumulate hours and costs by division
        if (!divisionTotals.has(division)) {
          divisionTotals.set(division, { hours: 0, cost: 0 });
        }
        const divTotal = divisionTotals.get(division)!;
        const teamHours = teamStat.hours || 0;
        divTotal.hours += teamHours;
        divTotal.cost += teamStat.cost || 0;
        totalDivisionHours += teamHours;
      }

      // Create division records and distribute revenue proportionally
      for (const [division, totals] of divisionTotals.entries()) {
        const key = `${periodKey}_${division}_${locationId}`;
        
        if (!divisionMap.has(key)) {
          divisionMap.set(key, {
            division,
            period: periodKey,
            periodType,
            locationId,
            locationName,
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
            revenuePerHour: 0,
            laborCostPercentage: 0,
          });
        }

        const divRecord = divisionMap.get(key)!;
        divRecord.totalHoursWorked += totals.hours;
        divRecord.totalWageCost += totals.cost;
        
        // Distribute revenue proportionally based on division hours
        if (totalDivisionHours > 0) {
          const revenueShare = (totals.hours / totalDivisionHours) * locationRevenue;
          divRecord.totalRevenue += revenueShare;
        }
      }
    } else {
      // No teamStats - create a single "All" division record from location totals
      const key = `${periodKey}_All_${locationId}`;
      
      if (!divisionMap.has(key)) {
        divisionMap.set(key, {
          division: 'All',
          period: periodKey,
          periodType,
          locationId,
          locationName,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
        });
      }

      const divRecord = divisionMap.get(key)!;
      divRecord.totalHoursWorked += record.totalHoursWorked || 0;
      divRecord.totalWageCost += record.totalWageCost || 0;
      divRecord.totalRevenue += locationRevenue;
    }
  }

  // Calculate derived metrics
  const result = Array.from(divisionMap.values()).map(div => {
    div.revenuePerHour = div.totalHoursWorked > 0 
      ? div.totalRevenue / div.totalHoursWorked 
      : 0;
    div.laborCostPercentage = div.totalRevenue > 0
      ? (div.totalWageCost / div.totalRevenue) * 100
      : 0;
    div.goalStatus = applyProductivityGoals(div.revenuePerHour, div.laborCostPercentage);
    return div;
  });

  // Sort by period (descending), then location, then division
  return result.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    if (a.locationName !== b.locationName) {
      return (a.locationName || '').localeCompare(b.locationName || '');
    }
    const divisionOrder: Record<string, number> = { 'Food': 1, 'Beverage': 2, 'Management': 3, 'Other': 4, 'All': 5 };
    return (divisionOrder[a.division] || 5) - (divisionOrder[b.division] || 5);
  });
}

