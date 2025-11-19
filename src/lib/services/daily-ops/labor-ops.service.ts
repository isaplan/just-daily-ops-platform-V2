/**
 * Labor Ops Service
 * Fetches and combines sales and labor data for Daily Ops Labor page
 */

import { getLaborAggregated, LaborData } from "@/lib/services/graphql/queries";
import { getDailySales } from "@/lib/services/graphql/queries";
import { getLocations } from "@/lib/services/graphql/queries";
import { LaborOpsData, LaborOpsKPIs, LaborOpsChartData, LaborOpsQueryParams } from "@/models/daily-ops/labor-ops.model";

/**
 * Fetch combined sales and labor data for Daily Ops Labor page
 */
export async function fetchLaborOpsData(params: LaborOpsQueryParams): Promise<LaborOpsData> {
  const { startDate, endDate, locationId } = params;

  // Fetch all locations if no specific location selected
  const locations = await getLocations();
  const validLocations = locations.filter(
    (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
  );

  // If specific location, fetch data for that location only
  // Otherwise, fetch for all locations
  const locationIds = locationId && locationId !== "all" 
    ? [locationId] 
    : validLocations.map((loc: any) => loc.id);

  // Fetch labor data for all selected locations
  const laborPromises = locationIds.map((id: string) =>
    getLaborAggregated(id, startDate, endDate)
  );
  const laborResults = await Promise.all(laborPromises);
  const allLaborData = laborResults.flat();

  // Fetch sales data (aggregate by date and location)
  const salesData = await getDailySales(startDate, endDate, 1, 10000, {
    locationId: locationId && locationId !== "all" ? locationId : undefined,
  });

  // Combine and aggregate data by date
  const dateMap = new Map<string, {
    revenue: number;
    laborCost: number;
    hours: number;
  }>();

  // Process labor data
  allLaborData.forEach((labor: LaborData) => {
    const dateKey = new Date(labor.date).toISOString().split('T')[0];
    const existing = dateMap.get(dateKey) || { revenue: 0, laborCost: 0, hours: 0 };
    
    dateMap.set(dateKey, {
      revenue: existing.revenue + (labor.totalRevenue || 0),
      laborCost: existing.laborCost + (labor.totalWageCost || 0),
      hours: existing.hours + (labor.totalHoursWorked || 0),
    });
  });

  // Process sales data (aggregate by date)
  const salesByDate = new Map<string, number>();
  salesData.records.forEach((sale: any) => {
    const dateKey = sale.date.split('T')[0];
    const existing = salesByDate.get(dateKey) || 0;
    salesByDate.set(dateKey, existing + (sale.total_inc_vat || 0));
  });

  // Merge sales data into date map
  salesByDate.forEach((revenue, dateKey) => {
    const existing = dateMap.get(dateKey) || { revenue: 0, laborCost: 0, hours: 0 };
    dateMap.set(dateKey, {
      ...existing,
      revenue: existing.revenue + revenue,
    });
  });

  // Build chart data
  const chartData: LaborOpsChartData[] = Array.from(dateMap.entries())
    .map(([date, data]) => {
      const laborCostPercentage = data.revenue > 0 
        ? (data.laborCost / data.revenue) * 100 
        : 0;
      const revenuePerHour = data.hours > 0 
        ? data.revenue / data.hours 
        : 0;

      return {
        date,
        revenue: data.revenue,
        laborCost: data.laborCost,
        hours: data.hours,
        laborCostPercentage,
        revenuePerHour,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate KPIs
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalLaborCost = chartData.reduce((sum, d) => sum + d.laborCost, 0);
  const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0);
  const laborCostPercentage = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0;
  const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
  const dayCount = chartData.length;
  const averageHoursPerDay = dayCount > 0 ? totalHours / dayCount : 0;
  const averageRevenuePerDay = dayCount > 0 ? totalRevenue / dayCount : 0;

  const kpis: LaborOpsKPIs = {
    totalRevenue,
    totalLaborCost,
    totalHours,
    laborCostPercentage,
    revenuePerHour,
    averageHoursPerDay,
    averageRevenuePerDay,
  };

  return {
    kpis,
    chartData,
  };
}

