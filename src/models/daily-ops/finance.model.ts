/**
 * Daily Ops Finance Model Layer
 * Type definitions and interfaces for daily-ops finance data
 */

export interface AggregatedPnLRecord {
  id: string;
  location_id: string;
  year: number;
  month: number;
  revenue_total?: number;
  cost_of_sales_total?: number;
  inkoopwaarde_handelsgoederen?: number;
  labor_total?: number;
  lonen_en_salarissen?: number;
  other_costs_total?: number;
  overige_bedrijfskosten?: number;
  resultaat: number;
}

export interface KpiData {
  lastMonth: number;
  sixMonthAverage: number;
  percentageChange: number;
  isPositive: boolean;
}

export interface FinanceDashboardQueryParams {
  year: number;
  location: string;
  month?: number | null;
}

export interface FinanceDashboardResponse {
  success: boolean;
  data: AggregatedPnLRecord[];
  summary?: {
    totalRecords: number;
    locations: string[];
    months: number[];
    totalRevenue: number;
    totalCosts: number;
    totalResultaat: number;
  };
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface MonthOption {
  value: number;
  label: string;
}

export type MetricType = 
  | "revenue" 
  | "gross_profit" 
  | "ebitda" 
  | "cost_of_sales" 
  | "labor_cost" 
  | "other_costs" 
  | "resultaat";

export type ChartType = "line" | "bar";

export type TimeGranularity = "month" | "quarter" | "year";




