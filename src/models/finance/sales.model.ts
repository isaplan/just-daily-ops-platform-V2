/**
 * Finance Sales Performance Model
 * Type definitions for Sales Performance data structures
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

export type SalesMetricType = "revenue" | "quantity" | "avg_price";

export type ChartType = "line" | "bar";

export type Granularity = "day" | "week" | "month" | "quarter" | "year";

export interface SalesDataRecord {
  id: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  unique_products: number;
  top_category: string | null;
  category_breakdown: Record<string, unknown>;
  display_revenue?: number;
  created_at: string;
  updated_at: string;
}

export interface AggregatedSalesData {
  revenue: number;
  quantity: number;
  avgPrice: number;
  productCount: number;
  topCategory: string | null;
  vatAmount: number;
  vat9Base: number;
  vat9Amount: number;
  vat21Base: number;
  vat21Amount: number;
  totalCost: number;
  vatBreakdown: {
    vat9Base: number;
    vat9Amount: number;
    vat21Base: number;
    vat21Amount: number;
    rate9?: { vat: number };
    rate21?: { vat: number };
  };
  costTotal: number;
  profitMargin: number;
  revenueExVat: number;
  revenueIncVat: number;
}

export interface DataSourceStatus {
  hasProcessedData: boolean;
  recordCount: number;
}

export interface SalesPerformanceState {
  activeLocations: string[];
  isCategoryFilterOpen: boolean;
  selectedCategories: CategorySelection[];
  selectedMetric: SalesMetricType;
  comparisonMode: boolean;
  chartType: ChartType;
  granularity: Granularity;
  includeVat: boolean;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  autoRefreshEnabled: boolean;
  periodPreset: string;
  dateRange: DateRange | null;
  comparisonPeriodPreset: string;
  comparisonDateRange: DateRange | null;
}

export interface SalesPerformanceQueryParams {
  locationFilter: string | string[] | "all";
  dateRange: DateRange | null;
  includeVat: boolean;
}

export interface SalesByCategoryQueryParams {
  locationFilter: string | string[] | null;
  dateRange: DateRange | null;
  selectedCategories: CategorySelection[];
  granularity: TimeGranularity;
  includeVat: boolean;
}



