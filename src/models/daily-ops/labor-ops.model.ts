/**
 * Labor Ops Model
 * Type definitions for Daily Ops Labor page
 */

export interface LaborOpsKPIs {
  totalRevenue: number;
  totalLaborCost: number;
  totalHours: number;
  laborCostPercentage: number;
  revenuePerHour: number;
  averageHoursPerDay: number;
  averageRevenuePerDay: number;
}

export interface LaborOpsChartData {
  date: string;
  revenue: number;
  laborCost: number;
  hours: number;
  laborCostPercentage: number;
  revenuePerHour: number;
}

export interface LaborOpsData {
  kpis: LaborOpsKPIs;
  chartData: LaborOpsChartData[];
}

export interface LaborOpsQueryParams {
  startDate: string;
  endDate: string;
  locationId?: string;
}




