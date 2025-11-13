/**
 * Finance Daily Ops Insights ViewModel Layer
 * Business logic and state management for cross-correlation insights
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { fetchPeriodAnalysis } from "@/lib/services/finance/daily-ops-insights.service";
import type {
  Location,
  TimePeriodPreset,
  ComparisonAnalysis,
  LocationKey,
  TimePeriodKey,
} from "@/models/finance/daily-ops-insights.model";

// Location mapping
const LOCATIONS: Record<LocationKey, Location> = {
  total: { id: "total", name: "All Locations", color: "bg-blue-500" },
  kinsbergen: { id: "1125", name: "Van Kinsbergen", color: "bg-green-500" },
  barbea: { id: "1711", name: "Bar Bea", color: "bg-purple-500" },
  lamour: { id: "2499", name: "L'Amour Toujours", color: "bg-orange-500" },
};

// Time period presets
const TIME_PERIODS: Record<TimePeriodKey, TimePeriodPreset> = {
  lastMonth: {
    label: "Last Month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: format(lastMonth, "MMMM yyyy"),
      };
    },
  },
  last3Months: {
    label: "Last 3 Months",
    getRange: () => {
      const end = subDays(new Date(), 1);
      const start = subMonths(end, 3);
      return {
        from: start,
        to: end,
        label: `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`,
      };
    },
  },
  last6Months: {
    label: "Last 6 Months",
    getRange: () => {
      const end = subDays(new Date(), 1);
      const start = subMonths(end, 6);
      return {
        from: start,
        to: end,
        label: `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`,
      };
    },
  },
  thisYear: {
    label: "This Year",
    getRange: () => {
      const now = new Date();
      return {
        from: startOfYear(now),
        to: now,
        label: format(now, "yyyy"),
      };
    },
  },
  lastYear: {
    label: "Last Year",
    getRange: () => {
      const lastYear = subYears(new Date(), 1);
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
        label: format(lastYear, "yyyy"),
      };
    },
  },
  september2024: {
    label: "September 2024",
    getRange: () => {
      const september = new Date(2024, 8, 1);
      return {
        from: startOfMonth(september),
        to: endOfMonth(september),
        label: "September 2024",
      };
    },
  },
};

export function useDailyOpsInsightsViewModel() {
  // UI State
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>("total");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodKey>("september2024");
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  // Get current period range
  const currentPeriodRange = useMemo(
    () => TIME_PERIODS[selectedPeriod].getRange(),
    [selectedPeriod]
  );

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      locationId:
        selectedLocation === "total"
          ? undefined
          : LOCATIONS[selectedLocation].id,
      startDate: currentPeriodRange.from.toISOString().split("T")[0],
      endDate: currentPeriodRange.to.toISOString().split("T")[0],
      compareWithPrevious,
    }),
    [selectedLocation, currentPeriodRange, compareWithPrevious]
  );

  // Fetch period analysis
  const { data: analysis, isLoading } = useQuery<ComparisonAnalysis>({
    queryKey: ["period-cross-analysis", queryParams],
    queryFn: () => fetchPeriodAnalysis(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    // State
    selectedLocation,
    setSelectedLocation,
    selectedPeriod,
    setSelectedPeriod,
    compareWithPrevious,
    setCompareWithPrevious,

    // Data
    analysis,
    isLoading,

    // Constants
    LOCATIONS,
    TIME_PERIODS,
  };
}



