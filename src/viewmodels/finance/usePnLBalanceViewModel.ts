/**
 * P&L Balance ViewModel Layer
 * Manages state and business logic for P&L Balance page
 * Updated to support multi-select filters, seasons, and comparison mode
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import { fetchPnLAggregatedData } from "@/lib/services/finance/pnl-balance.service";
import {
  mapAggregatedToDisplay,
  validateBalance,
  formatCurrency,
} from "@/lib/finance/pnl-balance-utils";
import type {
  ProcessedPnLData,
  ValidationResult,
  MonthOption,
  LocationOption,
  PnLBalanceQueryParams,
} from "@/models/finance/pnl-balance.model";

// Season definitions
const SEASONS = {
  lente: { name: 'Lente', months: [3, 4, 5] }, // Mar, Apr, May
  zomer: { name: 'Zomer', months: [6, 7, 8] }, // Jun, Jul, Aug
  herfst: { name: 'Herfst', months: [9, 10, 11] }, // Sep, Oct, Nov
  winter: { name: 'Winter', months: [12, 1, 2] }, // Dec, Jan, Feb
};

export function usePnLBalanceViewModel() {
  const { t, ready } = useTranslation("common");
  const [isMounted, setIsMounted] = useState(false);

  // Track client-side mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only use translations after component is mounted on client
  const canUseTranslations = isMounted && ready;

  // State - Single selection in normal mode, multi-select in comparison mode
  // Default: 2025, all months, all locations
  const [selectedYears, setSelectedYears] = useState<number[]>([2025]); // Default: 2025
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Empty = "All" months
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['all']); // Default: all locations
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Available years
  const AVAILABLE_YEARS = [2024, 2025];

  // Define months with Dutch abbreviations
  const MONTHS = useMemo<MonthOption[]>(
    () => [
      { value: 1, label: "Jan" },
      { value: 2, label: "Feb" },
      { value: 3, label: "Mrt" },
      { value: 4, label: "Apr" },
      { value: 5, label: "Mei" },
      { value: 6, label: "Jun" },
      { value: 7, label: "Jul" },
      { value: 8, label: "Aug" },
      { value: 9, label: "Sep" },
      { value: 10, label: "Okt" },
      { value: 11, label: "Nov" },
      { value: 12, label: "Dec" },
    ],
    []
  );

  const LOCATIONS = useMemo<LocationOption[]>(
    () => [
      {
        value: "all",
        label: "Alle Locaties",
      },
      {
        value: "550e8400-e29b-41d4-a716-446655440001",
        label: "Van Kinsbergen",
      },
      {
        value: "550e8400-e29b-41d4-a716-446655440002",
        label: "Bar Bea",
      },
      {
        value: "550e8400-e29b-41d4-a716-446655440003",
        label: "L'Amour Toujours",
      },
    ],
    []
  );

  // Get months from selected seasons
  const monthsFromSeasons = useMemo<number[]>(() => {
    if (selectedSeasons.length === 0) return [];
    const months = new Set<number>();
    selectedSeasons.forEach(season => {
      const seasonData = SEASONS[season as keyof typeof SEASONS];
      if (seasonData) {
        seasonData.months.forEach(m => months.add(m));
      }
    });
    return Array.from(months);
  }, [selectedSeasons]);

  // Combine selected months and season months
  const effectiveMonths = useMemo<number[]>(() => {
    const allMonths = new Set<number>();
    selectedMonths.forEach(m => allMonths.add(m));
    monthsFromSeasons.forEach(m => allMonths.add(m));
    return Array.from(allMonths);
  }, [selectedMonths, monthsFromSeasons]);

  // Toggle year selection
  const toggleYear = useCallback((year: number | 'all') => {
    if (year === 'all') {
      // Toggle "All" - clears all selections
      setSelectedYears(prev => prev.length === 0 ? [] : []);
    } else {
      setSelectedYears(prev => {
        if (isComparisonMode) {
          // Comparison mode: multi-select
          if (prev.includes(year)) {
            return prev.filter(y => y !== year);
          }
          return [...prev, year];
        } else {
          // Normal mode: single selection
          if (prev.includes(year)) {
            return []; // Deselect if already selected
          }
          return [year]; // Select only this year
        }
      });
    }
  }, [isComparisonMode]);

  // Toggle month selection
  const toggleMonth = useCallback((month: number) => {
    setSelectedMonths(prev => {
      if (isComparisonMode) {
        // Comparison mode: multi-select (max 6)
        if (prev.includes(month)) {
          return prev.filter(m => m !== month);
        }
        if (prev.length >= 6) {
          return prev; // Max 6 months
        }
        return [...prev, month];
      } else {
        // Normal mode: single selection
        if (prev.includes(month)) {
          return []; // Deselect if already selected (shows all months)
        }
        return [month]; // Select only this month
      }
    });
    // Clear seasons when manually selecting months
    setSelectedSeasons([]);
  }, [isComparisonMode]);

  // Toggle season selection
  const toggleSeason = useCallback((season: string) => {
    setSelectedSeasons(prev => {
      if (isComparisonMode) {
        // Comparison mode: multi-select
        if (prev.includes(season)) {
          return prev.filter(s => s !== season);
        }
        return [...prev, season];
      } else {
        // Normal mode: single selection
        if (prev.includes(season)) {
          return []; // Deselect if already selected
        }
        return [season]; // Select only this season
      }
    });
    // Clear manual month selection when selecting seasons
    setSelectedMonths([]);
  }, [isComparisonMode]);

  // Toggle location selection
  const toggleLocation = useCallback((location: string) => {
    setSelectedLocations(prev => {
      if (isComparisonMode) {
        // Comparison mode: multi-select (max 2, no "all")
        if (location === 'all') {
          return prev; // Don't allow "all" in comparison mode
        }
        if (prev.includes(location)) {
          return prev.filter(l => l !== location);
        }
        // Limit to 2 locations (excluding "all")
        const nonAllLocations = prev.filter(l => l !== 'all');
        if (nonAllLocations.length >= 2) {
          return prev; // Max 2 locations
        }
        return [...prev.filter(l => l !== 'all'), location]; // Remove "all" if present
      } else {
        // Normal mode: single selection
        if (prev.includes(location)) {
          return ['all']; // Deselect if already selected, default to "all"
        }
        return [location]; // Select only this location
      }
    });
  }, [isComparisonMode]);

  // Set "All" months (only used in comparison mode, removed in normal mode)
  const setAllMonths = useCallback(() => {
    if (isComparisonMode) {
      setSelectedMonths([]);
      setSelectedSeasons([]);
    }
  }, [isComparisonMode]);

  // Fetch data for each year/month/location combination
  // When "All" is selected (no months/seasons), we'll fetch without month filter
  // When "All" years is selected (empty array), fetch for all available years
  const queryParamsList = useMemo(() => {
    const params: PnLBalanceQueryParams[] = [];
    
    // If no years selected, use all available years
    const yearsToFetch = selectedYears.length > 0 ? selectedYears : AVAILABLE_YEARS;
    
    yearsToFetch.forEach(year => {
      // If no months/seasons selected, fetch all data for the year (no month filter)
      if (effectiveMonths.length === 0) {
        selectedLocations.forEach(location => {
          params.push({ year, location }); // No month = fetch all months
        });
      } else {
        // Fetch specific months
        effectiveMonths.forEach(month => {
          selectedLocations.forEach(location => {
            params.push({ year, month, location });
          });
        });
      }
    });
    
    return params;
  }, [selectedYears, effectiveMonths, selectedLocations, AVAILABLE_YEARS]);

  // Fetch aggregated P&L data for all combinations
  const queries = useQueries({
    queries: queryParamsList.length > 0 ? queryParamsList.map(params => ({
      queryKey: ["pnl-balance", params],
      queryFn: () => fetchPnLAggregatedData(params),
      staleTime: 5 * 60 * 1000,
      enabled: true,
    })) : [],
  });

  // Process data for display
  const processedDataByCombination = useMemo(() => {
    const result: Record<string, ProcessedPnLData[]> = {};

    queries.forEach((query, index) => {
      const params = queryParamsList[index];
      if (!params) return;

      const data = query.data;
      if (!data?.success || !data.data || data.data.length === 0) {
        return;
      }

      // If month is not specified, data contains all months - process each month separately
      if (params.month === undefined) {
        // Group data by month
        const dataByMonth = new Map<number, typeof data.data>();
        data.data.forEach((record: any) => {
          const month = record.month;
          if (!dataByMonth.has(month)) {
            dataByMonth.set(month, []);
          }
          dataByMonth.get(month)!.push(record);
        });

        // Process each month
        dataByMonth.forEach((monthData, month) => {
          const key = `${params.year}-${month}-${params.location}`;
          const processed = mapAggregatedToDisplay(monthData, MONTHS);
          result[key] = processed.map((item, itemIndex) => ({
            ...item,
            isExpanded: expandedRows.has(itemIndex),
          }));
        });
      } else {
        // Month is specified - process single month
        const key = `${params.year}-${params.month}-${params.location}`;
        const processed = mapAggregatedToDisplay(data.data, MONTHS);
        result[key] = processed.map((item, itemIndex) => ({
          ...item,
          isExpanded: expandedRows.has(itemIndex),
        }));
      }
    });

    return result;
  }, [queries, queryParamsList, MONTHS, expandedRows]);

  // Available months from data
  const availableMonths = useMemo<number[]>(() => {
    const months = new Set<number>();
    queries.forEach(query => {
      const data = query.data;
      if (data?.success && data.data) {
        data.data.forEach((item: any) => months.add(item.month));
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [queries]);

  // Validation results
  const validationResults = useMemo(() => {
    const results: Record<string, ValidationResult> = {};
    
    Object.entries(processedDataByCombination).forEach(([key, data]) => {
      if (data.length > 0) {
        results[key] = validateBalance(data);
      }
    });
    
    return results;
  }, [processedDataByCombination]);

  // Toggle row expansion
  const toggleExpansion = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Error message
  const error = useMemo<string | null>(() => {
    const errorQuery = queries.find(q => q.error);
    if (errorQuery?.error) {
      return errorQuery.error instanceof Error
        ? errorQuery.error.message
        : "Failed to load P&L data";
    }
    return null;
  }, [queries]);

  return {
    // State
    selectedYears,
    selectedMonths,
    selectedSeasons,
    selectedLocations,
    isComparisonMode,
    setSelectedYears,
    setSelectedMonths,
    setSelectedSeasons,
    setSelectedLocations,
    setIsComparisonMode,
    toggleYear,
    toggleMonth,
    toggleSeason,
    toggleLocation,
    setAllMonths,

    // Data
    processedDataByCombination,
    availableMonths,
    validationResults,
    isLoading: queries.some(q => q.isLoading),
    error,
    queries, // Export queries for raw data access
    queryParamsList, // Export query params for matching

    // Options
    AVAILABLE_YEARS,
    MONTHS,
    LOCATIONS,
    SEASONS,

    // Actions
    toggleExpansion,
    expandedRows,

    // Utilities
    formatCurrency,

    // Translations
    canUseTranslations,
    t,
  };
}
