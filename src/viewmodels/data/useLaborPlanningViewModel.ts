/**
 * Labor Planning ViewModel Layer
 * Business logic for Labor Planning page
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import {
  fetchLocations,
  generateLocationOptions,
  fetchEnvironmentIds,
  fetchPlanningData,
} from "@/lib/services/data/labor-planning.service";
import { LocationOption, PlanningRecord } from "@/models/data/labor-planning.model";

const ITEMS_PER_PAGE = 50;

export function useLaborPlanningViewModel() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000,
  });

  const locationOptions: LocationOption[] = useMemo(
    () => generateLocationOptions(locations),
    [locations]
  );

  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: () => fetchEnvironmentIds(selectedLocation, locations),
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  const queryFilters = useMemo(() => {
    const filters: { startDate?: string; endDate?: string } = {};

    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    return {
      ...filters,
      selectedYear,
      selectedMonth,
      selectedDay,
      selectedLocation,
      currentPage,
      itemsPerPage: ITEMS_PER_PAGE,
      environmentIds,
    };
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, dateRange, currentPage, environmentIds]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-planning-processed", queryFilters, currentPage, environmentIds],
    queryFn: () => fetchPlanningData(queryFilters),
    enabled: !!queryFilters.startDate && (selectedLocation === "all" || !isLoadingEnvIds),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    setCurrentPage(1);
  }, []);

  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    if (month === null) {
      setSelectedDay(null);
    }
    setCurrentPage(1);
  }, []);

  const handleDayChange = useCallback((day: number | null) => {
    setSelectedDay(day);
    setCurrentPage(1);
  }, []);

  const handleLocationChange = useCallback((location: string) => {
    setSelectedLocation(location);
    setCurrentPage(1);
  }, []);

  const handleDatePresetChange = useCallback((preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  }, []);

  const handleResetToDefault = useCallback(() => {
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedLocation("all");
    setSelectedDatePreset("this-year");
    setCurrentPage(1);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  return {
    selectedYear,
    handleYearChange,
    selectedMonth,
    handleMonthChange,
    selectedDay,
    handleDayChange,
    selectedLocation,
    handleLocationChange,
    selectedDatePreset,
    handleDatePresetChange,
    currentPage,
    handlePreviousPage,
    handleNextPage,
    totalPages,
    locations: locationOptions,
    data: data?.records || [],
    totalRecords: data?.total || 0,
    isLoading,
    error,
    handleResetToDefault,
  };
}



