/**
 * Finance Dashboard ViewModel
 * Manages state and business logic for Finance Dashboard
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  FinanceDashboardState,
  PeriodType,
  RevenueData,
  SalesIntelligenceData,
  Location,
} from "@/models/finance/dashboard.model";
import {
  fetchRevenueData,
  fetchSalesIntelligence,
  fetchLocations,
} from "@/lib/services/finance/dashboard.service";
import { formatPeriodLabel } from "@/lib/dateUtils";

const DEFAULT_STATE: FinanceDashboardState = {
  period: "week",
  currentDate: new Date(),
  comparisonCount: 3,
  selectedLocation: null,
};

export function useFinanceDashboardViewModel() {
  const [state, setState] = useState<FinanceDashboardState>(DEFAULT_STATE);

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["finance-dashboard-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
  });

  // Fetch revenue data
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
  } = useQuery<RevenueData>({
    queryKey: [
      "finance-dashboard-revenue",
      state.period,
      state.currentDate,
      state.selectedLocation,
    ],
    queryFn: () =>
      fetchRevenueData(state.period, state.currentDate, state.selectedLocation),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!state.currentDate,
  });

  // Fetch sales intelligence
  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
  } = useQuery<SalesIntelligenceData>({
    queryKey: [
      "finance-dashboard-sales-intelligence",
      state.period,
      state.currentDate,
      state.selectedLocation,
    ],
    queryFn: () =>
      fetchSalesIntelligence(state.period, state.currentDate, state.selectedLocation),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!state.currentDate,
  });

  // Memoized computed values
  const periodLabel = useMemo(
    () => formatPeriodLabel(state.period, state.currentDate),
    [state.period, state.currentDate]
  );

  // Actions
  const setPeriod = useCallback((period: PeriodType) => {
    setState((prev) => ({ ...prev, period }));
  }, []);

  const setCurrentDate = useCallback((currentDate: Date) => {
    setState((prev) => ({ ...prev, currentDate }));
  }, []);

  const setComparisonCount = useCallback((comparisonCount: number) => {
    setState((prev) => ({ ...prev, comparisonCount }));
  }, []);

  const setSelectedLocation = useCallback((selectedLocation: string | null) => {
    setState((prev) => ({ ...prev, selectedLocation }));
  }, []);

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

  return {
    // State
    period: state.period,
    currentDate: state.currentDate,
    comparisonCount: state.comparisonCount,
    selectedLocation: state.selectedLocation,
    
    // Data
    locations: locations || [],
    revenueData: revenueData || null,
    salesData: salesData || null,
    
    // Loading states
    locationsLoading,
    revenueLoading,
    salesLoading,
    isLoading: locationsLoading || revenueLoading || salesLoading,
    
    // Errors
    revenueError,
    salesError,
    
    // Computed
    periodLabel,
    
    // Actions
    setPeriod,
    setCurrentDate,
    setComparisonCount,
    setSelectedLocation,
    
    // Utilities
    formatCurrency,
    formatPercent,
  };
}



