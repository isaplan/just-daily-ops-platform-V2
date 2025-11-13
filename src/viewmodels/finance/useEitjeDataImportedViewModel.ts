/**
 * Finance Eitje Data Imported ViewModel Layer
 * Business logic and state management for Eitje raw time registration data
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import {
  fetchLocations,
  generateLocationOptions,
  fetchEnvironmentIds,
  fetchTimeRegistrationData,
} from "@/lib/services/finance/eitje-data-imported.service";
import { getNetworkRetryConfig } from "@/lib/utils/react-query-retry";
import type {
  Location,
  LocationOption,
  TimeRegistrationDataResponse,
  DateRange,
} from "@/models/finance/eitje-data-imported.model";

const ITEMS_PER_PAGE = 50;

export function useEitjeDataImportedViewModel() {
  // UI State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);

  // Date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations with network error retry
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ["eitje-imported-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Generate location options
  const locationOptions = useMemo<LocationOption[]>(() => {
    return generateLocationOptions(locations);
  }, [locations]);

  // Fetch environment IDs when a location is selected
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery<number[] | null>({
    queryKey: ["eitje-imported-environments", selectedLocation, locations],
    queryFn: () => fetchEnvironmentIds(selectedLocation, locations),
    enabled: selectedLocation !== "all" && locations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: {
      startDate: string;
      endDate: string;
      environmentId?: string;
    } = {
      startDate: "",
      endDate: "",
    };

    if (dateRange) {
      // Convert Date objects to YYYY-MM-DD format
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null && selectedYear) {
      // If both day and month are selected, filter by specific day
      // Note: selectedMonth is 0-indexed, so we add 1
      filters.startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth !== null && selectedYear) {
      // If only month is selected, filter by entire month
      // Note: selectedMonth is 0-indexed, so we add 1
      filters.startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else {
      // Filter by year
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, dateRange]);

  // Fetch time registration data with network error retry
  const { data, isLoading, error } = useQuery<TimeRegistrationDataResponse>({
    queryKey: ["eitje-raw-data", queryFilters, currentPage, environmentIds],
    queryFn: () =>
      fetchTimeRegistrationData({
        startDate: queryFilters.startDate,
        endDate: queryFilters.endDate,
        environmentId: queryFilters.environmentId,
        environmentIds: environmentIds || undefined,
        page: currentPage,
        itemsPerPage: ITEMS_PER_PAGE,
      }),
    enabled: !!queryFilters.startDate && !!queryFilters.endDate && (selectedLocation === "all" || !isLoadingEnvIds),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  // Handlers that reset pagination
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };

  const handleMonthChange = (month: number | null) => {
    setSelectedMonth(month);
    if (month === null) {
      setSelectedDay(null); // Clear day when month is cleared
    }
    setCurrentPage(1);
  };

  const handleDayChange = (day: number | null) => {
    setSelectedDay(day);
    setCurrentPage(1);
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    setCurrentPage(1);
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

  const handleResetToDefault = () => {
    setSelectedYear(2025);
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedLocation("all");
    setSelectedDatePreset("this-month");
    setCurrentPage(1);
  };

  return {
    // State
    selectedYear,
    setSelectedYear: handleYearChange,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    selectedDay,
    setSelectedDay: handleDayChange,
    selectedLocation,
    setSelectedLocation: handleLocationChange,
    selectedDatePreset,
    setSelectedDatePreset: handleDatePresetChange,
    currentPage,
    setCurrentPage,

    // Data
    locations,
    isLoadingLocations,
    locationOptions,
    environmentIds,
    isLoadingEnvIds,
    data,
    isLoading,
    error,

    // Computed
    totalPages,
    dateRange,

    // Handlers
    handleResetToDefault,
  };
}



