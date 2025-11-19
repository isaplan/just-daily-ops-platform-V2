/**
 * Keuken Analyses ViewModel
 * Business logic and state management for Daily Ops Keuken Analyses page
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { KeukenAnalysesData, WorkloadThresholds, TimeRangeFilter } from "@/models/daily-ops/keuken-analyses.model";
import { fetchKeukenAnalysesData } from "@/lib/services/daily-ops/keuken-analyses.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { startOfMonth, endOfMonth } from "date-fns";

const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  low: 2.5,
  mid: 5,
  high: 10,
};

export interface UseKeukenAnalysesViewModelReturn {
  keukenAnalysesData: KeukenAnalysesData | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string | null;
  selectedDatePreset: string;
  selectedWorker: string | null;
  selectedTimeRange: TimeRangeFilter;
  workloadThresholds: WorkloadThresholds;
  startDate: Date | null;
  endDate: Date | null;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string | null) => void;
  setSelectedDatePreset: (preset: string) => void;
  setSelectedWorker: (workerId: string | null) => void;
  setSelectedTimeRange: (range: TimeRangeFilter) => void;
  setWorkloadThresholds: (thresholds: WorkloadThresholds) => void;
  setWorkloadLow: (value: number) => void;
  setWorkloadMid: (value: number) => void;
  setWorkloadHigh: (value: number) => void;
  setStartDate: (date: Date | null) => void;
  setEndDate: (date: Date | null) => void;
  locationOptions: Array<{ value: string; label: string }>;
  workerOptions: Array<{ value: string; label: string }>;
}

export function useKeukenAnalysesViewModel(
  initialData?: KeukenAnalysesData
): UseKeukenAnalysesViewModelReturn {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("this-month");
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeFilter>("all");
  const [workloadThresholds, setWorkloadThresholds] = useState<WorkloadThresholds>(DEFAULT_THRESHOLDS);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Calculate date range based on selected filters
  const dateRange = useMemo(() => {
    const today = new Date(); // Get fresh date each time
    
    console.log('[Keuken ViewModel] Calculating date range:', {
      selectedDatePreset,
      selectedYear,
      selectedMonth,
      today: today.toISOString(),
      todayYear: today.getFullYear(),
      todayMonth: today.getMonth() + 1,
    });
    
    // Use period preset
    if (selectedDatePreset === "this-month") {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      console.log('[Keuken ViewModel] This month range:', {
        start: start.toISOString(),
        end: end.toISOString(),
      });
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    } else if (selectedDatePreset === "last-month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    } else if (selectedDatePreset === "custom" && selectedMonth) {
      const start = new Date(selectedYear, selectedMonth - 1, selectedDay || 1);
      const end = selectedDay
        ? new Date(selectedYear, selectedMonth - 1, selectedDay)
        : endOfMonth(new Date(selectedYear, selectedMonth - 1));
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }
    
    // Default to this month
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [selectedYear, selectedMonth, selectedDay, selectedDatePreset]);

  // Fetch data with React Query - includes workload thresholds, selected worker, and time range in query key for recalculation
  const { data, isLoading, error } = useQuery<KeukenAnalysesData>({
    queryKey: [
      "keuken-analyses",
      dateRange.startDate,
      dateRange.endDate,
      selectedLocation,
      selectedWorker,
      selectedTimeRange,
      workloadThresholds.low,
      workloadThresholds.mid,
      workloadThresholds.high,
    ],
    queryFn: () =>
      fetchKeukenAnalysesData({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        locationId: selectedLocation || undefined,
        selectedWorkerId: selectedWorker || undefined,
        timeRangeFilter: selectedTimeRange,
        workloadThresholds,
      }),
    initialData,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Helper functions for updating individual thresholds
  const setWorkloadLow = (value: number) => {
    setWorkloadThresholds({ ...workloadThresholds, low: value });
  };

  const setWorkloadMid = (value: number) => {
    setWorkloadThresholds({ ...workloadThresholds, mid: value });
  };

  const setWorkloadHigh = (value: number) => {
    setWorkloadThresholds({ ...workloadThresholds, high: value });
  };

  // Fetch locations via GraphQL
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });

  // Build location options - filter out invalid locations
  const locationOptions = useMemo(() => {
    const validLocations = locations.filter(
      (loc: any) => 
        loc.name !== "All HNHG Locations" && 
        loc.name !== "All HNG Locations" &&
        loc.name !== "Default Location"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Worker options from fetched data
  const workerOptions = useMemo(() => {
    if (!data?.kitchenWorkers) {
      return [{ value: "all", label: "All Workers" }];
    }
    
    return [
      { value: "all", label: "All Workers" },
      ...data.kitchenWorkers.map((worker) => ({
        value: worker.workerId,
        label: `${worker.workerName}${worker.teamName ? ` (${worker.teamName})` : ""}`,
      })),
    ];
  }, [data?.kitchenWorkers]);

  return {
    keukenAnalysesData: data,
    isLoading,
    error: error as Error | null,
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedDatePreset,
    selectedWorker,
    selectedTimeRange,
    workloadThresholds,
    startDate,
    endDate,
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedDatePreset,
    setSelectedWorker,
    setSelectedTimeRange,
    setWorkloadThresholds,
    setWorkloadLow,
    setWorkloadMid,
    setWorkloadHigh,
    setStartDate,
    setEndDate,
    locationOptions,
    workerOptions,
  };
}

