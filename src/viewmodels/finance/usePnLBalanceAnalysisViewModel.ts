/**
 * PNL Balance Analysis ViewModel Layer
 * Business logic for PNL Balance Analysis page
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLocations,
  fetchComparisonData,
  fetchHierarchyData,
} from "@/lib/services/finance/pnl-balance-analysis.service";
import {
  Location,
  ComparisonData,
  HierarchyData,
  AnalysisQueryParams,
} from "@/models/finance/pnl-balance-analysis.model";

const VAN_KINSBERGEN_ID = "550e8400-e29b-41d4-a716-446655440001";

export function usePnLBalanceAnalysisViewModel() {
  const [selectedLocation, setSelectedLocation] = useState<string>(VAN_KINSBERGEN_ID);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [expandedHierarchy, setExpandedHierarchy] = useState<Set<string>>(new Set());

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["pnl-analysis-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000,
  });

  // Query params
  const queryParams = useMemo<AnalysisQueryParams>(
    () => ({
      location: selectedLocation,
      year: selectedYear,
      month: selectedMonth,
    }),
    [selectedLocation, selectedYear, selectedMonth]
  );

  // Fetch comparison data
  const {
    data: comparisonData,
    isLoading: comparisonLoading,
    refetch: refetchComparison,
  } = useQuery<ComparisonData>({
    queryKey: ["pnl-comparison", queryParams],
    queryFn: () => fetchComparisonData(queryParams),
    enabled: !!selectedLocation,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch hierarchy data
  const {
    data: hierarchyData,
    isLoading: hierarchyLoading,
    refetch: refetchHierarchy,
  } = useQuery<HierarchyData>({
    queryKey: ["pnl-hierarchy", queryParams],
    queryFn: () => fetchHierarchyData(queryParams),
    enabled: !!selectedLocation,
    staleTime: 2 * 60 * 1000,
  });

  // Utility functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatNumber = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const toggleHierarchy = useCallback((key: string) => {
    setExpandedHierarchy((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  }, []);

  // Available years and months
  const availableYears = [2024, 2025, 2026];
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  return {
    selectedLocation,
    setSelectedLocation,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    expandedHierarchy,
    toggleHierarchy,
    locations,
    comparisonData,
    comparisonLoading,
    refetchComparison,
    hierarchyData,
    hierarchyLoading,
    refetchHierarchy,
    formatCurrency,
    formatNumber,
    availableYears,
    availableMonths,
  };
}



