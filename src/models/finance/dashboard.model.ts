/**
 * Finance Dashboard Model
 * Type definitions for Finance Dashboard data structures
 */

export type PeriodType = "day" | "week" | "month" | "quarter" | "year";

export interface Location {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface DailyRevenueBreakdown {
  date: string;
  revenue: number;
  profit: number;
  transactions: number;
}

export interface RevenueData {
  totalRevenue: number;
  dailyBreakdown: DailyRevenueBreakdown[];
  revenueGrowth: number;
}

export interface ProductPerformance {
  productName: string;
  quantity: number;
  revenue: number;
  profit?: number;
  category?: string;
}

export interface SalesIntelligenceData {
  topProducts: ProductPerformance[];
  topCategories: ProductPerformance[];
}

export interface FinanceDashboardQueryParams {
  period: PeriodType;
  currentDate: Date;
  comparisonCount: number;
  selectedLocation: string | null;
}

export interface FinanceDashboardState {
  period: PeriodType;
  currentDate: Date;
  comparisonCount: number;
  selectedLocation: string | null;
}



