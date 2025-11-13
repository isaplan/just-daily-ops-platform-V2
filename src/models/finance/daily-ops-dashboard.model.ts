/**
 * Finance Daily Ops Dashboard Model Layer
 * Type definitions for daily ops dashboard data
 */

export interface Location {
  id: string;
  name: string;
  color: string;
}

export interface DateRangePreset {
  label: string;
  getRange: () => { from: Date; to: Date };
}

export interface TeamData {
  teamId: number;
  teamName: string;
  workers: number;
  hours: number;
  productivity: number;
}

export interface HourlyBreakdown {
  hour: number;
  workers: number;
  hours: number;
  productivity: number;
}

export interface LaborData {
  totalHours: number;
  totalWorkers: number;
  avgHoursPerWorker: number;
  laborCost: number;
  productivity: number;
  teams: TeamData[];
  hourlyBreakdown: HourlyBreakdown[];
}

export interface ProductData {
  product: string;
  revenue: number;
  transactions: number;
  avgPrice: number;
}

export interface ProductCombination {
  combination: string;
  revenue: number;
  frequency: number;
}

export interface SalesHourlyBreakdown {
  hour: number;
  revenue: number;
  transactions: number;
  avgValue: number;
}

export interface WeeklyTrend {
  day: string;
  revenue: number;
  transactions: number;
}

export interface SalesData {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  topProducts: ProductData[];
  topCombinations: ProductCombination[];
  hourlyBreakdown: SalesHourlyBreakdown[];
  weeklyTrend: WeeklyTrend[];
}

export interface CombinedKPIs {
  revenuePerWorker: number;
  salesProductivity: number;
  laborEfficiency: number;
  profitMargin: number;
}

export interface KPIData {
  labor: LaborData;
  sales: SalesData;
  combined: CombinedKPIs;
}

export interface DailyOpsQueryParams {
  locationId?: string;
  startDate: string;
  endDate: string;
}

export type LocationKey = "total" | "kinsbergen" | "barbea" | "lamour";
export type DateRangeKey = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";



