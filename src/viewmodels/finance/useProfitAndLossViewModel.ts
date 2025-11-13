/**
 * Profit & Loss ViewModel Layer
 * Business logic for P&L Analysis page
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PeriodPreset, getDateRangeForPreset } from "@/components/finance/SmartPeriodSelector";
import {
  fetchLocations,
  fetchPnLSummary,
  fetchPnLByCategory,
  reprocessPnLData,
} from "@/lib/services/finance/profit-and-loss.service";
import {
  Location,
  DateRange,
  PnLData,
  CategoryData,
  CategorySelection,
  MetricType,
  TimeGranularity,
} from "@/models/finance/profit-and-loss.model";
import { toast } from "sonner";

const VAT_RATE = 1.12;

export function useProfitAndLossViewModel() {
  // State
  const [activeLocations, setActiveLocations] = useState<string[]>(["all"]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("revenue");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [includeVat, setIncludeVat] = useState(false);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [xAxisGranularity, setXAxisGranularity] = useState<TimeGranularity>("month");
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [periodAPreset, setPeriodAPreset] = useState<PeriodPreset>("3months");
  const [periodARange, setPeriodARange] = useState<DateRange | null>(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      end: now,
    };
  });
  const [periodBPreset, setPeriodBPreset] = useState<PeriodPreset>("3months");
  const [periodBRange, setPeriodBRange] = useState<DateRange | null>(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 6, 1),
      end: new Date(now.getFullYear(), now.getMonth() - 3, 1),
    };
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["pnl-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000,
  });

  // Compute primary location ID
  const primaryLocationId = useMemo(() => {
    return activeLocations.includes("all") ? null : activeLocations[0];
  }, [activeLocations]);

  // Fetch P&L data for Period A
  const {
    data: periodAData,
    isLoading: periodALoading,
    error: periodAError,
  } = useQuery<PnLData | null>({
    queryKey: ["pnl-summary", primaryLocationId, periodARange],
    queryFn: () => fetchPnLSummary(primaryLocationId, periodARange),
    enabled: !!periodARange,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch P&L data for Period B (comparison)
  const {
    data: periodBData,
    isLoading: periodBLoading,
    error: periodBError,
  } = useQuery<PnLData | null>({
    queryKey: ["pnl-summary", primaryLocationId, periodBRange],
    queryFn: () => fetchPnLSummary(primaryLocationId, periodBRange),
    enabled: comparisonEnabled && !!periodBRange,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch category data
  const { data: categoryData = [] } = useQuery<CategoryData[]>({
    queryKey: ["pnl-by-category", primaryLocationId, periodARange, selectedCategories],
    queryFn: () => fetchPnLByCategory(primaryLocationId, periodARange, selectedCategories),
    enabled: !!periodARange && selectedCategories.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Utility functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
  }, []);

  const formatPercent = useCallback((value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  }, []);

  const calculatePercentChange = useCallback((current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, []);

  const applyVatIfNeeded = useCallback((value: number, isRevenueBased: boolean = true) => {
    if (includeVat && isRevenueBased) {
      return value * VAT_RATE;
    }
    return value;
  }, [includeVat]);

  // Handlers
  const handlePeriodAChange = useCallback((preset: PeriodPreset) => {
    setPeriodAPreset(preset);
    const range = getDateRangeForPreset(preset);
    setPeriodARange(range);
  }, []);

  const handlePeriodBChange = useCallback((preset: PeriodPreset) => {
    setPeriodBPreset(preset);
    const range = getDateRangeForPreset(preset);
    setPeriodBRange(range);
  }, []);

  const handleReprocessData = useCallback(async () => {
    setIsReprocessing(true);
    try {
      const result = await reprocessPnLData();
      toast.info(`Processing ${result.periodsProcessed} period(s)...`);
      toast.success(`Successfully processed ${result.periodsProcessed} periods`);
    } catch (error) {
      console.error("Reprocess error:", error);
      toast.error("Failed to reprocess data. Check console for details.");
    } finally {
      setIsReprocessing(false);
    }
  }, []);

  // Metric cards configuration
  const metricCards = useMemo(
    () => [
      { metric: "revenue" as MetricType, title: "Total Revenue" },
      { metric: "gross_profit" as MetricType, title: "Gross Profit" },
      { metric: "ebitda" as MetricType, title: "EBITDA" },
      { metric: "labor_cost" as MetricType, title: "Labor Cost" },
      { metric: "other_costs" as MetricType, title: "Other Costs" },
    ],
    []
  );

  return {
    // State
    activeLocations,
    setActiveLocations,
    isChatOpen,
    setIsChatOpen,
    isCategoryFilterOpen,
    setIsCategoryFilterOpen,
    selectedCategories,
    setSelectedCategories,
    selectedMetric,
    setSelectedMetric,
    comparisonEnabled,
    setComparisonEnabled,
    includeVat,
    setIncludeVat,
    chartType,
    setChartType,
    xAxisGranularity,
    setXAxisGranularity,
    isReprocessing,
    periodAPreset,
    periodARange,
    periodBPreset,
    periodBRange,
    // Data
    locations,
    periodAData,
    periodALoading,
    periodAError,
    periodBData,
    periodBLoading,
    periodBError,
    categoryData,
    primaryLocationId,
    // Utilities
    formatCurrency,
    formatPercent,
    calculatePercentChange,
    applyVatIfNeeded,
    // Handlers
    handlePeriodAChange,
    handlePeriodBChange,
    handleReprocessData,
    metricCards,
  };
}



