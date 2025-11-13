/**
 * Finance P&L Analysis Model
 * Type definitions for P&L Analysis data structures
 */

import type { TimeGranularity } from "@/lib/finance/chartDataAggregator";

export interface Location {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CategorySelection {
  category: string;
  subcategory?: string;
}

export interface CategoryData {
  category: string;
  subcategory?: string;
  data: Array<{ period: string; value: number }>;
}

export type MetricType = "revenue" | "gross_profit" | "ebitda" | "labor_cost" | "other_costs";

export type ChartType = "line" | "bar";

export interface PnLData {
  revenue: number;
  gross_profit: number;
  ebitda: number;
  labor_cost: number;
  other_costs: number;
  cogs: number;
  financial_costs?: number;
}

export interface PnLTimeSeriesPoint {
  period: string;
  value: number;
}

export interface PnLAnalysisState {
  activeLocations: string[];
  isChatOpen: boolean;
  isCategoryFilterOpen: boolean;
  selectedCategories: CategorySelection[];
  selectedMetric: MetricType;
  comparisonEnabled: boolean;
  includeVat: boolean;
  chartType: ChartType;
  xAxisGranularity: TimeGranularity;
  isReprocessing: boolean;
  periodAPreset: string;
  periodARange: DateRange | null;
  periodBPreset: string;
  periodBRange: DateRange | null;
}

export interface PnLQueryParams {
  locationId: string | null;
  dateRange: DateRange | null;
}

export interface PnLByCategoryQueryParams {
  locationId: string | null;
  dateRange: DateRange | null;
  selectedCategories: CategorySelection[];
}

export interface PnLTimeSeriesQueryParams {
  locationId: string | null;
  dateRange: DateRange | null;
  metric: MetricType;
}



