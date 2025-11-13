/**
 * Daily Ops Finance Service Layer
 * Server-side data fetching functions for finance dashboard
 */

import { safeFetch } from "@/lib/safe-fetch";
import {
  FinanceDashboardQueryParams,
  FinanceDashboardResponse,
  AggregatedPnLRecord,
} from "@/models/daily-ops/finance.model";

/**
 * Metric type for time series charts
 */
export type MetricType = "revenue" | "gross_profit" | "ebitda" | "labor_cost" | "other_costs";

/**
 * Time series data point
 */
export interface PnLTimeSeriesPoint {
  period: string;
  value: number;
}

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Fetch aggregated P&L data for finance dashboard
 */
export async function fetchPnLAggregatedData(
  params: FinanceDashboardQueryParams
): Promise<AggregatedPnLRecord[]> {
  const urlParams = new URLSearchParams({
    year: params.year.toString(),
    location: params.location,
  });

  if (params.month !== null && params.month !== undefined) {
    urlParams.append("month", params.month.toString());
  }

  const result = await safeFetch<FinanceDashboardResponse>(
    `/api/finance/pnl-aggregated-data?${urlParams.toString()}`,
    {
      timeout: 30000,
    }
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch P&L aggregated data");
  }

  if (!result.data.success) {
    throw new Error(result.data.error || "API returned error");
  }

  return result.data.data || [];
}

/**
 * Fetch P&L data for current year and previous year
 * Used for 6-month average calculations
 */
export async function fetchPnLDataForComparison(
  params: FinanceDashboardQueryParams
): Promise<{
  currentYear: AggregatedPnLRecord[];
  previousYear: AggregatedPnLRecord[];
}> {
  const [currentYear, previousYear] = await Promise.all([
    fetchPnLAggregatedData({ ...params, year: params.year }),
    fetchPnLAggregatedData({ ...params, year: params.year - 1 }),
  ]);

  return { currentYear, previousYear };
}

/**
 * Extract metric value from aggregated totals
 */
function extractMetricFromSummary(totals: {
  revenue: number;
  cogs: number;
  labor: number;
  opex: number;
  depreciation?: number;
}, metric: MetricType): number {
  switch (metric) {
    case "revenue":
      return totals.revenue;
    case "gross_profit":
      return totals.revenue - totals.cogs;
    case "ebitda":
      return totals.revenue - totals.cogs - totals.labor - totals.opex + (totals.depreciation || 0);
    case "labor_cost":
      return totals.labor;
    case "other_costs":
      return totals.opex;
    default:
      return 0;
  }
}

/**
 * Fetch and process P&L time series data for charts
 * All business logic is in the Service layer (MVVM compliant)
 * 
 * @param locationId - Location ID or 'all' for all locations
 * @param dateRange - Date range for the query
 * @param metric - Metric to extract (revenue, gross_profit, ebitda, etc.)
 * @returns Processed time series data points
 */
export async function fetchPnLTimeSeries(
  locationId: string | null,
  dateRange: DateRange | null,
  metric: MetricType
): Promise<PnLTimeSeriesPoint[]> {
  if (!dateRange) return [];

  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;

  // Fetch raw data from API endpoint
  const params = new URLSearchParams({
    locationId: locationId || 'all',
    startYear: startYear.toString(),
    startMonth: startMonth.toString(),
    endYear: endYear.toString(),
    endMonth: endMonth.toString(),
  });

  const result = await safeFetch<{ success: boolean; data: any[]; error?: string }>(
    `/api/finance/pnl-timeseries?${params.toString()}`,
    {
      timeout: 30000,
    }
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch time series data");
  }

  if (!result.data.success) {
    throw new Error(result.data.error || "API returned error");
  }

  const allData = result.data.data || [];

  // Business logic: Group by month and aggregate totals (Service Layer responsibility)
  const grouped = new Map<string, {
    revenue: number;
    cogs: number;
    labor: number;
    opex: number;
    depreciation: number;
  }>();

  allData.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        revenue: 0,
        cogs: 0,
        labor: 0,
        opex: 0,
        depreciation: 0,
      });
    }

    const totals = grouped.get(monthKey)!;
    
    // Aggregate fields from powerbi_pnl_aggregated table
    totals.revenue += row.revenue_total || 0;
    totals.cogs += Math.abs(row.cost_of_sales_total || row.inkoopwaarde_handelsgoederen || 0);
    totals.labor += Math.abs(row.labor_total || row.lonen_en_salarissen || 0);
    totals.opex += Math.abs(row.other_costs_total || row.overige_bedrijfskosten || 0);
    // Note: depreciation and financial costs might not be in aggregated table
    // If needed, we can add them later
  });

  // Process into final format with metric extraction
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({
      period,
      value: extractMetricFromSummary(totals, metric),
    }));
}

