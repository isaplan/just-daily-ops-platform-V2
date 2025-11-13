/**
 * Finance Daily Ops Dashboard Service Layer
 * Data fetching and processing functions for daily ops dashboard
 */

import { safeFetch } from "@/lib/safe-fetch";
import type {
  LaborData,
  SalesData,
  DailyOpsQueryParams,
  TeamData,
  HourlyBreakdown,
  ProductData,
  ProductCombination,
  SalesHourlyBreakdown,
  WeeklyTrend,
} from "@/models/finance/daily-ops-dashboard.model";

/**
 * Fetch and process labor data
 */
export async function fetchLaborData(
  params: DailyOpsQueryParams
): Promise<LaborData> {
  const result = await safeFetch<{
    success: boolean;
    data?: Array<{
      date: string;
      environment_id: number;
      team_id: number;
      total_hours_worked: number;
      employee_count: number;
      total_wage_cost: number;
    }>;
    error?: string;
  }>(`/api/raw-data?table=eitje_labor_hours_aggregated&limit=1000`);

  if (!result.success || !result.data?.data) {
    throw new Error(result.error || "Failed to fetch labor data");
  }

  let records = result.data.data;

  // Filter by date range
  records = records.filter(
    (r) => r.date >= params.startDate && r.date <= params.endDate
  );

  // Filter by location if not total
  if (params.locationId && params.locationId !== "total") {
    const locationId = parseInt(params.locationId);
    records = records.filter((r) => r.environment_id === locationId);
  }

  // Calculate labor KPIs
  const totalHours =
    records?.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0) || 0;
  const totalWorkers =
    records?.reduce((sum, r) => sum + (r.employee_count || 0), 0) || 0;
  const laborCost =
    records?.reduce((sum, r) => sum + (r.total_wage_cost || 0), 0) || 0;

  // Group by team
  const teamMap = new Map<number, TeamData>();
  records?.forEach((record) => {
    const teamId = record.team_id || 0;
    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, {
        teamId,
        teamName: `Team ${teamId}`,
        workers: 0,
        hours: 0,
        productivity: 0,
      });
    }
    const team = teamMap.get(teamId)!;
    team.workers += record.employee_count || 0;
    team.hours += record.total_hours_worked || 0;
  });

  // Calculate team productivity
  teamMap.forEach((team) => {
    team.productivity = team.workers > 0 ? team.hours / team.workers : 0;
  });

  // Hourly breakdown (simplified - would need more detailed data)
  const hourlyBreakdown: HourlyBreakdown[] = Array.from(
    { length: 24 },
    (_, hour) => ({
      hour,
      workers: Math.floor(totalWorkers * (0.3 + Math.random() * 0.4)), // Simulated
      hours: totalHours / 24, // Simplified
      productivity:
        totalWorkers > 0
          ? (totalHours / 24) / Math.floor(totalWorkers * 0.35)
          : 0,
    })
  );

  return {
    totalHours,
    totalWorkers,
    avgHoursPerWorker: totalWorkers > 0 ? totalHours / totalWorkers : 0,
    laborCost,
    productivity: totalWorkers > 0 ? totalHours / totalWorkers : 0,
    teams: Array.from(teamMap.values()),
    hourlyBreakdown,
  };
}

/**
 * Fetch and process sales data
 */
export async function fetchSalesData(
  params: DailyOpsQueryParams
): Promise<SalesData> {
  const result = await safeFetch<{
    success: boolean;
    data?: Array<{
      date: string;
      environment_id: number;
      total_revenue: number;
      transaction_count: number;
    }>;
    error?: string;
  }>(`/api/raw-data?table=eitje_revenue_days_aggregated&limit=1000`);

  if (!result.success || !result.data?.data) {
    throw new Error(result.error || "Failed to fetch sales data");
  }

  let records = result.data.data;

  // Filter by date range
  records = records.filter(
    (r) => r.date >= params.startDate && r.date <= params.endDate
  );

  // Filter by location if not total
  if (params.locationId && params.locationId !== "total") {
    const locationId = parseInt(params.locationId);
    records = records.filter((r) => r.environment_id === locationId);
  }

  const totalRevenue =
    records?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0;
  const totalTransactions =
    records?.reduce((sum, r) => sum + (r.transaction_count || 0), 0) || 0;

  // Simulated product data (would need actual product breakdown)
  const topProducts: ProductData[] = [
    {
      product: "Cocktails",
      revenue: totalRevenue * 0.35,
      transactions: Math.floor(totalTransactions * 0.4),
      avgPrice: 12.5,
    },
    {
      product: "Beer",
      revenue: totalRevenue * 0.25,
      transactions: Math.floor(totalTransactions * 0.3),
      avgPrice: 4.5,
    },
    {
      product: "Wine",
      revenue: totalRevenue * 0.2,
      transactions: Math.floor(totalTransactions * 0.15),
      avgPrice: 8.0,
    },
    {
      product: "Food",
      revenue: totalRevenue * 0.2,
      transactions: Math.floor(totalTransactions * 0.15),
      avgPrice: 15.0,
    },
  ];

  const topCombinations: ProductCombination[] = [
    {
      combination: "Cocktail + Food",
      revenue: totalRevenue * 0.15,
      frequency: Math.floor(totalTransactions * 0.1),
    },
    {
      combination: "Beer + Snacks",
      revenue: totalRevenue * 0.12,
      frequency: Math.floor(totalTransactions * 0.08),
    },
    {
      combination: "Wine + Appetizer",
      revenue: totalRevenue * 0.1,
      frequency: Math.floor(totalTransactions * 0.06),
    },
  ];

  // Hourly breakdown (simulated)
  const hourlyBreakdown: SalesHourlyBreakdown[] = Array.from(
    { length: 24 },
    (_, hour) => {
      const baseRevenue = totalRevenue / 24;
      const multiplier =
        hour >= 18 && hour <= 23
          ? 1.5
          : hour >= 12 && hour <= 14
            ? 1.2
            : 0.8;
      return {
        hour,
        revenue: baseRevenue * multiplier,
        transactions: Math.floor((totalTransactions / 24) * multiplier),
        avgValue:
          totalTransactions > 0
            ? (baseRevenue * multiplier) /
              Math.floor((totalTransactions / 24) * multiplier)
            : 0,
      };
    }
  );

  // Weekly trend (simulated)
  const weeklyTrend: WeeklyTrend[] = [
    {
      day: "Mon",
      revenue: totalRevenue * 0.12,
      transactions: Math.floor(totalTransactions * 0.1),
    },
    {
      day: "Tue",
      revenue: totalRevenue * 0.14,
      transactions: Math.floor(totalTransactions * 0.12),
    },
    {
      day: "Wed",
      revenue: totalRevenue * 0.16,
      transactions: Math.floor(totalTransactions * 0.14),
    },
    {
      day: "Thu",
      revenue: totalRevenue * 0.18,
      transactions: Math.floor(totalTransactions * 0.16),
    },
    {
      day: "Fri",
      revenue: totalRevenue * 0.2,
      transactions: Math.floor(totalTransactions * 0.18),
    },
    {
      day: "Sat",
      revenue: totalRevenue * 0.15,
      transactions: Math.floor(totalTransactions * 0.2),
    },
    {
      day: "Sun",
      revenue: totalRevenue * 0.05,
      transactions: Math.floor(totalTransactions * 0.1),
    },
  ];

  return {
    totalRevenue,
    totalTransactions,
    avgTransactionValue:
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    topProducts,
    topCombinations,
    hourlyBreakdown,
    weeklyTrend,
  };
}



