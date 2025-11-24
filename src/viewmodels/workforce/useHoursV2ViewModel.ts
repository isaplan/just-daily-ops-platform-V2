/**
 * Hours V2 ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 * Updated for GraphQL/MongoDB V2
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchProcessedHours, fetchAggregatedHours } from "@/lib/services/workforce/hours-v2.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { 
  HoursV2Tab, 
  HoursV2Filters, 
  HoursV2QueryParams,
  LocationOption 
} from "@/models/workforce/hours-v2.model";

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

export function useHoursV2ViewModel(initialData?: { processedData?: any; locations?: any[]; teams?: any[] }): UseHoursV2ViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedShiftType, setSelectedShiftType] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [activeTab, setActiveTab] = useState<HoursV2Tab>("processed");
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, selectedShiftType, selectedLocation, selectedYear, selectedMonth, selectedDay, selectedDatePreset]);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations via GraphQL - use initialData if provided
  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 60 * 60 * 1000, // 60 minutes - locations rarely change
  });

  // Build location options - filter out invalid locations
  const locationOptions = useMemo<LocationOption[]>(() => {
    const validLocations = locations.filter(
      (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch unique team names from API (will be implemented in API endpoint)
  const { data: uniqueTeams = [] } = useQuery({
    queryKey: ["unique-teams-v2"],
    queryFn: async () => {
      // TODO: Create API endpoint to fetch unique teams from MongoDB
      // For now, return empty array
      const response = await fetch('/api/eitje/v2/unique-teams');
      if (!response.ok) return [];
      const data = await response.json();
      return data.teams || [];
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
      { value: "all", label: "All" },
      { value: "worked", label: "Gewerkte Uren" },
      { value: "verlof", label: "Verlof" },
      { value: "ziek", label: "Ziek" },
      { value: "bijzonder", label: "Bijzonder Verlof" },
    ];
  }, []);

  // Build query filters (business logic)
  const queryFilters = useMemo<HoursV2Filters>(() => {
    const filters: HoursV2Filters = {};
    
    // Priority: selectedDay > selectedMonth > dateRange (from preset) > selectedYear
    if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else if (dateRange) {
      const presetStartYear = dateRange.start.getFullYear();
      const presetEndYear = dateRange.end.getFullYear();
      
      if (presetStartYear !== selectedYear || presetEndYear !== selectedYear) {
        filters.startDate = `${selectedYear}-01-01`;
        filters.endDate = `${selectedYear}-12-31`;
      } else {
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
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }
    
    // Location filter
    if (selectedLocation !== "all") {
      filters.locationId = selectedLocation;
    }

    // Team filter (by team name)
    if (selectedTeam !== "all") {
      filters.teamName = selectedTeam;
    }

    // Shift type filter (by type_name)
    // "all" = show all shifts (no filter)
    // "worked" = actual worked hours (type_name is null or empty)
    // "verlof" = leave/vacation shifts
    // "ziek" = sick leave shifts  
    // "bijzonder" = special leave shifts
    if (selectedShiftType === "all") {
      // Don't set typeName filter - show all shifts
    } else if (selectedShiftType === "worked") {
      filters.typeName = null; // Show only worked hours (no type_name)
    } else {
      filters.typeName = selectedShiftType; // Show only this specific type
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, selectedTeam, selectedShiftType, dateRange]);

  // Build query params
  const queryParams = useMemo<HoursV2QueryParams>(() => {
    return {
      ...queryFilters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
  }, [queryFilters, currentPage]);

  // Fetch processed hours data - use initialData if provided
  const { 
    data: processedData, 
    isLoading: isLoadingProcessed, 
    error: processedError 
  } = useQuery({
    queryKey: [
      "eitje-v2-processed-hours", 
      queryParams.startDate,
      queryParams.endDate,
      queryParams.page,
      queryParams.limit,
      queryParams.locationId,
      queryParams.teamName,
      queryParams.typeName, // Explicitly include typeName in query key
      selectedShiftType // Include selectedShiftType to ensure query re-runs on filter change
    ],
    queryFn: () => fetchProcessedHours(queryParams),
    initialData: initialData?.processedData,
    enabled: activeTab === "processed" && !!queryParams.startDate && !!queryParams.endDate,
    staleTime: 0, // Always refetch when filters change
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch aggregated hours data
  const { 
    data: aggregatedData, 
    isLoading: isLoadingAggregated, 
    error: aggregatedError 
  } = useQuery({
    queryKey: ["eitje-v2-aggregated-hours", queryParams],
    queryFn: () => fetchAggregatedHours(queryParams),
    enabled: activeTab === "aggregated" && !!queryParams.startDate && !!queryParams.endDate,
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






