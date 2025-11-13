/**
 * Finance Sales Performance ViewModel
 * Manages state and business logic for Sales Performance page
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SalesPerformanceState,
  SalesDataRecord,
  AggregatedSalesData,
  Location,
  DateRange,
  CategorySelection,
  CategoryData,
  DataSourceStatus,
  SalesMetricType,
  ChartType,
  Granularity,
} from "@/models/finance/sales.model";
import {
  fetchAggregatedSalesData,
  fetchSalesByCategory,
  fetchLocations,
  fetchDataSourceStatus,
  refreshSalesData,
} from "@/lib/services/finance/sales.service";

const DEFAULT_STATE: SalesPerformanceState = {
  activeLocations: [],
  isCategoryFilterOpen: false,
  selectedCategories: [],
  selectedMetric: "revenue",
  comparisonMode: false,
  chartType: "line",
  granularity: "month",
  includeVat: false,
  isRefreshing: false,
  lastRefreshTime: null,
  autoRefreshEnabled: true,
  periodPreset: "this-month",
  dateRange: (() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  })(),
  comparisonPeriodPreset: "last-month",
  comparisonDateRange: null,
};

/**
 * Aggregate raw sales data into summary metrics
 */
function aggregateSalesData(
  rawData: SalesDataRecord[],
  includeVat: boolean
): AggregatedSalesData | null {
  if (!rawData || rawData.length === 0) {
    return null;
  }

  const revenue = rawData.reduce(
    (sum, record) =>
      sum + (includeVat ? record.total_revenue_incl_vat : record.total_revenue_excl_vat),
    0
  );
  const quantity = rawData.reduce((sum, record) => sum + record.total_quantity, 0);
  const avgPrice =
    rawData.reduce((sum, record) => sum + record.avg_price, 0) / rawData.length;
  const productCount = rawData.reduce((sum, record) => sum + record.product_count, 0);
  const topCategory = rawData.reduce(
    (acc, record) => {
      if (!acc || record.total_revenue_incl_vat > acc.revenue) {
        return { category: record.top_category, revenue: record.total_revenue_incl_vat };
      }
      return acc;
    },
    null as { category: string | null; revenue: number } | null
  )?.category || null;
  const vatAmount = rawData.reduce((sum, record) => sum + record.total_vat_amount, 0);
  const vat9Base = rawData.reduce((sum, record) => sum + record.vat_9_base, 0);
  const vat9Amount = rawData.reduce((sum, record) => sum + record.vat_9_amount, 0);
  const vat21Base = rawData.reduce((sum, record) => sum + record.vat_21_base, 0);
  const vat21Amount = rawData.reduce((sum, record) => sum + record.vat_21_amount, 0);
  const totalCost = rawData.reduce((sum, record) => sum + record.total_cost, 0);
  const revenueExVat = rawData.reduce((sum, record) => sum + record.total_revenue_excl_vat, 0);
  const revenueIncVat = rawData.reduce((sum, record) => sum + record.total_revenue_incl_vat, 0);
  const profitMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

  return {
    revenue,
    quantity,
    avgPrice,
    productCount,
    topCategory,
    vatAmount,
    vat9Base,
    vat9Amount,
    vat21Base,
    vat21Amount,
    totalCost,
    vatBreakdown: {
      vat9Base,
      vat9Amount,
      vat21Base,
      vat21Amount,
      rate9: { vat: vat9Amount },
      rate21: { vat: vat21Amount },
    },
    costTotal: totalCost,
    profitMargin,
    revenueExVat,
    revenueIncVat,
  };
}

