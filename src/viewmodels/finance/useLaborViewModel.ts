/**
 * Finance Labor Analytics ViewModel Layer
 * Business logic and state management for labor analytics
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchLocations, fetchLaborData } from "@/lib/services/finance/labor.service";
import type { Location, LaborData, DateRange } from "@/models/finance/labor.model";

export function useLaborViewModel() {
  // UI State
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Data Queries
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ["labor-locations"],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: laborData, isLoading: laborLoading } = useQuery<LaborData>({
    queryKey: ["labor-data", selectedLocation, dateRange],
    queryFn: () =>
      fetchLaborData({
        locationId: selectedLocation === "all" ? undefined : selectedLocation,
        startDate: dateRange?.from.toISOString(),
        endDate: dateRange?.to.toISOString(),
      }),
    enabled: !!dateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Formatting functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatHours = useCallback((hours: number) => {
    return `${hours.toFixed(1)}h`;
  }, []);

  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  // Computed values
  const formattedDateRange = useMemo(() => {
    if (!dateRange?.from) return "Pick a date";
    if (dateRange.to) {
      return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
    }
    return format(dateRange.from, "LLL dd, y");
  }, [dateRange]);

  const revenuePerHour = useMemo(() => {
    if (!laborData || laborData.totalHours === 0) return 0;
    return laborData.totalRevenue / laborData.totalHours;
  }, [laborData]);

  return {
    // State
    selectedLocation,
    setSelectedLocation,
    dateRange,
    setDateRange,
    isCalendarOpen,
    setIsCalendarOpen,
    showComparison,
    setShowComparison,

    // Data
    locations,
    isLoadingLocations,
    laborData,
    laborLoading,

    // Computed
    formattedDateRange,
    revenuePerHour,

    // Formatting
    formatCurrency,
    formatHours,
    formatPercentage,
  };
}



