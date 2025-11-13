/**
 * Hours V2 ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { getEnvIdsForLocation } from "@/lib/eitje/env-utils";
import { fetchProcessedHours, fetchAggregatedHours } from "@/lib/services/eitje-v2/hours-v2.service";
import { 
  HoursV2Tab, 
  HoursV2Filters, 
  HoursV2Pagination, 
  HoursV2QueryParams,
  LocationOption 
} from "@/models/eitje-v2/hours-v2.model";

const ITEMS_PER_PAGE = 50;

export interface UseHoursV2ViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedTeam: string;
  selectedShiftType: string;
  selectedDatePreset: DatePreset;
  currentPage: number;
  showAllColumns: boolean;
  activeTab: HoursV2Tab;
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTeam: (team: string) => void;
  setSelectedShiftType: (shiftType: string) => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setCurrentPage: (page: number) => void;
  setShowAllColumns: (show: boolean) => void;
  setActiveTab: (tab: HoursV2Tab) => void;
  
  // Data
  locationOptions: LocationOption[];
  teamOptions: { value: string; label: string }[];
  shiftTypeOptions: { value: string; label: string }[];
  processedData: any;
  aggregatedData: any;
  isLoadingProcessed: boolean;
  isLoadingAggregated: boolean;
  processedError: Error | null;
  aggregatedError: Error | null;
  totalPages: number;
  
  // Computed
  currentData: any;
  isLoading: boolean;
  error: Error | null;
}

export function useHoursV2ViewModel(): UseHoursV2ViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedShiftType, setSelectedShiftType] = useState<string>("Gewerkte Uren");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);

  const [showAllColumns, setShowAllColumns] = useState(false);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, selectedShiftType, selectedLocation, selectedYear, selectedMonth, selectedDay, selectedDatePreset]);
  const [activeTab, setActiveTab] = useState<HoursV2Tab>("processed");

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations - filter out "All HNHG Locations"
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .neq("name", "All HNHG Locations")
        .neq("name", "All HNG Locations")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build location options
  const locationOptions = useMemo<LocationOption[]>(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch unique team names from processed data
  const { data: uniqueTeams = [] } = useQuery({
    queryKey: ["unique-teams-v2"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("eitje_time_registration_shifts_processed_v2")
        .select("team_name")
        .not("team_name", "is", null)
        .neq("team_name", "");
      
      if (error) throw error;
      
      // Get unique team names (trim whitespace)
      const unique = Array.from(
        new Set(
          (data || [])
            .map((r: any) => r.team_name?.trim())
            .filter(Boolean)
        )
      ).sort() as string[];
      
      console.log('[ViewModel] Unique teams found:', unique);
      return unique;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build team options from fetched data
  const teamOptions = useMemo(() => {
    return [
      { value: "all", label: "All" },
      ...uniqueTeams.map((teamName: string) => ({ value: teamName, label: teamName })),
    ];
  }, [uniqueTeams]);

  // Build shift type options (based on type_name field)
  const shiftTypeOptions = useMemo(() => {
    return [
      { value: "Gewerkte Uren", label: "Gewerkte Uren" },
      { value: "verlof", label: "Verlof" },
      { value: "ziek", label: "Ziek" },
      { value: "Bijzonder Verlof", label: "Bijzonder Verlof" },
    ];
  }, []);

  // Fetch environment IDs (Eitje environment IDs) when a location is selected
  const { data: environmentIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      return await getEnvIdsForLocation(selectedLocation);
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  // Build query filters (business logic)
  const queryFilters = useMemo<HoursV2Filters>(() => {
    const filters: HoursV2Filters = {};
    
    // Priority: selectedDay > selectedMonth > dateRange (from preset) > selectedYear
    // If user explicitly selected a year/month/day, use that instead of preset
    if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else if (dateRange) {
      // Use preset date range only if no explicit month/day selection
      // But check if the preset year matches selectedYear - if not, use selectedYear
      const presetStartYear = dateRange.start.getFullYear();
      const presetEndYear = dateRange.end.getFullYear();
      
      // If preset is for a different year than selected, use selectedYear instead
      if (presetStartYear !== selectedYear || presetEndYear !== selectedYear) {
        // User selected a different year, use that year instead of preset
        filters.startDate = `${selectedYear}-01-01`;
        filters.endDate = `${selectedYear}-12-31`;
      } else {
        // Preset matches selected year, use preset range
        const startYear = dateRange.start.getFullYear();
        const startMonth = String(dateRange.start.getMonth() + 1).padStart(2, "0");
        const startDay = String(dateRange.start.getDate()).padStart(2, "0");
        filters.startDate = `${startYear}-${startMonth}-${startDay}`;
        
        const endYear = dateRange.end.getFullYear();
        const endMonth = String(dateRange.end.getMonth() + 1).padStart(2, "0");
        const endDay = String(dateRange.end.getDate()).padStart(2, "0");
        filters.endDate = `${endYear}-${endMonth}-${endDay}`;
      }
    } else {
      // Default to full year if no specific selection
      // Use selectedYear (which defaults to current year)
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }
    
    console.log('[ViewModel] Built query filters:', filters);

    // Location filter
    if (selectedLocation !== "all" && environmentIds) {
      if (environmentIds.length > 0) {
        filters.environmentId = environmentIds[0]; // Use first environment ID for now
      }
    }

    // Team filter (by team name)
    if (selectedTeam !== "all") {
      filters.teamName = selectedTeam;
    }

    // Shift type filter (by type_name)
    // Note: "Gewerkte Uren" might be null/empty in DB, so we filter for null/empty when selected
    if (selectedShiftType !== "all") {
      if (selectedShiftType === "Gewerkte Uren") {
        // For "Gewerkte Uren", filter for null or empty type_name (regular worked hours)
        // We'll handle this in the API by filtering for IS NULL or empty string
        filters.typeName = null; // Special marker for "worked hours"
      } else {
        filters.typeName = selectedShiftType;
      }
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, selectedTeam, selectedShiftType, dateRange, environmentIds]);

  // Build query params
  const queryParams = useMemo<HoursV2QueryParams>(() => {
    return {
      ...queryFilters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
  }, [queryFilters, currentPage]);

  // Fetch processed hours data
  const { 
    data: processedData, 
    isLoading: isLoadingProcessed, 
    error: processedError 
  } = useQuery({
    queryKey: ["eitje-v2-processed-hours", queryParams, selectedTeam, selectedShiftType],
    queryFn: () => {
      console.log('[ViewModel] Fetching processed hours with params:', queryParams);
      return fetchProcessedHours(queryParams);
    },
    enabled: activeTab === "processed",
  });

  // Fetch aggregated hours data
  const { 
    data: aggregatedData, 
    isLoading: isLoadingAggregated, 
    error: aggregatedError 
  } = useQuery({
    queryKey: ["eitje-v2-aggregated-hours", queryParams],
    queryFn: () => fetchAggregatedHours(queryParams),
    enabled: activeTab === "aggregated",
  });

  // Computed values
  const currentData = activeTab === "processed" ? processedData : aggregatedData;
  const isLoading = activeTab === "processed" ? isLoadingProcessed : isLoadingAggregated;
  const error = activeTab === "processed" ? processedError : aggregatedError;
  const totalPages = currentData ? Math.ceil((currentData.total || 0) / ITEMS_PER_PAGE) : 0;

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedTeam,
    selectedShiftType,
    selectedDatePreset,
    currentPage,
    showAllColumns,
    activeTab,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedTeam,
    setSelectedShiftType,
    setSelectedDatePreset,
    setCurrentPage,
    setShowAllColumns,
    setActiveTab,
    
    // Data
    locationOptions,
    teamOptions,
    shiftTypeOptions,
    processedData,
    aggregatedData,
    isLoadingProcessed,
    isLoadingAggregated,
    processedError: processedError as Error | null,
    aggregatedError: aggregatedError as Error | null,
    totalPages,
    
    // Computed
    currentData,
    isLoading,
    error: error as Error | null,
  };
}

