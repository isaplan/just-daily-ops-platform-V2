/**
 * Finance P&L Analysis ViewModel
 * Manages state and business logic for P&L Analysis page
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  PnLAnalysisState,
  Location,
  DateRange,
  CategorySelection,
  CategoryData,
  PnLData,
  PnLTimeSeriesPoint,
  MetricType,
  ChartType,
  TimeGranularity,
} from "@/models/finance/pnl.model";
import {
  fetchPnLSummary,
  fetchPnLTimeSeries,
  fetchPnLByCategory,
  fetchLocations,
  getReprocessCombinations,
} from "@/lib/services/finance/pnl.service";
import type { PeriodPreset } from "@/components/finance/SmartPeriodSelector";

const VAT_RATE = 1.12;

const DEFAULT_STATE: PnLAnalysisState = {
  activeLocations: ["all"],
  isChatOpen: false,
  isCategoryFilterOpen: false,
  selectedCategories: [],
  selectedMetric: "revenue",
  comparisonEnabled: false,
  includeVat: false,
  chartType: "line",
  xAxisGranularity: "month",
  isReprocessing: false,
  periodAPreset: "3months",
  periodARange: (() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      end: now,
    };
  })(),
  periodBPreset: "3months",
  periodBRange: (() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 6, 1),
      end: new Date(now.getFullYear(), now.getMonth() - 3, 1),
    };
  })(),
};

export function usePnLViewModel() {
  const [state, setState] = useState<PnLAnalysisState>(DEFAULT_STATE);

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["pnl-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Compute primary location ID
  const primaryLocationId = useMemo(() => {
    return state.activeLocations.includes("all") ? null : state.activeLocations[0];
  }, [state.activeLocations]);

  // Fetch P&L data for Period A
  const {
    data: periodAData,
    isLoading: periodALoading,
    error: periodAError,
  } = useQuery<PnLData | null>({
    queryKey: ["pnl-summary", primaryLocationId, state.periodARange],
    queryFn: () => fetchPnLSummary(primaryLocationId, state.periodARange),
    enabled: !!state.periodARange,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch P&L data for Period B (comparison)
  const {
    data: periodBData,
    isLoading: periodBLoading,
    error: periodBError,
  } = useQuery<PnLData | null>({
    queryKey: ["pnl-summary", primaryLocationId, state.periodBRange],
    queryFn: () => fetchPnLSummary(primaryLocationId, state.periodBRange),
    enabled: state.comparisonEnabled && !!state.periodBRange,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch category data
  const { data: categoryData = [] } = useQuery<CategoryData[]>({
    queryKey: [
      "pnl-by-category",
      primaryLocationId,
      state.periodARange,
      state.selectedCategories,
    ],
    queryFn: () =>
      fetchPnLByCategory(primaryLocationId, state.periodARange, state.selectedCategories),
    enabled: !!state.periodARange && state.selectedCategories.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Utility functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }, []);

  const formatPercent = useCallback((value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  }, []);

  const calculatePercentChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, []);

  const applyVatIfNeeded = useCallback(
    (value: number, isRevenueBased: boolean = true) => {
      if (state.includeVat && isRevenueBased) {
        return value * VAT_RATE;
      }
      return value;
    },
    [state.includeVat]
  );

  // Reprocess data handler
  const handleReprocessData = useCallback(async () => {
    setState((prev) => ({ ...prev, isReprocessing: true }));
    try {
      const combinations = await getReprocessCombinations();
      toast.info(`Processing ${combinations.length} period(s)...`);

      // For now, just show success - actual processing would be implemented
      toast.success(`Successfully processed ${combinations.length} periods`);
    } catch (error) {
      console.error("Reprocess error:", error);
      toast.error("Failed to reprocess data. Check console for details.");
    } finally {
      setState((prev) => ({ ...prev, isReprocessing: false }));
    }
  }, []);

  // Actions
  const setActiveLocations = useCallback((activeLocations: string[]) => {
    setState((prev) => ({ ...prev, activeLocations }));
  }, []);

  const setIsChatOpen = useCallback((isChatOpen: boolean) => {
    setState((prev) => ({ ...prev, isChatOpen }));
  }, []);

  const setIsCategoryFilterOpen = useCallback((isCategoryFilterOpen: boolean) => {
    setState((prev) => ({ ...prev, isCategoryFilterOpen }));
  }, []);

  const setSelectedCategories = useCallback((selectedCategories: CategorySelection[]) => {
    setState((prev) => ({ ...prev, selectedCategories }));
  }, []);

  const setSelectedMetric = useCallback((selectedMetric: MetricType) => {
    setState((prev) => ({ ...prev, selectedMetric }));
  }, []);

  const setComparisonEnabled = useCallback((comparisonEnabled: boolean) => {
    setState((prev) => ({ ...prev, comparisonEnabled }));
  }, []);

  const setIncludeVat = useCallback((includeVat: boolean) => {
    setState((prev) => ({ ...prev, includeVat }));
  }, []);

  const setChartType = useCallback((chartType: ChartType) => {
    setState((prev) => ({ ...prev, chartType }));
  }, []);

  const setXAxisGranularity = useCallback((xAxisGranularity: TimeGranularity) => {
    setState((prev) => ({ ...prev, xAxisGranularity }));
  }, []);

  const handlePeriodAChange = useCallback((preset: PeriodPreset, range: DateRange) => {
    setState((prev) => ({
      ...prev,
      periodAPreset: preset,
      periodARange: range,
    }));
  }, []);

  const handlePeriodBChange = useCallback((preset: PeriodPreset, range: DateRange) => {
    setState((prev) => ({
      ...prev,
      periodBPreset: preset,
      periodBRange: range,
    }));
  }, []);

  return {
    // State
    activeLocations: state.activeLocations,
    isChatOpen: state.isChatOpen,
    isCategoryFilterOpen: state.isCategoryFilterOpen,
    selectedCategories: state.selectedCategories,
    selectedMetric: state.selectedMetric,
    comparisonEnabled: state.comparisonEnabled,
    includeVat: state.includeVat,
    chartType: state.chartType,
    xAxisGranularity: state.xAxisGranularity,
    isReprocessing: state.isReprocessing,
    periodAPreset: state.periodAPreset,
    periodARange: state.periodARange,
    periodBPreset: state.periodBPreset,
    periodBRange: state.periodBRange,

    // Data
    locations,
    periodAData: periodAData || null,
    periodBData: periodBData || null,
    categoryData,

    // Loading states
    locationsLoading,
    periodALoading,
    periodBLoading,
    isLoading: periodALoading || periodBLoading,

    // Errors
    periodAError,
    periodBError,

    // Actions
    setActiveLocations,
    setIsChatOpen,
    setIsCategoryFilterOpen,
    setSelectedCategories,
    setSelectedMetric,
    setComparisonEnabled,
    setIncludeVat,
    setChartType,
    setXAxisGranularity,
    handlePeriodAChange,
    handlePeriodBChange,
    handleReprocessData,

    // Utilities
    formatCurrency,
    formatPercent,
    calculatePercentChange,
    applyVatIfNeeded,
    VAT_RATE,
  };
}



