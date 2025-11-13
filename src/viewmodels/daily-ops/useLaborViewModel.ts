/**
 * Daily Ops Labor ViewModel Layer
 * Business logic for labor analytics page
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLocations, fetchLaborData } from "@/lib/services/daily-ops/labor.service";
import { LaborQueryParams } from "@/models/daily-ops/labor.model";

export function useLaborViewModel() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [showComparison, setShowComparison] = useState(false);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query params (memoized)
  const queryParams = useMemo<LaborQueryParams | null>(() => {
    if (!dateRange) return null;
    return {
      locationId: selectedLocation,
      startDate: dateRange.from.toISOString().split("T")[0],
      endDate: dateRange.to.toISOString().split("T")[0],
    };
  }, [selectedLocation, dateRange]);

  // Fetch labor data
  const { data: laborData, isLoading: laborLoading } = useQuery({
    queryKey: ["labor-data", queryParams],
    queryFn: () => fetchLaborData(queryParams!),
    enabled: !!queryParams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Utility functions (memoized)
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

  return {
    // State
    selectedLocation,
    dateRange,
    showComparison,
    
    // Setters
    setSelectedLocation,
    setDateRange,
    setShowComparison,
    
    // Data
    locations: locations || [],
    laborData,
    isLoading: laborLoading,
    
    // Utilities
    formatCurrency,
    formatHours,
    formatPercentage,
  };
}




