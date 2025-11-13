/**
 * Profit & Loss Model Layer
 * Type definitions for P&L Analysis page
 */

export interface Location {
  id: string;
  name: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type MetricType = "revenue" | "gross_profit" | "ebitda" | "labor_cost" | "other_costs";

export type PeriodPreset = 
  | "today" 
  | "yesterday" 
  | "thisWeek" 
  | "lastWeek" 
  | "thisMonth" 
  | "lastMonth" 
  | "3months" 
  | "6months" 
  | "thisYear" 
  | "lastYear";

export type TimeGranularity = "day" | "week" | "month" | "quarter" | "year";

export interface PnLData {
  revenue: number;
  gross_profit: number;
  ebitda: number;
  labor_cost: number;
  other_costs: number;
  cogs?: number;
  financial_costs?: number;
}

export interface CategoryData {
  category: string;
  subcategory?: string;
  data: Array<{ period: string; value: number }>;
}

export interface CategorySelection {
  category: string;
  subcategory?: string;
  glAccount?: string;
}

export interface ReprocessResult {
  success: boolean;
  periodsProcessed: number;
  error?: string;
}

