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
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
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

  // Build query params (without location - fetch all locations, filter client-side)
  const baseQueryParams = useMemo<BorkSalesQueryParams>(() => {
    return {
      startDate: dateRangeFilters.startDate,
      endDate: dateRangeFilters.endDate,
      // No locationId - fetch all locations
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      page: 1,
      limit: 10000, // Fetch all records for client-side filtering/pagination
    };
  }, [dateRangeFilters, selectedCategory]);

  // Fetch sales data for ALL locations (no location filter) - use initialData if provided
  const { 
    data: allSalesData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["bork-v2-sales", baseQueryParams.startDate, baseQueryParams.endDate, baseQueryParams.category],
    queryFn: () => fetchBorkSales(baseQueryParams),
    initialData: initialData?.salesData,
    enabled: !!baseQueryParams.startDate && !!baseQueryParams.endDate,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Filter by location and paginate client-side
  const { salesData, totalPages } = useMemo(() => {
    if (!allSalesData?.records) {
      return { salesData: null, totalPages: 0 };
    }

    // Filter by location
    let filtered = allSalesData.records;
    if (selectedLocation !== "all") {
      filtered = filtered.filter((record: any) => 
        record.location_id === selectedLocation
      );
    }

    // Paginate client-side
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      salesData: {
        ...allSalesData,
        records: paginated,
        total: filtered.length,
        page: currentPage,
        totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      },
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
    };
  }, [allSalesData, selectedLocation, currentPage]);

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
    salesData,
    isLoading,
    error: error as Error | null,
    totalPages,
  };
}