export function useSalesViewModel() {
  const [state, setState] = useState<SalesPerformanceState>(DEFAULT_STATE);
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["sales-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Default to "All Locations" on initial load
  useEffect(() => {
    if (locations.length > 0 && state.activeLocations.length === 0) {
      setState((prev) => ({ ...prev, activeLocations: ["all"] }));
    }
  }, [locations.length, state.activeLocations.length]);

  // Safety guard: reset to "all" if pseudo location is selected
  useEffect(() => {
    if (
      state.activeLocations.length === 1 &&
      state.activeLocations[0] === "93cd36b7-790c-4d29-9344-631188af32e4"
    ) {
      setState((prev) => ({ ...prev, activeLocations: ["all"] }));
    }
  }, [state.activeLocations]);

  // Smart default granularity based on date range
  useEffect(() => {
    if (!state.dateRange) return;

    const daysDiff = Math.ceil(
      (state.dateRange.end.getTime() - state.dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let newGranularity: Granularity = "month";
    if (daysDiff <= 7) {
      newGranularity = "day";
    } else if (daysDiff <= 60) {
      newGranularity = "week";
    } else if (daysDiff <= 365) {
      newGranularity = "month";
    } else if (daysDiff <= 1095) {
      newGranularity = "quarter";
    } else {
      newGranularity = "year";
    }

    if (newGranularity !== state.granularity) {
      setState((prev) => ({ ...prev, granularity: newGranularity }));
    }
  }, [state.dateRange, state.granularity]);

  // Compute location filter
  const locationFilter = useMemo(() => {
    return state.activeLocations.includes("all") || state.activeLocations.length === 0
      ? "all"
      : state.activeLocations;
  }, [state.activeLocations]);

  // Fetch sales data for primary period
  const {
    data: primaryRawData = [],
    isLoading: primaryLoading,
    error: primaryError,
  } = useQuery<SalesDataRecord[]>({
    queryKey: [
      "sales-data-primary",
      locationFilter,
      state.dateRange,
      state.includeVat,
    ],
    queryFn: () =>
      fetchAggregatedSalesData(locationFilter, state.dateRange, state.includeVat),
    enabled: !!state.dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Aggregate primary data
  const primaryData = useMemo(
    () => aggregateSalesData(primaryRawData, state.includeVat),
    [primaryRawData, state.includeVat]
  );

  // Fetch sales data for comparison period
  const {
    data: comparisonRawData = [],
    isLoading: comparisonLoading,
  } = useQuery<SalesDataRecord[]>({
    queryKey: [
      "sales-data-comparison",
      locationFilter,
      state.comparisonDateRange,
      state.includeVat,
    ],
    queryFn: () =>
      fetchAggregatedSalesData(
        locationFilter,
        state.comparisonDateRange,
        state.includeVat
      ),
    enabled: state.comparisonMode && !!state.comparisonDateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Aggregate comparison data
  const comparisonData = useMemo(
    () => aggregateSalesData(comparisonRawData, state.includeVat),
    [comparisonRawData, state.includeVat]
  );

  // Fetch category-specific data
  const { data: categoryData = [] } = useQuery<CategoryData[]>({
    queryKey: [
      "sales-by-category",
      locationFilter,
      state.dateRange,
      state.selectedCategories,
      state.granularity,
      state.includeVat,
    ],
    queryFn: () =>
      fetchSalesByCategory(
        locationFilter,
        state.dateRange,
        state.selectedCategories,
        state.granularity,
        state.includeVat
      ),
    enabled:
      !!state.dateRange &&
      state.selectedCategories.length > 0 &&
      state.granularity !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check data source status
  const { data: dataSourceStatus } = useQuery<DataSourceStatus>({
    queryKey: ["sales-data-source-status"],
    queryFn: fetchDataSourceStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-refresh mechanism (every 5 minutes)
  useEffect(() => {
    if (!state.autoRefreshEnabled) return;

    const interval = setInterval(async () => {
      try {
        console.log("[Sales] Auto-refresh triggered");
        const result = await refreshSalesData();

        if (result.success && result.summary && result.summary.totalAggregatedDates > 0) {
          console.log("[Sales] Auto-refresh found new data:", result.summary);
          setState((prev) => ({ ...prev, lastRefreshTime: new Date() }));

          if (result.summary.totalAggregatedDates > 0) {
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ["sales-data-primary"] });
            queryClient.invalidateQueries({ queryKey: ["sales-data-comparison"] });
            queryClient.invalidateQueries({ queryKey: ["sales-by-category"] });
          }
        } else {
          console.log("[Sales] Auto-refresh: No new data found");
        }
      } catch (error) {
        console.error("[Sales] Auto-refresh error:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [state.autoRefreshEnabled, queryClient]);

  // Manual refresh function
  const handleRefreshSalesData = useCallback(async () => {
    setState((prev) => ({ ...prev, isRefreshing: true }));
    try {
      console.log("[Sales] Manual refresh triggered");
      const result = await refreshSalesData();

      if (result.success) {
        setState((prev) => ({ ...prev, lastRefreshTime: new Date() }));
        console.log("[Sales] Manual refresh successful:", result.summary);

        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ["sales-data-primary"] });
        queryClient.invalidateQueries({ queryKey: ["sales-data-comparison"] });
        queryClient.invalidateQueries({ queryKey: ["sales-by-category"] });
        queryClient.invalidateQueries({ queryKey: ["sales-data-source-status"] });
      } else {
        console.error("[Sales] Manual refresh failed:", result.error);
        alert(`Refresh failed: ${result.error}`);
      }
    } catch (error) {
      console.error("[Sales] Manual refresh error:", error);
      alert(
        `Refresh error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setState((prev) => ({ ...prev, isRefreshing: false }));
    }
  }, [queryClient]);

  // Utility functions
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatNumber = useCallback((value: number): string => {
    return new Intl.NumberFormat("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const calculatePercentChange = useCallback((current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, []);

  const getComparisonLabel = useCallback((): string => {
    if (!state.comparisonDateRange) return "previous period";
    const start = state.comparisonDateRange.start.toLocaleDateString("nl-NL", {
      month: "short",
      year: "numeric",
    });
    return start;
  }, [state.comparisonDateRange]);

  // Actions
  const setActiveLocations = useCallback((activeLocations: string[]) => {
    setState((prev) => ({ ...prev, activeLocations }));
  }, []);

  const setIsCategoryFilterOpen = useCallback((isCategoryFilterOpen: boolean) => {
    setState((prev) => ({ ...prev, isCategoryFilterOpen }));
  }, []);

  const setSelectedCategories = useCallback((selectedCategories: CategorySelection[]) => {
    setState((prev) => ({ ...prev, selectedCategories }));
  }, []);

  const setSelectedMetric = useCallback((selectedMetric: SalesMetricType) => {
    setState((prev) => ({
      ...prev,
      selectedMetric,
      selectedCategories: [], // Clear category selections when selecting a primary metric
    }));
  }, []);

  const setComparisonMode = useCallback((comparisonMode: boolean) => {
    setState((prev) => ({ ...prev, comparisonMode }));
  }, []);

  const setChartType = useCallback((chartType: ChartType) => {
    setState((prev) => ({ ...prev, chartType }));
  }, []);

  const setGranularity = useCallback((granularity: Granularity) => {
    setState((prev) => ({ ...prev, granularity }));
  }, []);

  const setIncludeVat = useCallback((includeVat: boolean) => {
    setState((prev) => ({ ...prev, includeVat }));
  }, []);

  const setAutoRefreshEnabled = useCallback((autoRefreshEnabled: boolean) => {
    setState((prev) => ({ ...prev, autoRefreshEnabled }));
  }, []);

  const handlePeriodChange = useCallback((preset: string, range: DateRange) => {
    setState((prev) => ({
      ...prev,
      periodPreset: preset,
      dateRange: range,
    }));
  }, []);

  const handleComparisonPeriodChange = useCallback((preset: string, range: DateRange) => {
    setState((prev) => ({
      ...prev,
      comparisonPeriodPreset: preset,
      comparisonDateRange: range,
    }));
  }, []);

  return {
    // State
    activeLocations: state.activeLocations,
    isCategoryFilterOpen: state.isCategoryFilterOpen,
    selectedCategories: state.selectedCategories,
    selectedMetric: state.selectedMetric,
    comparisonMode: state.comparisonMode,
    chartType: state.chartType,
    granularity: state.granularity,
    includeVat: state.includeVat,
    isRefreshing: state.isRefreshing,
    lastRefreshTime: state.lastRefreshTime,
    autoRefreshEnabled: state.autoRefreshEnabled,
    periodPreset: state.periodPreset,
    dateRange: state.dateRange,
    comparisonPeriodPreset: state.comparisonPeriodPreset,
    comparisonDateRange: state.comparisonDateRange,

    // Data
    locations,
    primaryData,
    comparisonData,
    categoryData,
    dataSourceStatus,

    // Loading states
    locationsLoading,
    primaryLoading,
    comparisonLoading,
    isLoading: primaryLoading || comparisonLoading,

    // Errors
    primaryError,

    // Actions
    setActiveLocations,
    setIsCategoryFilterOpen,
    setSelectedCategories,
    setSelectedMetric,
    setComparisonMode,
    setChartType,
    setGranularity,
    setIncludeVat,
    setAutoRefreshEnabled,
    handlePeriodChange,
    handleComparisonPeriodChange,
    handleRefreshSalesData,

    // Utilities
    formatCurrency,
    formatNumber,
    calculatePercentChange,
    getComparisonLabel,
  };
}



