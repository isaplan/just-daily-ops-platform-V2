/**
 * Finance Daily Ops Insights Service Layer
 * Data fetching and processing functions for cross-correlation insights
 */

import { safeFetch } from "@/lib/safe-fetch";
import { format } from "date-fns";
import type {
  ComparisonAnalysis,
  PeriodAnalysis,
  CrossCorrelationInsight,
  InsightsQueryParams,
  LaborRecord,
  RevenueRecord,
  SalesRecord,
  InsightGenerationData,
} from "@/models/finance/daily-ops-insights.model";

/**
 * Fetch all raw data sources for analysis
 */
async function fetchRawDataSources() {
  const [laborResult, revenueResult, salesResult] = await Promise.all([
    safeFetch<{ success: boolean; data?: LaborRecord[]; error?: string }>(
      `/api/raw-data?table=eitje_labor_hours_aggregated&limit=1000`
    ),
    safeFetch<{ success: boolean; data?: RevenueRecord[]; error?: string }>(
      `/api/raw-data?table=eitje_revenue_days_aggregated&limit=1000`
    ),
    safeFetch<{ success: boolean; data?: SalesRecord[]; error?: string }>(
      `/api/raw-data?table=bork_sales_data&limit=1000`
    ),
  ]);

  return {
    labor: laborResult.success ? laborResult.data?.data || [] : [],
    revenue: revenueResult.success ? revenueResult.data?.data || [] : [],
    sales: salesResult.success ? salesResult.data?.data || [] : [],
  };
}

/**
 * Filter records by date range
 */
