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
  ProductivityEnhancedQueryParams,
  LocationOption,
  TeamOption,
  ProductivityAggregation,
  ProductivityByDivision,
  ProductivityByTeamCategory,
  WorkerProductivity,
  MissingWageWorker
} from "@/models/workforce/productivity.model";
import { applyProductivityGoals } from "@/lib/utils/productivity-goals";
import { getAllTeamCategories, getSubTeams, getCategoryDisplayName } from "@/lib/utils/team-categorization";
import { getWorkerProfiles, WorkerProfilesResponse } from "@/lib/services/graphql/queries";

const ITEMS_PER_PAGE = 50;

export interface UseProductivityViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedTeam: string;
  selectedPeriodType: "year" | "month" | "week" | "day" | "hour";
  selectedDatePreset: DatePreset;
  currentPage: number;
  // Enhanced state
  selectedDivision: 'All' | 'Food' | 'Beverage' | 'Management' | 'Other';
  selectedTeamCategory: 'Kitchen' | 'Service' | 'Management' | 'Other' | 'all';
  selectedSubTeam: string | 'all';
  selectedWorker: string | 'all';
  activeTab: 'location' | 'division' | 'team' | 'worker';
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTeam: (team: string) => void;
  setSelectedPeriodType: (periodType: "year" | "month" | "week" | "day" | "hour") => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setCurrentPage: (page: number) => void;
  // Enhanced setters
  setSelectedDivision: (division: 'All' | 'Food' | 'Beverage' | 'Management' | 'Other') => void;
  setSelectedTeamCategory: (category: 'Kitchen' | 'Service' | 'Management' | 'Other' | 'all') => void;
  setSelectedSubTeam: (subTeam: string | 'all') => void;
  setSelectedWorker: (worker: string | 'all') => void;
  setActiveTab: (tab: 'location' | 'division' | 'team' | 'worker') => void;
  
  // Data
  locationOptions: LocationOption[];
  teamOptions: TeamOption[];
  periodTypeOptions: { value: "year" | "month" | "week" | "day" | "hour"; label: string }[];
    productivityData: (ProductivityAggregation[] & { debugInfo?: any }) | undefined;
  isLoading: boolean;
  error: Error | null;
  totalPages: number;
  // Enhanced data
  divisionOptions: { value: 'All' | 'Food' | 'Beverage' | 'Management' | 'Other'; label: string }[];
  teamCategoryOptions: { value: 'Kitchen' | 'Service' | 'Management' | 'Other' | 'all'; label: string }[];
  subTeamOptions: { value: string; label: string }[];
  workerOptions: { value: string; label: string }[];
  productivityDataByDivision: ProductivityByDivision[] | undefined;
  productivityDataByTeamCategory: ProductivityByTeamCategory[] | undefined;
  productivityDataByWorker: WorkerProductivity[] | undefined;
  missingWageWorkers: MissingWageWorker[] | undefined;
  goalsStatus: 'bad' | 'not_great' | 'ok' | 'great' | null;
  
  // Computed
  totals: {
    totalHoursWorked: number;
    totalWageCost: number;
    totalRevenue: number;
    revenuePerHour: number;
    laborCostPercentage: number;
  };
}

