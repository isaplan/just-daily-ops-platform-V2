/**
 * Productivity ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching for labor productivity
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchProductivityData } from "@/lib/services/workforce/productivity.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { 
  ProductivityFilters, 
  ProductivityQueryParams,
  LocationOption,
  TeamOption,
  ProductivityAggregation
} from "@/models/workforce/productivity.model";

const ITEMS_PER_PAGE = 50;

export interface UseProductivityViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedTeam: string;
  selectedPeriodType: "day" | "week" | "month";
  selectedDatePreset: DatePreset;
  currentPage: number;
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTeam: (team: string) => void;
  setSelectedPeriodType: (periodType: "day" | "week" | "month") => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setCurrentPage: (page: number) => void;
  
  // Data
  locationOptions: LocationOption[];
  teamOptions: TeamOption[];
  periodTypeOptions: { value: "day" | "week" | "month"; label: string }[];
  productivityData: ProductivityAggregation[] | undefined;
  isLoading: boolean;
  error: Error | null;
  totalPages: number;
  
  // Computed
  totals: {
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    revenuePerHour: number;
    laborCostPercentage: number;
  };
}

export function useProductivityViewModel(): UseProductivityViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPeriodType, setSelectedPeriodType] = useState<"day" | "week" | "month">("day");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, selectedLocation, selectedYear, selectedMonth, selectedDay, selectedDatePreset, selectedPeriodType]);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations via GraphQL
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
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

  // Fetch unique teams from API
  const { data: uniqueTeams = [] } = useQuery({
    queryKey: ["unique-teams-v2"],
    queryFn: async () => {
      const response = await fetch('/api/eitje/v2/unique-teams');
      if (!response.ok) return [];
      const data = await response.json();
      return data.teams || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build team options from fetched data
  const teamOptions = useMemo<TeamOption[]>(() => {
    return [
      { value: "all", label: "All Teams" },
      ...uniqueTeams.map((teamName: string) => ({ value: teamName, label: teamName })),
    ];
  }, [uniqueTeams]);

  // Period type options
  const periodTypeOptions = useMemo(() => {
    return [
      { value: "day" as const, label: "Day" },
      { value: "week" as const, label: "Week" },
      { value: "month" as const, label: "Month" },
    ];
  }, []);

  // Build query filters (business logic)
  const queryFilters = useMemo<ProductivityFilters>(() => {
    const filters: ProductivityFilters = {};
    
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

    // Team filter
    if (selectedTeam !== "all") {
      filters.teamName = selectedTeam;
    }

    // Period type
    filters.periodType = selectedPeriodType;

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, selectedTeam, selectedPeriodType, dateRange]);

  // Build query params
  const queryParams = useMemo<ProductivityQueryParams>(() => {
    return {
      ...queryFilters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
  }, [queryFilters, currentPage]);

  // Fetch productivity data
  const { 
    data: productivityResponse, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["productivity-data", queryParams],
    queryFn: () => fetchProductivityData(queryParams),
    enabled: !!queryParams.startDate && !!queryParams.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate totals from all records (not just current page)
  const totals = useMemo(() => {
    if (!productivityResponse?.records) {
      return {
        totalHoursWorked: 0,
        totalWageCost: 0,
        totalRevenue: 0,
        revenuePerHour: 0,
        laborCostPercentage: 0,
      };
    }

    const allRecords = productivityResponse.records;
    const totalHours = allRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0);
    const totalCost = allRecords.reduce((sum, r) => sum + r.totalWageCost, 0);
    const totalRevenue = allRecords.reduce((sum, r) => sum + r.totalRevenue, 0);
    const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
    const laborCostPercentage = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    return {
      totalHoursWorked: totalHours,
      totalWageCost: totalCost,
      totalRevenue,
      revenuePerHour,
      laborCostPercentage,
    };
  }, [productivityResponse]);

  const totalPages = productivityResponse?.totalPages || 0;

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedTeam,
    selectedPeriodType,
    selectedDatePreset,
    currentPage,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedTeam,
    setSelectedPeriodType,
    setSelectedDatePreset,
    setCurrentPage,
    
    // Data
    locationOptions,
    teamOptions,
    periodTypeOptions,
    productivityData: productivityResponse?.records,
    isLoading,
    error: error as Error | null,
    totalPages,
    
    // Computed
    totals,
  };
}




