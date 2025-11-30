/**
 * Bork Sales V2 ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchBorkSales } from "@/lib/services/sales/bork-sales-v2.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { 
  BorkSalesFilters, 
  BorkSalesQueryParams,
  LocationOption 
} from "@/models/sales/bork-sales-v2.model";

const ITEMS_PER_PAGE = 50;
const INITIAL_LOAD_LIMIT = 20; // ✅ Lazy loading: initial 20 rows, then load rest of page 1

export interface UseBorkSalesV2ViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedCategory: string;
  selectedDatePreset: DatePreset;
  currentPage: number;
  showAllColumns: boolean;
  isCurrentYear: boolean; // Whether selected year is current year
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setCurrentPage: (page: number) => void;
  setShowAllColumns: (show: boolean) => void;
  
  // Data
  locationOptions: LocationOption[];
  categoryOptions: { top10: { value: string; label: string }[]; rest: { value: string; label: string }[] };
  salesData: any;
  isLoading: boolean;
  error: Error | null;
  totalPages: number;
  
  // Computed
  salesTotals: {
    totalRevenue: number;
    totalProducts: number;
    totalQuantity: number;
    totalTransactions: number;
    avgTransactionValue: number;
  } | null;
  startDate: string;
  endDate: string;
}

export function useBorkSalesV2ViewModel(initialData?: { salesData?: any; locations?: any[] }): UseBorkSalesV2ViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  
  // Reset page and lazy load state when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasLoadedRestOfPage1(false); // Reset lazy load state when filters change
  }, [selectedLocation, selectedCategory, selectedYear, selectedMonth, selectedDay, selectedDatePreset]);

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
      (loc: any) => 
        loc.name !== "All HNHG Locations" && 
        loc.name !== "All HNG Locations" &&
        loc.name !== "Default Location"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Check if selected year is current year
  const isCurrentYear = useMemo(() => {
    return selectedYear === new Date().getFullYear();
  }, [selectedYear]);

  // Build date range (without location filter - we'll filter client-side)
  const dateRangeFilters = useMemo(() => {
    const filters: { startDate: string; endDate: string } = { startDate: '', endDate: '' };
    
    // Priority: selectedDay > selectedMonth > dateRange (from preset) > selectedYear
    if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (dateRange) {
      const presetStartYear = dateRange.start.getFullYear();
      const presetEndYear = dateRange.end.getFullYear();
      
      if (presetStartYear !== selectedYear || presetEndYear !== selectedYear) {
        filters.startDate = `${selectedYear}-01-01`;
        filters.endDate = `${selectedYear}-12-31`;
      } else {
        const startYear = dateRange.start.getUTCFullYear();
        const startMonth = String(dateRange.start.getUTCMonth() + 1).padStart(2, "0");
        const startDay = String(dateRange.start.getUTCDate()).padStart(2, "0");
        filters.startDate = `${startYear}-${startMonth}-${startDay}`;
        
        const endYear = dateRange.end.getUTCFullYear();
        const endMonth = String(dateRange.end.getUTCMonth() + 1).padStart(2, "0");
        const endDay = String(dateRange.end.getUTCDate()).padStart(2, "0");
        filters.endDate = `${endYear}-${endMonth}-${endDay}`;
      }
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, dateRange]);

  // Fetch categories from API (all locations - filter client-side if needed)
  const { data: categoriesData } = useQuery({
    queryKey: ["bork-v2-categories", dateRangeFilters.startDate, dateRangeFilters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRangeFilters.startDate) params.append('startDate', dateRangeFilters.startDate);
      if (dateRangeFilters.endDate) params.append('endDate', dateRangeFilters.endDate);
      // No locationId - fetch all locations
      
      const response = await fetch(`/api/bork/v2/categories?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    enabled: !!dateRangeFilters.startDate && !!dateRangeFilters.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Category options - top 10 + collapsible rest
  const categoryOptions = useMemo(() => {
    const categories = categoriesData?.categories || [];
    const top10 = categories.slice(0, 10);
    const rest = categories.slice(10);
    
    return {
      top10: [
        { value: "all", label: "All Categories" },
        ...top10.map((cat: string) => ({ value: cat, label: cat })),
      ],
      rest: rest.map((cat: string) => ({ value: cat, label: cat })),
    };
  }, [categoriesData]);

  // Build query params with database-level pagination and filtering
  const baseQueryParams = useMemo<BorkSalesQueryParams>(() => {
    return {
      startDate: dateRangeFilters.startDate,
      endDate: dateRangeFilters.endDate,
      locationId: selectedLocation !== "all" ? selectedLocation : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      page: currentPage,
      limit: ITEMS_PER_PAGE, // ✅ Database-level pagination
    };
  }, [dateRangeFilters, selectedCategory, selectedLocation, currentPage]);

  // ✅ Lazy loading strategy:
  // 1. Initial load: 20 rows (fast first paint)
  // 2. After initial render: Load rest of page 1 (rows 21-50)
  // 3. Background: Prefetch next page
  
  // Track if we need to load rest of page 1
  const [hasLoadedRestOfPage1, setHasLoadedRestOfPage1] = useState(false);
  // ✅ Only do initial load on page 1, and only if we haven't loaded rest yet
  const isInitialLoad = currentPage === 1 && !hasLoadedRestOfPage1;
  
  // Initial query: only 20 rows for fast first paint (only on page 1)
  const initialParams = useMemo(() => ({
    ...baseQueryParams,
    limit: isInitialLoad ? INITIAL_LOAD_LIMIT : ITEMS_PER_PAGE,
  }), [baseQueryParams, isInitialLoad]);
  
  // ✅ Fetch sales data with database-level pagination
  // No initialData from server - client fetches after HTML is ready (ISR strategy)
  // This allows ISR to cache HTML instantly without waiting for slow DB queries
  const { 
    data: salesData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["bork-v2-sales", initialParams.startDate, initialParams.endDate, initialParams.category, initialParams.locationId, initialParams.page, initialParams.limit],
    queryFn: () => fetchBorkSales(initialParams),
    // ✅ No initialData - client fetches after HTML is ready for instant first paint
    enabled: !!initialParams.startDate && !!initialParams.endDate,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
  
  // ✅ Load rest of page 1 after initial render (lazy load)
  // Only run after initial query completes successfully and we have exactly 20 records
  const { data: restOfPage1Data } = useQuery({
    queryKey: ["bork-v2-sales", baseQueryParams.startDate, baseQueryParams.endDate, baseQueryParams.category, baseQueryParams.locationId, 1, ITEMS_PER_PAGE],
    queryFn: () => fetchBorkSales({ ...baseQueryParams, page: 1, limit: ITEMS_PER_PAGE }),
    enabled: isInitialLoad && 
             !isLoading && // ✅ Wait for initial query to complete
             !!salesData?.records && 
             salesData.records.length === INITIAL_LOAD_LIMIT && 
             !hasLoadedRestOfPage1 && 
             !!baseQueryParams.startDate && 
             !!baseQueryParams.endDate &&
             !error, // ✅ Don't run if initial query failed
    staleTime: 30 * 60 * 1000,
    onSuccess: () => setHasLoadedRestOfPage1(true),
  });
  
  // ✅ Prefetch next page in background
  // Only run after we have successfully loaded data and are on page 1
  // Disable prefetch to reduce simultaneous queries and prevent timeouts
  const { data: nextPageData } = useQuery({
    queryKey: ["bork-v2-sales", baseQueryParams.startDate, baseQueryParams.endDate, baseQueryParams.category, baseQueryParams.locationId, currentPage + 1, ITEMS_PER_PAGE],
    queryFn: () => fetchBorkSales({ ...baseQueryParams, page: currentPage + 1, limit: ITEMS_PER_PAGE }),
    enabled: false, // ✅ DISABLED: Prefetch causes simultaneous queries and timeouts
    // enabled: !!baseQueryParams.startDate && 
    //          !!baseQueryParams.endDate && 
    //          currentPage < (salesData?.totalPages || 0) &&
    //          !isLoading && // ✅ Wait for current page to load
    //          !!salesData?.records, // ✅ Only prefetch if we have data
    staleTime: 30 * 60 * 1000,
  });
  
  // Merge rest of page 1 data if available
  const mergedSalesData = useMemo(() => {
    if (isInitialLoad && restOfPage1Data?.records && salesData?.records) {
      return {
        ...salesData,
        records: restOfPage1Data.records, // Use full page 1 data
      };
    }
    return salesData;
  }, [isInitialLoad, salesData, restOfPage1Data]);

  const totalPages = mergedSalesData?.totalPages || salesData?.totalPages || 0;

  // Helper to check if record is cancelled (negative quantity)
  const isCancelled = (record: any): boolean => {
    return record.quantity !== null && record.quantity !== undefined && record.quantity < 0;
  };

  // Calculate actual date range from records (for display in summary)
  const actualDateRange = useMemo(() => {
    const recordsToUse = mergedSalesData?.records || salesData?.records;
    if (!recordsToUse || recordsToUse.length === 0) {
      return { startDate: '', endDate: '' };
    }
    const records = recordsToUse;
    const dates = records
      .map((r: any) => r.date)
      .filter((date: string | null | undefined) => date != null && date !== '');
    
    if (dates.length === 0) {
      return { startDate: '', endDate: '' };
    }
    
    // Sort dates and get min/max
    const sortedDates = dates.sort();
    return {
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
    };
  }, [mergedSalesData?.records, salesData?.records]);

  // Calculate totals from sales data (MVVM: business logic in ViewModel)
  const salesTotals = useMemo(() => {
    const recordsToUse = mergedSalesData?.records || salesData?.records;
    if (!recordsToUse) return null;
    const records = recordsToUse;
    // Total Revenue = sum of (quantity × price_ex_vat) for all non-cancelled records
    // Using total_ex_vat which is already quantity × price_ex_vat
    const totalRevenue = records.reduce((sum: number, r: any) => {
      if (isCancelled(r)) return sum; // Exclude cancelled items
      const revenue = r.total_ex_vat !== null && r.total_ex_vat !== undefined ? Number(r.total_ex_vat) : 0;
      return sum + revenue;
    }, 0);
    const totalProducts = new Set(records.filter((r: any) => !isCancelled(r)).map((r: any) => r.product_name)).size;
    const totalQuantity = records.reduce((sum: number, r: any) => sum + (isCancelled(r) ? 0 : Math.abs(r.quantity || 0)), 0);
    const totalTransactions = new Set(records.filter((r: any) => !isCancelled(r)).map((r: any) => r.ticket_key)).size;
    // Avg Transaction Value = total revenue / number of transactions
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    return {
      totalRevenue,
      totalProducts,
      totalQuantity,
      totalTransactions,
      avgTransactionValue,
    };
  }, [mergedSalesData?.records, salesData?.records]);

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedCategory,
    selectedDatePreset,
    currentPage,
    showAllColumns,
    isCurrentYear,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedCategory,
    setSelectedDatePreset,
    setCurrentPage,
    setShowAllColumns,
    
    // Data
    locationOptions,
    categoryOptions,
    salesData: mergedSalesData || salesData,
    isLoading,
    error: error as Error | null,
    totalPages,
    
    // Computed
    salesTotals,
    startDate: actualDateRange.startDate || dateRangeFilters.startDate,
    endDate: actualDateRange.endDate || dateRangeFilters.endDate,
  };
}