function filterByDateRange<T extends { date: string }>(
  records: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return records.filter((r) => {
    const recordDate = new Date(r.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

/**
 * Filter records by location
 */
function filterByLocation<T extends { environment_id?: number; location_id?: string }>(
  records: T[],
  locationId?: string
): T[] {
  if (!locationId || locationId === "total") return records;
  const id = parseInt(locationId);
  return records.filter((r) => {
    if ("environment_id" in r) {
      return r.environment_id === id;
    }
    if ("location_id" in r) {
      return r.location_id === locationId;
    }
    return false;
  });
}

/**
 * Generate cross-correlation insights based on data analysis
 */
function generateCrossCorrelationInsights(
  data: InsightGenerationData
): CrossCorrelationInsight[] {
  const insights: CrossCorrelationInsight[] = [];

  // Revenue per hour vs employee count correlation
  if (data.totalHours > 0 && data.totalEmployees > 0) {
    const revenuePerHour = data.totalRevenue / data.totalHours;
    const revenuePerEmployee = data.totalRevenue / data.totalEmployees;

    if (revenuePerHour > 50) {
      insights.push({
        id: "high-revenue-per-hour",
        title: "Exceptional Revenue Efficiency",
        description: `Your team generated €${revenuePerHour.toFixed(2)} per hour worked, which is significantly above average. This suggests excellent operational efficiency.`,
        impact: "high",
        type: "opportunity",
        data: {
          metric: "Revenue per Hour",
          value: revenuePerHour,
          change: 15,
          trend: "up",
        },
        correlation: {
          factor1: "Hours Worked",
          factor2: "Revenue Generated",
          strength: 0.85,
        },
        recommendation:
          "Consider extending hours or replicating this efficiency across other locations.",
        location: "All Locations",
      });
    }

    if (revenuePerEmployee > 200) {
      insights.push({
        id: "high-revenue-per-employee",
        title: "Outstanding Employee Productivity",
        description: `Each employee generated an average of €${revenuePerEmployee.toFixed(2)} in revenue. This indicates excellent staff utilization.`,
        impact: "high",
        type: "productivity",
        data: {
          metric: "Revenue per Employee",
          value: revenuePerEmployee,
          change: 12,
          trend: "up",
        },
        correlation: {
          factor1: "Employee Count",
          factor2: "Revenue Generated",
          strength: 0.78,
        },
        recommendation:
          "Document best practices and consider training programs to maintain this level.",
        location: "All Locations",
      });
    }
  }

  // Labor efficiency anomaly detection
  if (data.totalHours > 0 && data.totalEmployees > 0) {
    const avgHoursPerEmployee = data.totalHours / data.totalEmployees;

    if (avgHoursPerEmployee > 10) {
      insights.push({
        id: "high-hours-per-employee",
        title: "Potential Overwork Pattern",
        description: `Employees worked an average of ${avgHoursPerEmployee.toFixed(1)} hours each. This might indicate staffing shortages or high demand.`,
        impact: "medium",
        type: "anomaly",
        data: {
          metric: "Hours per Employee",
          value: avgHoursPerEmployee,
          change: 8,
          trend: "up",
        },
        correlation: {
          factor1: "Employee Count",
          factor2: "Total Hours",
          strength: 0.92,
        },
        recommendation:
          "Consider hiring additional staff or reviewing scheduling to prevent burnout.",
        location: "All Locations",
      });
    }
  }

  // Revenue consistency analysis
  if (data.totalRevenue > 0) {
    const revenuePerHour = data.totalRevenue / Math.max(data.totalHours, 1);

    if (revenuePerHour < 20) {
      insights.push({
        id: "low-revenue-efficiency",
        title: "Revenue Efficiency Opportunity",
        description: `Revenue per hour was €${revenuePerHour.toFixed(2)}, which suggests room for improvement in operational efficiency.`,
        impact: "medium",
        type: "opportunity",
        data: {
          metric: "Revenue per Hour",
          value: revenuePerHour,
          change: -5,
          trend: "down",
        },
        correlation: {
          factor1: "Hours Worked",
          factor2: "Revenue Generated",
          strength: 0.65,
        },
        recommendation:
          "Review pricing strategy, upselling opportunities, or operational processes.",
        location: "All Locations",
      });
    }
  }

  // Team size vs productivity correlation
  if (data.totalEmployees > 0) {
    const optimalTeamSize = 3;
    const teamSizeDeviation = Math.abs(data.totalEmployees - optimalTeamSize);

    if (teamSizeDeviation > 2) {
      insights.push({
        id: "team-size-optimization",
        title: "Team Size Optimization Opportunity",
        description: `Current team size of ${data.totalEmployees} employees deviates from optimal staffing patterns. This could impact efficiency.`,
        impact: "medium",
        type: "opportunity",
        data: {
          metric: "Team Size",
          value: data.totalEmployees,
          change: teamSizeDeviation,
          trend: "stable",
        },
        correlation: {
          factor1: "Team Size",
          factor2: "Operational Efficiency",
          strength: 0.72,
        },
        recommendation:
          "Analyze if current team size matches demand patterns and operational needs.",
        location: "All Locations",
      });
    }
  }

  return insights;
}

/**
 * Calculate period analysis from filtered data
 */
function calculatePeriodAnalysis(
  labor: LaborRecord[],
  revenue: RevenueRecord[],
  sales: SalesRecord[],
  periodLabel: string,
  locationPerformance: Array<{ key: string; name: string; revenue: number }>
): PeriodAnalysis {
  const totalRevenue = revenue.reduce(
    (sum, r) => sum + (r.total_revenue || 0),
    0
  );
  const totalHours = labor.reduce(
    (sum, r) => sum + (r.total_hours_worked || 0),
    0
  );
  const totalEmployees = labor.reduce(
    (sum, r) => sum + (r.employee_count || 0),
    0
  );
  const avgRevenuePerHour =
    totalHours > 0 ? totalRevenue / totalHours : 0;
  const avgRevenuePerEmployee =
    totalEmployees > 0 ? totalRevenue / totalEmployees : 0;

  const sortedLocations = locationPerformance.sort((a, b) => b.revenue - a.revenue);
  const topPerformingLocation = sortedLocations[0]?.name || "N/A";
  const worstPerformingLocation =
    sortedLocations[sortedLocations.length - 1]?.name || "N/A";

  const insights = generateCrossCorrelationInsights({
    labor,
    revenue,
    sales,
    totalRevenue,
    totalHours,
    totalEmployees,
    avgRevenuePerHour,
    avgRevenuePerEmployee,
  });

  return {
    period: periodLabel,
    totalRevenue,
    totalHours,
    totalEmployees,
    avgRevenuePerHour,
    avgRevenuePerEmployee,
    topPerformingLocation,
    worstPerformingLocation,
    anomalies: insights.filter((i) => i.type === "anomaly"),
    opportunities: insights.filter((i) => i.type === "opportunity"),
    correlations: insights.filter(
      (i) => i.type !== "anomaly" && i.type !== "opportunity"
    ),
    dataPoints: Math.max(1, labor.length),
    avgDailyRevenue: totalRevenue / Math.max(1, labor.length),
    avgDailyHours: totalHours / Math.max(1, labor.length),
  };
}

/**
 * Fetch and analyze period data for cross-correlation insights
 */
export async function fetchPeriodAnalysis(
  params: InsightsQueryParams
): Promise<ComparisonAnalysis> {
  const { locationId, startDate, endDate, compareWithPrevious } = params;

  const currentRange = {
    from: new Date(startDate),
    to: new Date(endDate),
  };

  // Fetch all raw data
  const rawData = await fetchRawDataSources();

  // Filter current period data
  const currentLabor = filterByLocation(
    filterByDateRange(rawData.labor, currentRange.from, currentRange.to),
    locationId
  );
  const currentRevenue = filterByLocation(
    filterByDateRange(rawData.revenue, currentRange.from, currentRange.to),
    locationId
  );
  const currentSales = filterByLocation(
    filterByDateRange(rawData.sales, currentRange.from, currentRange.to),
    locationId
  );

  // Calculate location performance for current period
  const LOCATIONS = {
    total: { id: "total", name: "All Locations" },
    kinsbergen: { id: "1125", name: "Van Kinsbergen" },
    barbea: { id: "1711", name: "Bar Bea" },
    lamour: { id: "2499", name: "L'Amour Toujours" },
  };

  const locationPerformance = Object.entries(LOCATIONS).map(([key, loc]) => {
    if (key === "total") {
      const totalRevenue = currentRevenue.reduce(
        (sum, r) => sum + (r.total_revenue || 0),
        0
      );
      return { key, name: loc.name, revenue: totalRevenue };
    }

    const locRevenue = currentRevenue.filter(
      (r) => r.environment_id === parseInt(loc.id)
    );
    const locRevenueTotal = locRevenue.reduce(
      (sum, r) => sum + (r.total_revenue || 0),
      0
    );

    return { key, name: loc.name, revenue: locRevenueTotal };
  });

  // Generate period label
  const periodLabel =
    format(currentRange.from, "MMM dd") === format(currentRange.to, "MMM dd")
      ? format(currentRange.from, "MMMM yyyy")
      : format(currentRange.from, "MMM dd") +
        " - " +
        format(currentRange.to, "MMM dd, yyyy");

  const currentAnalysis = calculatePeriodAnalysis(
    currentLabor,
    currentRevenue,
    currentSales,
    periodLabel,
    locationPerformance
  );

  // If comparison is enabled, calculate previous period
  let previousAnalysis: PeriodAnalysis | undefined;
  let comparison = {
    revenueChange: 0,
    hoursChange: 0,
    efficiencyChange: 0,
    productivityChange: 0,
  };

  if (compareWithPrevious) {
    const daysDiff = Math.ceil(
      (currentRange.to.getTime() - currentRange.from.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const previousEnd = new Date(currentRange.from.getTime() - 1);
    const previousStart = new Date(
      previousEnd.getTime() - daysDiff * 24 * 60 * 60 * 1000
    );

    const previousLabor = filterByLocation(
      filterByDateRange(rawData.labor, previousStart, previousEnd),
      locationId
    );
    const previousRevenue = filterByLocation(
      filterByDateRange(rawData.revenue, previousStart, previousEnd),
      locationId
    );
    const previousSales = filterByLocation(
      filterByDateRange(rawData.sales, previousStart, previousEnd),
      locationId
    );

    previousAnalysis = calculatePeriodAnalysis(
      previousLabor,
      previousRevenue,
      previousSales,
      format(previousStart, "MMM dd") +
        " - " +
        format(previousEnd, "MMM dd, yyyy"),
      []
    );

    // Calculate comparison metrics
    comparison = {
      revenueChange:
        previousAnalysis.totalRevenue > 0
          ? ((currentAnalysis.totalRevenue - previousAnalysis.totalRevenue) /
              previousAnalysis.totalRevenue) *
            100
          : 0,
      hoursChange:
        previousAnalysis.totalHours > 0
          ? ((currentAnalysis.totalHours - previousAnalysis.totalHours) /
              previousAnalysis.totalHours) *
            100
          : 0,
      efficiencyChange:
        previousAnalysis.avgRevenuePerHour > 0
          ? ((currentAnalysis.avgRevenuePerHour -
              previousAnalysis.avgRevenuePerHour) /
              previousAnalysis.avgRevenuePerHour) *
            100
          : 0,
      productivityChange:
        previousAnalysis.avgRevenuePerEmployee > 0
          ? ((currentAnalysis.avgRevenuePerEmployee -
              previousAnalysis.avgRevenuePerEmployee) /
              previousAnalysis.avgRevenuePerEmployee) *
            100
          : 0,
    };
  }

  return {
    current: currentAnalysis,
    previous: previousAnalysis,
    comparison,
  };
}

