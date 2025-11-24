/**
 * Labor Cost ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching for labor costs
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchLaborCosts } from "@/lib/services/workforce/labor-cost.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { getWorkerProfiles, WorkerProfilesResponse } from "@/lib/services/graphql/queries";
import { 
  LaborCostFilters, 
  LaborCostQueryParams,
  LocationOption,
  TimePeriodFilter,
  LaborCostRecord
} from "@/models/workforce/labor-cost.model";

const ITEMS_PER_PAGE = 50;

export interface UseLaborCostViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedTeam: string;
  selectedWorker: string; // user_id as string
  selectedTimePeriod: TimePeriodFilter;
  selectedDatePreset: DatePreset;
  currentPage: number;
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTeam: (team: string) => void;
  setSelectedWorker: (worker: string) => void;
  setSelectedTimePeriod: (period: TimePeriodFilter) => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setCurrentPage: (page: number) => void;
  
  // Data
  locationOptions: LocationOption[];
  teamOptions: { value: string; label: string }[];
  workerOptions: Array<{ value: string; label: string; userId: number }>;
  laborCostData: LaborCostRecord[];
  isLoading: boolean;
  error: Error | null;
  totalPages: number;
  
  // Computed aggregated costs
  aggregatedCosts: {
    perHour: number;
    perDay: number;
    perWeek: number;
    perMonth: number;
    perYear: number;
  };
}

export function useLaborCostViewModel(initialData?: { laborCostData?: any; locations?: any[] }): UseLaborCostViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriodFilter>("day");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, selectedLocation, selectedWorker, selectedYear, selectedMonth, selectedDay, selectedDatePreset]);

  // Reset month/day when date preset changes (preset takes priority)
  useEffect(() => {
    if (selectedDatePreset !== "custom") {
      setSelectedMonth(null);
      setSelectedDay(null);
    }
  }, [selectedDatePreset]);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations via GraphQL - use initialData if provided
  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 60 * 60 * 1000, // 60 minutes (static data)
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

  // Fetch unique team names from API
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
  const teamOptions = useMemo(() => {
    return [
      { value: "all", label: "All" },
      ...uniqueTeams.map((teamName: string) => ({ value: teamName, label: teamName })),
    ];
  }, [uniqueTeams]);

  // Fetch workers for autocomplete/search
  const { data: workersData } = useQuery<WorkerProfilesResponse>({
    queryKey: ["worker-profiles-for-search", selectedYear],
    queryFn: async () => {
      try {
        const result = await getWorkerProfiles(selectedYear, null, null, 1, 1000, undefined);
        return result;
      } catch (error) {
        // Return empty result on error to prevent page crash
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: 'Failed to fetch workers',
        };
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1, // Only retry once
  });

  // Build worker options for autocomplete
  const workerOptions = useMemo(() => {
    const workers = workersData?.records || [];
    return [
      { value: "all", label: "All Workers", userId: 0 },
      ...workers
        .filter((w: any) => w.userName || w.eitjeUserId)
        .map((w: any) => ({
          value: String(w.eitjeUserId || w.id),
          label: w.userName || `User ${w.eitjeUserId}`,
          userId: w.eitjeUserId || 0,
        })),
    ];
  }, [workersData]);

  // Build query filters (business logic)
  const queryFilters = useMemo<LaborCostFilters>(() => {
    const filters: LaborCostFilters = {};
    const currentYear = new Date().getFullYear();
    
    // Priority: selectedDay > selectedMonth > dateRange (from preset, only for current year) > selectedYear
    if (selectedDay !== null && selectedMonth !== null) {
      // Specific day selected
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      // Specific month selected
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (dateRange && selectedYear === currentYear && selectedDatePreset !== "custom") {
      // Only use date range preset if viewing current year AND preset is not "custom"
      const startYear = dateRange.start.getFullYear();
      const startMonth = String(dateRange.start.getMonth() + 1).padStart(2, "0");
      const startDay = String(dateRange.start.getDate()).padStart(2, "0");
      filters.startDate = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = dateRange.end.getFullYear();
      const endMonth = String(dateRange.end.getMonth() + 1).padStart(2, "0");
      const endDay = String(dateRange.end.getDate()).padStart(2, "0");
      filters.endDate = `${endYear}-${endMonth}-${endDay}`;
    } else {
      // Default to full year range for non-current years or when preset is "custom"
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

    // Worker filter (by user_id)
    if (selectedWorker !== "all") {
      filters.userId = parseInt(selectedWorker, 10);
    }

    // Note: typeName filter is not used for aggregated hours
    // Aggregated hours are already filtered to worked hours only

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, selectedTeam, selectedWorker, dateRange, selectedDatePreset]);

  // Build query params
  const queryParams = useMemo<LaborCostQueryParams>(() => {
    return {
      ...queryFilters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
  }, [queryFilters, currentPage]);

  // Fetch labor cost data (paginated for table)
  const { 
    data: laborCostResponse, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["labor-costs", queryParams],
    queryFn: () => fetchLaborCosts(queryParams),
    enabled: !!queryParams.startDate && !!queryParams.endDate,
    placeholderData: (previousData) => {
      // Use initialData only on first load when no previous data exists
      if (!previousData && initialData?.laborCostData) {
        return initialData.laborCostData;
      }
      return previousData;
    },
    staleTime: 0, // Always refetch when filters change
  });

  // Fetch ALL records for aggregated costs calculation (no pagination)
  const { data: allLaborCostResponse } = useQuery({
    queryKey: ["labor-costs-all", queryFilters], // Use queryFilters, not queryParams (no pagination)
    queryFn: () => fetchLaborCosts({
      ...queryFilters,
      page: 1,
      limit: 10000, // Large limit to get all records
    }),
    enabled: !!queryFilters.startDate && !!queryFilters.endDate,
    staleTime: 0, // Always refetch when filters change
  });

  // Aggregate costs per time period - use ALL filtered records, not just current page
  const aggregatedCosts = useMemo(() => {
    const records = allLaborCostResponse?.records || [];
    
    if (records.length === 0) {
      return {
        perHour: 0,
        perDay: 0,
        perWeek: 0,
        perMonth: 0,
        perYear: 0,
      };
    }

    // Group by period based on selectedTimePeriod
    const groupedByDay = new Map<string, number>();
    const groupedByWeek = new Map<string, number>();
    const groupedByMonth = new Map<string, number>();
    const groupedByYear = new Map<string, number>();

    records.forEach((record) => {
      const date = new Date(record.date);
      const laborCost = record.labor_cost || 0;

      // Day key: YYYY-MM-DD
      const dayKey = record.date;
      groupedByDay.set(dayKey, (groupedByDay.get(dayKey) || 0) + laborCost);

      // Week key: YYYY-WW (week number)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() + (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1)) / 7)}`;
      groupedByWeek.set(weekKey, (groupedByWeek.get(weekKey) || 0) + laborCost);

      // Month key: YYYY-MM
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      groupedByMonth.set(monthKey, (groupedByMonth.get(monthKey) || 0) + laborCost);

      // Year key: YYYY
      const yearKey = String(date.getFullYear());
      groupedByYear.set(yearKey, (groupedByYear.get(yearKey) || 0) + laborCost);
    });

    // Calculate totals
    const totalCost = records.reduce((sum, r) => sum + (r.labor_cost || 0), 0);
    const totalHours = records.reduce((sum, r) => sum + (r.hours_worked || 0), 0);

    return {
      perHour: totalHours > 0 ? totalCost / totalHours : 0,
      perDay: Array.from(groupedByDay.values()).reduce((sum, cost) => sum + cost, 0) / groupedByDay.size || 0,
      perWeek: Array.from(groupedByWeek.values()).reduce((sum, cost) => sum + cost, 0) / groupedByWeek.size || 0,
      perMonth: Array.from(groupedByMonth.values()).reduce((sum, cost) => sum + cost, 0) / groupedByMonth.size || 0,
      perYear: Array.from(groupedByYear.values()).reduce((sum, cost) => sum + cost, 0) / groupedByYear.size || 0,
    };
  }, [laborCostResponse?.records]);

  const totalPages = laborCostResponse ? Math.ceil((laborCostResponse.total || 0) / ITEMS_PER_PAGE) : 0;

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedTeam,
    selectedWorker,
    selectedTimePeriod,
    selectedDatePreset,
    currentPage,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedTeam,
    setSelectedWorker,
    setSelectedTimePeriod,
    setSelectedDatePreset,
    setCurrentPage,
    
    // Data
    locationOptions,
    teamOptions,
    workerOptions,
    laborCostData: laborCostResponse?.records || [],
    isLoading,
    error: error as Error | null,
    totalPages,
    
    // Computed
    aggregatedCosts,
  };
}

