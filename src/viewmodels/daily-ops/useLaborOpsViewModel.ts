/**
 * Labor Ops ViewModel
 * Custom hook for Daily Ops Labor page
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchLaborOpsData } from "@/lib/services/daily-ops/labor-ops.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { LaborOpsData } from "@/models/daily-ops/labor-ops.model";

export interface UseLaborOpsViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedDatePreset: DatePreset;

  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedDatePreset: (preset: DatePreset) => void;

  // Data
  locationOptions: { value: string; label: string }[];
  laborOpsData: LaborOpsData | null;
  isLoading: boolean;
  error: Error | null;
}

export function useLaborOpsViewModel(initialData?: LaborOpsData): UseLaborOpsViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });

  // Build location options
  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations
        .filter((loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations")
        .map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch labor ops data
  const { data: laborOpsData, isLoading, error } = useQuery({
    queryKey: [
      "labor-ops",
      dateRange.start,
      dateRange.end,
      selectedLocation,
    ],
    queryFn: () =>
      fetchLaborOpsData({
        startDate: dateRange.start,
        endDate: dateRange.end,
        locationId: selectedLocation !== "all" ? selectedLocation : undefined,
      }),
    enabled: !!dateRange.start && !!dateRange.end,
    staleTime: 30 * 60 * 1000, // 30 minutes
    initialData,
  });

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedDatePreset,

    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedDatePreset,

    // Data
    locationOptions,
    laborOpsData: laborOpsData || null,
    isLoading,
    error: error as Error | null,
  };
}




