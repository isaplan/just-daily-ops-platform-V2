/**
 * Labor Cost Service Layer
 * Server-side data fetching functions for labor cost calculations
 */

import { LaborCostQueryParams, LaborCostResponse, LaborCostRecord } from '@/models/workforce/labor-cost.model';
import { getProcessedHours, HoursFilters } from '@/lib/services/graphql/queries';
import { ProcessedHoursRecord } from '@/models/workforce/hours-v2.model';

/**
 * Aggregate processed hours records by user/date to calculate labor costs
 */
function aggregateProcessedHours(records: ProcessedHoursRecord[]): LaborCostRecord[] {
  // Group by user_id + date + team_name to aggregate multiple shifts per day
  const grouped = new Map<string, {
    date: string;
    user_id?: number;
    user_name?: string | null;
    environment_id?: number | null;
    environment_name?: string | null;
    team_id?: number | null;
    team_name?: string | null;
    hours_worked: number;
    labor_cost: number;
    shift_count: number;
  }>();

  records.forEach((record) => {
    const key = `${record.user_id || 'unknown'}_${record.date}_${record.team_name || 'unknown'}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: record.date,
        user_id: record.user_id,
        user_name: record.user_name,
        environment_id: record.environment_id,
        environment_name: record.environment_name,
        team_id: record.team_id,
        team_name: record.team_name,
        hours_worked: 0,
        labor_cost: 0,
        shift_count: 0,
      });
    }

    const group = grouped.get(key)!;
    group.hours_worked += record.worked_hours || 0;
    group.labor_cost += record.wage_cost || 0;
    group.shift_count += 1;
  });

  // Convert grouped data to LaborCostRecord format
  return Array.from(grouped.values()).map((group, index) => {
    const laborCost = group.labor_cost || 0;
    const hoursWorked = group.hours_worked || 0;
    const costPerHour = hoursWorked > 0 ? laborCost / hoursWorked : 0;

    return {
      id: `${group.user_id}_${group.date}_${index}`,
      date: group.date,
      user_id: group.user_id,
      user_name: group.user_name,
      environment_id: group.environment_id,
      environment_name: group.environment_name,
      team_id: group.team_id,
      team_name: group.team_name,
      hours_worked: hoursWorked,
      hourly_rate: hoursWorked > 0 ? laborCost / hoursWorked : null,
      hourly_cost: costPerHour,
      labor_cost: laborCost,
      cost_per_hour: costPerHour,
      cost_per_day: laborCost,
      cost_per_week: laborCost * 7, // Simplified - will be recalculated in ViewModel
      cost_per_month: laborCost * 30.44, // Simplified - will be recalculated in ViewModel
      cost_per_year: laborCost * 365, // Simplified - will be recalculated in ViewModel
    };
  });
}

/**
 * Fetch labor cost data from GraphQL API
 */
export async function fetchLaborCosts(
  params: LaborCostQueryParams
): Promise<LaborCostResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: HoursFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.teamName) {
    filters.teamName = params.teamName;
  }
  
  // Use processed hours to get per-user data with user_name, team_name, environment_name
  // For labor costs, we only want worked hours (not leave/vacation)
  // 'WORKED' marker means worked hours (type_name is null or empty)
  if (params.typeName !== undefined) {
    filters.typeName = params.typeName === null ? 'WORKED' : params.typeName;
  } else {
    // Default: only show worked hours
    filters.typeName = 'WORKED';
  }
  
  if (params.userId) {
    filters.userId = params.userId;
  }

  const result = await getProcessedHours(
    params.startDate,
    params.endDate,
    params.page || 1,
    params.limit || 50,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch labor costs');
  }

  // Aggregate processed hours records by user/date/team to calculate labor costs
  const laborCostRecords = aggregateProcessedHours(
    result.records as ProcessedHoursRecord[]
  );

  return {
    success: result.success,
    records: laborCostRecords,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}