export function useProductivityViewModel(initialData?: { productivityData?: any; locations?: any[]; workerData?: WorkerProductivity[] }): UseProductivityViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPeriodType, setSelectedPeriodType] = useState<"year" | "month" | "week" | "day" | "hour">("day");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");
  const [currentPage, setCurrentPage] = useState(1);
  // Enhanced state
  const [selectedDivision, setSelectedDivision] = useState<'All' | 'Food' | 'Beverage' | 'Management' | 'Other'>('All');
  const [selectedTeamCategory, setSelectedTeamCategory] = useState<'Kitchen' | 'Service' | 'Management' | 'Other' | 'all'>('all');
  const [selectedSubTeam, setSelectedSubTeam] = useState<string | 'all'>('all');
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'location' | 'division' | 'team' | 'worker'>('location');
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, selectedLocation, selectedYear, selectedMonth, selectedDay, selectedDatePreset, selectedPeriodType, selectedDivision, selectedTeamCategory, selectedSubTeam, selectedWorker]);
  
  // Reset subTeam when teamCategory changes
  useEffect(() => {
    setSelectedSubTeam('all');
  }, [selectedTeamCategory]);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations via GraphQL - use initialData if provided
  // If initialData exists and has locations, skip the query (already fetched on server)
  // If initialData is empty array or undefined, fetch from client
  const hasInitialLocations = initialData?.locations && initialData.locations.length > 0;
  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 60 * 60 * 1000, // 60 minutes - locations rarely change
    enabled: !hasInitialLocations, // Skip query if we have valid initialData
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

  // Period type options (enhanced)
  const periodTypeOptions = useMemo(() => {
    return [
      { value: "year" as const, label: "Year" },
      { value: "month" as const, label: "Month" },
      { value: "week" as const, label: "Week" },
      { value: "day" as const, label: "Day" },
      { value: "hour" as const, label: "Hour" },
    ];
  }, []);
  
  // Division options (enhanced with Management and Other)
  const divisionOptions = useMemo(() => {
    return [
      { value: 'All' as const, label: 'All' },
      { value: 'Food' as const, label: 'Food' },
      { value: 'Beverage' as const, label: 'Beverage' },
      { value: 'Management' as const, label: 'Management' },
      { value: 'Other' as const, label: 'Other' },
    ];
  }, []);
  
  // Team category options (filtered by selected division)
  const teamCategoryOptions = useMemo(() => {
    // If "All" division, show all categories
    if (selectedDivision === 'All') {
      const categories = getAllTeamCategories();
      return [
        { value: 'all' as const, label: 'All Categories' },
        ...categories.map(cat => ({
          value: cat as 'Kitchen' | 'Service' | 'Management' | 'Other',
          label: getCategoryDisplayName(cat),
        })),
      ];
    }
    
    // Filter categories based on division
    if (selectedDivision === 'Food') {
      // Food → Kitchen (Keuken) + 50% Afwas (shown as Kitchen)
      return [
        { value: 'all' as const, label: 'All Categories' },
        { value: 'Kitchen' as const, label: 'Kitchen' },
      ];
    }
    
    if (selectedDivision === 'Beverage') {
      // Beverage → Service + 50% Afwas (shown as Service)
      return [
        { value: 'all' as const, label: 'All Categories' },
        { value: 'Service' as const, label: 'Service' },
      ];
    }
    
    if (selectedDivision === 'Management') {
      // Management → Management
      return [
        { value: 'all' as const, label: 'All Categories' },
        { value: 'Management' as const, label: 'Management' },
      ];
    }
    
    if (selectedDivision === 'Other') {
      // Other → Other
      return [
        { value: 'all' as const, label: 'All Categories' },
        { value: 'Other' as const, label: 'Other' },
      ];
    }
    
    // Default: show all
    const categories = getAllTeamCategories();
    return [
      { value: 'all' as const, label: 'All Categories' },
      ...categories.map(cat => ({
        value: cat as 'Kitchen' | 'Service' | 'Management' | 'Other',
        label: getCategoryDisplayName(cat),
      })),
    ];
  }, [selectedDivision]);
  
  // Sub-team options (filtered by selected category and division)
  const subTeamOptions = useMemo(() => {
    if (selectedTeamCategory === 'all') {
      return [];
    }
    
    const subTeams = getSubTeams(selectedTeamCategory);
    
    // Filter sub-teams based on division
    let filteredSubTeams = subTeams;
    
    if (selectedDivision === 'All') {
      // For "All" division, show all sub-teams for the selected category
      filteredSubTeams = subTeams;
    } else if (selectedDivision === 'Food' && selectedTeamCategory === 'Kitchen') {
      // Food + Kitchen → Show Keuken and Afwas (50% split)
      filteredSubTeams = subTeams.filter(team => 
        team.toLowerCase() === 'keuken' || team.toLowerCase() === 'afwas'
      );
    } else if (selectedDivision === 'Beverage' && selectedTeamCategory === 'Service') {
      // Beverage + Service → Show Bediening, Bar, and Afwas (50% split)
      filteredSubTeams = subTeams.filter(team => 
        team.toLowerCase() === 'bediening' || 
        team.toLowerCase() === 'bar' || 
        team.toLowerCase() === 'afwas'
      );
    } else if (selectedDivision === 'Management' && selectedTeamCategory === 'Management') {
      // Management → Show all management sub-teams
      filteredSubTeams = subTeams;
    } else if (selectedDivision === 'Other' && selectedTeamCategory === 'Other') {
      // Other → Show all other sub-teams (Verlof, Ziek, Bijzonder Verlof, Algemeen)
      filteredSubTeams = subTeams;
    } else {
      // Division doesn't match category - show empty or all?
      // Show all sub-teams for the category (division filter will be applied in query)
      filteredSubTeams = subTeams;
    }
    
    return [
      { value: 'all', label: 'All Sub-Teams' },
      ...filteredSubTeams.map(team => ({ value: team, label: team })),
    ];
  }, [selectedTeamCategory, selectedDivision]);
  
  // Fetch workers for autocomplete/search
  const { data: workersData } = useQuery<WorkerProfilesResponse>({
    queryKey: ["worker-profiles-for-productivity", selectedYear],
    queryFn: async () => {
      try {
        const result = await getWorkerProfiles(selectedYear, null, null, 1, 1000, undefined);
        return result;
      } catch (error) {
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
    retry: 1,
  });
  
  // Build worker options for autocomplete
  const workerOptions = useMemo(() => {
    if (!workersData?.records) return [];
    return [
      { value: 'all', label: 'All Workers' },
      ...workersData.records
        .filter(w => w.userName)
        .map(w => ({
          value: w.id,
          label: w.userName || 'Unknown',
        })),
    ];
  }, [workersData]);

  // Build query filters (business logic)
  const queryFilters = useMemo<ProductivityFilters>(() => {
    const filters: ProductivityFilters = {};
    
    // Business Rule: Cap end date to today (no future data)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    // Priority: selectedDay > selectedMonth > dateRange (from preset) > selectedYear
    if (selectedDay !== null && selectedMonth !== null) {
      const selectedDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.startDate = selectedDateStr;
      // Cap to today if selected date is in the future
      filters.endDate = selectedDateStr > todayStr ? todayStr : selectedDateStr;
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthEndStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
      // Cap to today if month end is in the future
      filters.endDate = monthEndStr > todayStr ? todayStr : monthEndStr;
    } else if (dateRange) {
      const presetStartYear = dateRange.start.getFullYear();
      const presetEndYear = dateRange.end.getFullYear();
      
      if (presetStartYear !== selectedYear || presetEndYear !== selectedYear) {
        filters.startDate = `${selectedYear}-01-01`;
        // Cap to today if year end is in the future
        filters.endDate = `${selectedYear}-12-31` > todayStr ? todayStr : `${selectedYear}-12-31`;
      } else {
        const startYear = dateRange.start.getFullYear();
        const startMonth = String(dateRange.start.getMonth() + 1).padStart(2, "0");
        const startDay = String(dateRange.start.getDate()).padStart(2, "0");
        filters.startDate = `${startYear}-${startMonth}-${startDay}`;
        
        const endYear = dateRange.end.getFullYear();
        const endMonth = String(dateRange.end.getMonth() + 1).padStart(2, "0");
        const endDay = String(dateRange.end.getDate()).padStart(2, "0");
        const presetEndStr = `${endYear}-${endMonth}-${endDay}`;
        // Cap to today if preset end is in the future
        filters.endDate = presetEndStr > todayStr ? todayStr : presetEndStr;
      }
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      // Cap to today if year end is in the future
      filters.endDate = `${selectedYear}-12-31` > todayStr ? todayStr : `${selectedYear}-12-31`;
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

  // Build enhanced query params
  const queryParams = useMemo<ProductivityEnhancedQueryParams>(() => {
    return {
      ...queryFilters,
      periodType: selectedPeriodType,
      division: selectedDivision !== 'All' ? selectedDivision : undefined,
      teamCategory: selectedTeamCategory !== 'all' ? selectedTeamCategory : undefined,
      subTeam: selectedSubTeam !== 'all' ? selectedSubTeam : undefined,
      workerId: selectedWorker !== 'all' ? selectedWorker : undefined,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
  }, [queryFilters, currentPage, selectedPeriodType, selectedDivision, selectedTeamCategory, selectedSubTeam, selectedWorker]);

  // ✅ Fetch via GraphQL (not REST API)
  const { 
    data: productivityResponse, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [
      "productivity-enhanced-data",
      queryParams.startDate,
      queryParams.endDate,
      queryParams.locationId,
      queryParams.periodType,
      queryParams.division,
      queryParams.teamCategory,
      queryParams.subTeam,
      queryParams.workerId,
      queryParams.page,
      queryParams.limit,
    ],
    queryFn: async () => {
      const { getLaborProductivityEnhanced } = await import('@/lib/services/graphql/queries');
      
      // Convert to GraphQL enum format
      const periodTypeMap: Record<string, 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR'> = {
        year: 'YEAR',
        month: 'MONTH',
        week: 'WEEK',
        day: 'DAY',
        hour: 'HOUR',
      };
      
      const divisionMap: Record<string, 'TOTAL' | 'FOOD' | 'BEVERAGE'> = {
        All: 'TOTAL',
        Food: 'FOOD',
        Beverage: 'BEVERAGE',
      };
      
      const teamCategoryMap: Record<string, 'KITCHEN' | 'SERVICE' | 'MANAGEMENT' | 'OTHER'> = {
        Kitchen: 'KITCHEN',
        Service: 'SERVICE',
        Management: 'MANAGEMENT',
        Other: 'OTHER',
      };
      
      const result = await getLaborProductivityEnhanced(
        queryParams.startDate!,
        queryParams.endDate!,
        periodTypeMap[queryParams.periodType || 'day'] || 'DAY',
        queryParams.locationId && queryParams.locationId !== 'all' ? queryParams.locationId : undefined,
        {
          division: queryParams.division ? divisionMap[queryParams.division] : undefined,
          teamCategory: queryParams.teamCategory ? teamCategoryMap[queryParams.teamCategory] : undefined,
          subTeam: queryParams.subTeam,
          workerId: queryParams.workerId,
        },
        queryParams.page || 1,
        queryParams.limit || 50
      );
      
      console.log('[Productivity ViewModel] Received GraphQL data:', {
        success: result.success,
        total: result.total,
        recordsCount: result.records?.length || 0,
        byWorkerCount: result.byWorker?.length || 0,
        error: result.error,
      });
      
      return result;
    },
    enabled: !!queryParams.startDate && !!queryParams.endDate,
    staleTime: 30 * 60 * 1000, // 30 minutes (increased from 5 minutes)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
  
  // Extract enhanced data
  const productivityDataByDivision = productivityResponse?.byDivision;
  
  // Transform flat byTeamCategory array into grouped structure with subTeams
  const productivityDataByTeamCategory = useMemo<ProductivityByTeamCategory[] | undefined>(() => {
    if (!productivityResponse?.byTeamCategory || productivityResponse.byTeamCategory.length === 0) {
      return undefined;
    }
    
    // Group by period, teamCategory, and locationId
    const groupedMap = new Map<string, ProductivityByTeamCategory>();
    
    for (const record of productivityResponse.byTeamCategory) {
      // Convert periodType from uppercase to lowercase
      const periodType = (record.periodType || 'DAY').toLowerCase() as 'year' | 'month' | 'week' | 'day' | 'hour';
      const teamCategory = (record.teamCategory || '').toLowerCase();
      // Capitalize first letter
      const teamCategoryCapitalized = teamCategory.charAt(0).toUpperCase() + teamCategory.slice(1) as 'Kitchen' | 'Service' | 'Management' | 'Other';
      
      // Key: period_teamCategory_locationId
      const key = `${record.period}_${teamCategoryCapitalized}_${record.locationId || 'all'}`;
      
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          teamCategory: teamCategoryCapitalized,
          period: record.period,
          periodType,
          locationId: record.locationId,
          locationName: record.locationName,
          totalHoursWorked: 0,
          totalWageCost: 0,
          totalRevenue: 0,
          revenuePerHour: 0,
          laborCostPercentage: 0,
          goalStatus: record.goalStatus as 'bad' | 'not_great' | 'ok' | 'great' | undefined,
          subTeams: [],
        });
      }
      
      const grouped = groupedMap.get(key)!;
      
      // If this record has a subTeam, add it to subTeams array
      if (record.subTeam) {
        // Check if subTeam already exists
        const existingSubTeam = grouped.subTeams?.find(st => st.subTeam === record.subTeam);
        if (!existingSubTeam) {
          // Calculate subTeam totals from this record
          grouped.subTeams = grouped.subTeams || [];
          grouped.subTeams.push({
            subTeam: record.subTeam,
            totalHoursWorked: record.totalHoursWorked || 0,
            totalWageCost: record.totalWageCost || 0,
            totalRevenue: record.totalRevenue || 0,
            revenuePerHour: record.revenuePerHour || 0,
            laborCostPercentage: record.laborCostPercentage || 0,
          });
        } else {
          // Aggregate subTeam totals
          existingSubTeam.totalHoursWorked += record.totalHoursWorked || 0;
          existingSubTeam.totalWageCost += record.totalWageCost || 0;
          existingSubTeam.totalRevenue += record.totalRevenue || 0;
          existingSubTeam.revenuePerHour = existingSubTeam.totalHoursWorked > 0 
            ? existingSubTeam.totalRevenue / existingSubTeam.totalHoursWorked 
            : 0;
          existingSubTeam.laborCostPercentage = existingSubTeam.totalRevenue > 0
            ? (existingSubTeam.totalWageCost / existingSubTeam.totalRevenue) * 100
            : 0;
        }
      }
      
      // Aggregate main totals
      grouped.totalHoursWorked += record.totalHoursWorked || 0;
      grouped.totalWageCost += record.totalWageCost || 0;
      grouped.totalRevenue += record.totalRevenue || 0;
    }
    
    // Calculate derived metrics for each grouped record
    const result = Array.from(groupedMap.values()).map(grouped => {
      grouped.revenuePerHour = grouped.totalHoursWorked > 0 
        ? grouped.totalRevenue / grouped.totalHoursWorked 
        : 0;
      grouped.laborCostPercentage = grouped.totalRevenue > 0
        ? (grouped.totalWageCost / grouped.totalRevenue) * 100
        : 0;
      grouped.goalStatus = applyProductivityGoals(grouped.revenuePerHour, grouped.laborCostPercentage);
      
      return grouped;
    });
    
    return result;
  }, [productivityResponse?.byTeamCategory]);
  
  // ✅ Use initial worker data if provided (for SSR), otherwise use API response
  const productivityDataByWorker = initialData?.workerData || productivityResponse?.byWorker;
  const missingWageWorkers = productivityResponse?.missingWageWorkers;
  const debugInfo = productivityResponse?.debugInfo;
  
  // Calculate goals status from totals
  const goalsStatus = useMemo<'bad' | 'not_great' | 'ok' | 'great' | null>(() => {
    if (!totals.revenuePerHour || !totals.laborCostPercentage) return null;
    return applyProductivityGoals(totals.revenuePerHour, totals.laborCostPercentage);
  }, [totals.revenuePerHour, totals.laborCostPercentage]);

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
    selectedDivision,
    selectedTeamCategory,
    selectedSubTeam,
    selectedWorker,
    activeTab,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedTeam,
    setSelectedPeriodType,
    setSelectedDatePreset,
    setCurrentPage,
    setSelectedDivision,
    setSelectedTeamCategory,
    setSelectedSubTeam,
    setSelectedWorker,
    setActiveTab,
    
    // Data
    locationOptions,
    teamOptions,
    periodTypeOptions,
    productivityData: productivityResponse?.records || undefined,
    productivityDebugInfo: productivityResponse?.debugInfo,
    isLoading,
    error: error as Error | null,
    totalPages,
    divisionOptions,
    teamCategoryOptions,
    subTeamOptions,
    workerOptions,
    productivityDataByDivision,
    productivityDataByTeamCategory,
    productivityDataByWorker,
    missingWageWorkers,
    goalsStatus,
    
    // Computed
    totals,
  };
}




