/**
 * Time-Based Analysis ViewModel Layer
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { getTimeBasedAnalysis } from "@/lib/services/graphql/queries";
import { getLocations } from "@/lib/services/graphql/queries";
import { LocationOption } from "@/models/sales/bork-sales-v2.model";

export function useTimeBasedAnalysisViewModel(initialData?: { timeData?: any; locations?: any[] }) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");

  const dateRange = useMemo(() => getDateRangeForPreset(selectedDatePreset), [selectedDatePreset]);

  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 60 * 60 * 1000,
  });

  const locationOptions = useMemo<LocationOption[]>(() => {
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

  const isCurrentYear = useMemo(() => selectedYear === new Date().getFullYear(), [selectedYear]);

  const { startDate, endDate } = useMemo(() => {
    if (selectedDatePreset !== "custom" && dateRange) {
      // Convert Date objects to YYYY-MM-DD strings
      const startYear = dateRange.start.getUTCFullYear();
      const startMonth = String(dateRange.start.getUTCMonth() + 1).padStart(2, '0');
      const startDay = String(dateRange.start.getUTCDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = dateRange.end.getUTCFullYear();
      const endMonth = String(dateRange.end.getUTCMonth() + 1).padStart(2, '0');
      const endDay = String(dateRange.end.getUTCDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;
      
      return {
        startDate: startDateStr,
        endDate: endDateStr,
      };
    }

    let start: Date, end: Date;
    if (selectedDay !== null && selectedMonth !== null) {
      start = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 23, 59, 59));
    } else if (selectedMonth !== null) {
      start = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59));
    } else {
      start = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59));
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [selectedYear, selectedMonth, selectedDay, selectedDatePreset, dateRange]);

  // Build filters for GraphQL query
  const filters = useMemo(() => {
    const filterObj: { locationId?: string } = {};
    if (selectedLocation !== "all") {
      filterObj.locationId = selectedLocation;
    }
    return filterObj;
  }, [selectedLocation]);

  // Fetch time-based analysis data
  const { data: timeBasedAnalysisData, isLoading, error } = useQuery({
    queryKey: ["time-based-analysis", startDate, endDate, selectedLocation],
    queryFn: () => getTimeBasedAnalysis(startDate, endDate, filters),
    initialData: selectedLocation === "all" ? initialData?.timeData : undefined,
    staleTime: 30 * 60 * 1000,
    enabled: !!startDate && !!endDate,
  });

  // Get time data from query result
  const timeData = timeBasedAnalysisData?.records || [];

  return {
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedDatePreset,
    isCurrentYear,
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedDatePreset,
    locationOptions,
    timeData,
    isLoading,
    error: error as Error | null,
    startDate,
    endDate,
  };
}

