/**
 * Productivity Service Layer
 * Server-side data fetching functions for labor productivity calculations
 */

import { ProductivityQueryParams, ProductivityResponse, ProductivityAggregation } from '@/models/workforce/productivity.model';
import { getLaborAggregated, LaborData, getLocations } from '@/lib/services/graphql/queries';

/**
 * Fetch labor aggregated data and transform into productivity records
 */
export async function fetchProductivityData(
  params: ProductivityQueryParams
): Promise<ProductivityResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  // Fetch all locations if no specific location selected
  const locations = await getLocations();
  const validLocations = locations.filter(
    (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
  );

  // If specific location, fetch data for that location only
  // Otherwise, fetch for all locations
  const locationIds = params.locationId && params.locationId !== "all" 
    ? [params.locationId] 
    : validLocations.map((loc: any) => loc.id);

  // Fetch labor data for all selected locations in parallel
  const laborPromises = locationIds.map((id: string) =>
    getLaborAggregated(id, params.startDate!, params.endDate!)
  );
  const laborResults = await Promise.all(laborPromises);
  const laborData = laborResults.flat();

  // Transform and aggregate the data
  const aggregated = aggregateProductivityData(laborData, params);

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;
  const paginatedRecords = aggregated.slice(skip, skip + limit);

  return {
    success: true,
    records: paginatedRecords,
    total: aggregated.length,
    page,
    totalPages: Math.ceil(aggregated.length / limit),
  };
}

/**
 * Aggregate labor data by period (day/week/month) and team
 */
function aggregateProductivityData(
  laborData: LaborData[],
  params: ProductivityQueryParams
): ProductivityAggregation[] {
  const periodType = params.periodType || 'day';
  const teamFilter = params.teamName && params.teamName !== 'all' ? params.teamName : undefined;

  // Group by period and team
  const grouped = new Map<string, {
    period: string;
    periodType: "day" | "week" | "month";
    locationId: string;
    locationName?: string;
    teamId?: string;
    teamName?: string;
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    recordCount: number;
  }>();

  laborData.forEach((record) => {
    // Filter by team if specified
    if (teamFilter) {
      // Check if this record matches the team filter
      // We need to check teamStats or find team info
      // For now, we'll process all records and filter later in aggregation
    }

    // Determine period key based on periodType
    const date = new Date(record.date);
    let periodKey: string;
    
    if (periodType === 'day') {
      periodKey = record.date.split('T')[0]; // YYYY-MM-DD
    } else if (periodType === 'week') {
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      periodKey = `${year}-W${String(week).padStart(2, '0')}`;
    } else { // month
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      periodKey = `${year}-${month}`;
    }

    // Process team stats if available
    if (record.teamStats && record.teamStats.length > 0) {
      // Calculate total team hours for this record to distribute revenue proportionally
      const totalTeamHours = record.teamStats.reduce((sum, stat) => sum + (stat.hours || 0), 0);
      
      record.teamStats.forEach((teamStat) => {
        const teamKey = `${periodKey}_${record.location.id}_${teamStat.team.id}`;
        
        if (!grouped.has(teamKey)) {
          grouped.set(teamKey, {
            period: periodKey,
            periodType,
            locationId: record.location.id,
            locationName: record.location.name,
            teamId: teamStat.team.id,
            teamName: teamStat.team.name,
            totalHoursWorked: 0,
            totalWageCost: 0,
            totalRevenue: 0,
            recordCount: 0,
          });
        }

        const group = grouped.get(teamKey)!;
        const teamHours = teamStat.hours || 0;
        group.totalHoursWorked += teamHours;
        group.totalWageCost += teamStat.cost || 0;
        
        // Distribute revenue proportionally based on hours worked
        // If totalTeamHours is 0, distribute evenly
        if (totalTeamHours > 0) {
          const revenueShare = (teamHours / totalTeamHours) * (record.totalRevenue || 0);
          group.totalRevenue += revenueShare;
        } else if (record.teamStats.length > 0) {
          // Distribute evenly if no hours data
          group.totalRevenue += (record.totalRevenue || 0) / record.teamStats.length;
        }
        group.recordCount += 1;
      });
    } else {
      // No team stats - create a "Total" or "Unknown" team entry
      const totalKey = `${periodKey}_${record.location.id}_total`;
      
      if (!grouped.has(totalKey)) {
        grouped.set(totalKey, {
          period: periodKey,
          periodType,
          locationId: record.location.id,
          locationName: record.location.name,
          teamId: 'total',
          teamName: 'Total',
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          recordCount: 0,
        });
      }

      const group = grouped.get(totalKey)!;
      group.totalHoursWorked += record.totalHoursWorked || 0;
      group.totalWageCost += record.totalWageCost || 0;
      group.totalRevenue += record.totalRevenue || 0;
      group.recordCount += 1;
    }
  });

  // Convert to ProductivityAggregation array and calculate derived metrics
  const result: ProductivityAggregation[] = Array.from(grouped.values()).map((group) => {
    const revenuePerHour = group.totalHoursWorked > 0
      ? group.totalRevenue / group.totalHoursWorked
      : 0;
    
    const laborCostPercentage = group.totalRevenue > 0
      ? (group.totalWageCost / group.totalRevenue) * 100
      : 0;

    return {
      period: group.period,
      periodType: group.periodType,
      locationId: group.locationId,
      locationName: group.locationName,
      teamId: group.teamId,
      teamName: group.teamName,
      totalHoursWorked: group.totalHoursWorked,
      totalWageCost: group.totalWageCost,
      totalRevenue: group.totalRevenue,
      revenuePerHour,
      laborCostPercentage,
      recordCount: group.recordCount,
    };
  });

  // Filter by team if specified
  if (teamFilter && teamFilter !== 'all') {
    return result.filter(r => r.teamName === teamFilter);
  }

  // Sort by period (descending) and team name
  return result.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period); // Descending
    }
    return (a.teamName || '').localeCompare(b.teamName || '');
  });
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

