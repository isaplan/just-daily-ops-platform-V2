/**
 * Data Labor ViewModel Layer
 * Business logic for labor data pages (shared base)
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { fetchLocations, fetchProcessedLaborData } from "@/lib/services/data/labor.service";
import { LaborQueryParams, Location } from "@/models/data/labor.model";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";

const ITEMS_PER_PAGE = 50;

export interface UseLaborViewModelOptions {
  endpoint: string;
  defaultDatePreset?: DatePreset;
}

export function useLaborViewModel(options: UseLaborViewModelOptions) {
  const { endpoint, defaultDatePreset = "this-year" } = options;

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>(defaultDatePreset);
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc: Location) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs when a location is selected
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      
      const supabase = createClient();
      try {
        const { data: locsData } = await supabase
          .from("locations")
          .select("id, name");
        
        const selectedLoc = locsData?.find((loc: Location) => loc.id === selectedLocation);
        if (!selectedLoc) return [];
        
        const { data: allEnvs, error } = await supabase
          .from("eitje_environments")
          .select("id, raw_data");
        
        if (error) {
          console.error("Error fetching environments:", error);
          return [];
        }
        
        const matchedIds = (allEnvs || [])
          .filter((env: { id: number; raw_data?: { name?: string } }) => {
            const envName = env.raw_data?.name || "";
            return envName.toLowerCase() === selectedLoc.name.toLowerCase();
          })
          .map((env: { id: number }) => env.id);
        
        return matchedIds;
      } catch (error) {
        console.error("Error in environment ID query:", error);
        return [];
      }
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: { startDate?: string; endDate?: string } = {};
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = filters.startDate;
    } else if (selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    return filters;
  }, [dateRange, selectedYear, selectedMonth, selectedDay]);

  // Query params (memoized)
  const queryParams = useMemo<LaborQueryParams | null>(() => {
    if (!queryFilters.startDate || !queryFilters.endDate) return null;

    return {
      endpoint,
      startDate: queryFilters.startDate,
      endDate: queryFilters.endDate,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      environmentId: selectedLocation !== "all" && environmentIds && environmentIds.length > 0
        ? String(environmentIds[0])
        : undefined,
    };
  }, [endpoint, queryFilters, currentPage, selectedLocation, environmentIds]);

  // Fetch labor data
  const { data, isLoading, error } = useQuery({
    queryKey: ["labor-data", endpoint, queryParams],
    queryFn: () => fetchProcessedLaborData(queryParams!),
    enabled: !!queryParams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (data && currentPage < data.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, data]);

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedDatePreset,
    currentPage,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedDatePreset,
    setCurrentPage,
    
    // Data
    locations,
    locationOptions,
    environmentIds,
    isLoadingEnvIds,
    data,
    isLoading,
    error: error as Error | null,
    
    // Computed
    totalPages: data?.totalPages || 0,
    total: data?.total || 0,
    
    // Handlers
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
  };
}

