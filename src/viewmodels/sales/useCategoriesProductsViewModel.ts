/**
 * Categories Products Aggregated Sales ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { fetchCategoriesProductsAggregate } from "@/lib/services/sales/categories-products.service";
import { getLocations } from "@/lib/services/graphql/queries";
import { 
  CategoriesProductsFilters,
  CategoryOption,
  ProductOption,
  CategoriesProductsResponse
} from "@/models/sales/categories-products.model";
import { LocationOption } from "@/models/sales/bork-sales-v2.model";

export type TimePeriod = "daily" | "weekly" | "monthly";

export interface UseCategoriesProductsViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  selectedCategory: string;
  selectedProduct: string;
  selectedDatePreset: DatePreset;
  activeTimePeriod: TimePeriod;
  expandedCategories: Set<string>;
  isCurrentYear: boolean;
  
  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProduct: (product: string) => void;
  setSelectedDatePreset: (preset: DatePreset) => void;
  setActiveTimePeriod: (period: TimePeriod) => void;
  toggleCategoryExpanded: (category: string) => void;
  
  // Data
  locationOptions: LocationOption[];
  categoryOptions: CategoryOption[];
  aggregatedData: CategoriesProductsResponse | null;
  isLoading: boolean;
  error: Error | null;
  
  // Methods
  refetchData: () => void;
}

export function useCategoriesProductsViewModel(initialData?: { aggregatedData?: any; locations?: any[] }): UseCategoriesProductsViewModelReturn {
  // State management
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>("daily");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Reset filters when year changes
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (selectedYear !== currentYear) {
      // For non-current years, clear all date-related filters
      setSelectedMonth(null);
      setSelectedDay(null);
      // Reset to a neutral preset or clear it
      setSelectedDatePreset("custom");
    } else {
      // For current year, default to "this-year" preset
      setSelectedDatePreset("this-year");
    }
  }, [selectedYear]);

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
        loc && 
        loc.id && 
        loc.id.toString().trim() !== '' && // ✅ Ensure id is not empty
        loc.name && 
        loc.name.trim() !== '' && // ✅ Ensure name is not empty
        loc.name !== "All HNHG Locations" && 
        loc.name !== "All HNG Locations" &&
        loc.name !== "Default Location"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations
        .map((loc: any) => ({ value: loc.id.toString(), label: loc.name }))
        .filter(option => option.value && option.value.trim() !== ''), // ✅ Double-check: filter out any empty values
    ];
  }, [locations]);

  // Check if selected year is current year
  const isCurrentYear = useMemo(() => {
    return selectedYear === new Date().getFullYear();
  }, [selectedYear]);

  // Build query filters (business logic)
  const queryFilters = useMemo<CategoriesProductsFilters>(() => {
    const filters: CategoriesProductsFilters = {};
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
    
    console.log('🔍 Query Filters Debug:', {
      selectedYear,
      currentYear,
      selectedMonth,
      selectedDay,
      selectedDatePreset,
      dateRangeYear: dateRange?.start.getFullYear(),
      computedDates: {
        startDate: filters.startDate,
        endDate: filters.endDate
      }
    });
    
    // Location filter
    if (selectedLocation !== "all") {
      filters.locationId = selectedLocation;
    }

    // Category filter
    if (selectedCategory !== "all") {
      filters.category = selectedCategory;
    }

    // Product filter
    if (selectedProduct !== "all") {
      filters.productName = selectedProduct;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, selectedCategory, selectedProduct, dateRange]);

  // Build base filters without location (fetch all locations, filter client-side)
  const baseFilters = useMemo(() => {
    const filters: CategoriesProductsFilters = { ...queryFilters };
    // Remove locationId - we'll fetch all locations
    delete filters.locationId;
    return filters;
  }, [queryFilters.startDate, queryFilters.endDate, queryFilters.category, queryFilters.productName]);

  // Fetch products grouped by category from API (all locations)
  const { data: allProductsData } = useQuery({
    queryKey: ["bork-v2-products", baseFilters.startDate, baseFilters.endDate, baseFilters.category, baseFilters.productName],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (baseFilters.startDate) params.append('startDate', baseFilters.startDate);
      if (baseFilters.endDate) params.append('endDate', baseFilters.endDate);
      // No locationId - fetch all locations
      if (baseFilters.category && baseFilters.category !== 'all') params.append('category', baseFilters.category);
      if (baseFilters.productName && baseFilters.productName !== 'all') params.append('productName', baseFilters.productName);
      
      const response = await fetch(`/api/bork/v2/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!baseFilters.startDate && !!baseFilters.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter by location client-side
  const productsData = useMemo(() => {
    if (!allProductsData) return undefined;

    // If "all" locations, return as-is
    if (selectedLocation === "all") {
      return allProductsData;
    }

    // Filter categories and products by location
    const filteredCategories = (allProductsData.categories || []).map((cat: any) => {
      const filteredProducts = (cat.products || []).filter((product: any) => 
        product.location_id === selectedLocation
      );
      
      // Only include category if it has products for this location
      if (filteredProducts.length === 0) return null;
      
      return {
        ...cat,
        products: filteredProducts,
        // Recalculate totals for this location
        totalRevenue: filteredProducts.reduce((sum: number, p: any) => sum + (p.totalRevenue || 0), 0),
        totalQuantity: filteredProducts.reduce((sum: number, p: any) => sum + (p.totalQuantity || 0), 0),
      };
    }).filter((cat: any) => cat !== null);

    return {
      ...allProductsData,
      categories: filteredCategories,
    };
  }, [allProductsData, selectedLocation]);

  // Build category options with products
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const categories = productsData?.categories || [];
    
    return [
      { value: "all", label: "All Categories" },
      ...categories.map((cat: { category: string; products: Array<{ name: string }> }) => ({
        value: cat.category,
        label: cat.category,
        products: [
          { value: "all", label: "All Products", category: cat.category },
          ...cat.products.map((prod: { name: string }) => ({
            value: prod.name,
            label: prod.name,
            category: cat.category,
          })),
        ],
      })),
    ];
  }, [productsData]);

  // Fetch aggregated data (all locations - filter client-side) - use initialData if provided
  const { 
    data: allAggregatedData, 
    isLoading, 
    error,
    refetch: refetchAggregatedData
  } = useQuery({
    queryKey: ["bork-v2-categories-products-aggregate", baseFilters],
    queryFn: () => fetchCategoriesProductsAggregate(baseFilters),
    initialData: initialData?.aggregatedData,
    enabled: !!baseFilters.startDate && !!baseFilters.endDate,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Filter aggregated data by location client-side
  const aggregatedData = useMemo(() => {
    if (!allAggregatedData) return undefined;

    // If "all" locations, return as-is
    if (selectedLocation === "all") {
      return allAggregatedData;
    }

    // Filter aggregated data by location
    // This depends on the structure of aggregatedData - may need adjustment
    return allAggregatedData; // TODO: Implement location filtering for aggregated data if needed
  }, [allAggregatedData, selectedLocation]);

  // Toggle category expansion
  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Store the last selected product to preserve it across location changes
  const lastSelectedProductRef = React.useRef<string>("all");
  const lastLocationRef = React.useRef<string>("all");
  const lastCategoryOptionsLengthRef = React.useRef<number>(0);

  // Update ref when product changes (but not when reset by category change)
  useEffect(() => {
    if (selectedProduct !== "all") {
      lastSelectedProductRef.current = selectedProduct;
    }
  }, [selectedProduct]);

  // Reset product selection when category changes
  useEffect(() => {
    if (selectedCategory === "all") {
      setSelectedProduct("all");
    }
  }, [selectedCategory]);

  // Create a stable string key for the dependency array
  const categoryOptionsLengthStr = String(categoryOptions.length);
  const locationKey = `${selectedLocation}-${categoryOptionsLengthStr}`;

  // Restore product selection when location changes and categoryOptions are ready
  useEffect(() => {
    // Check if location actually changed
    const locationChanged = lastLocationRef.current !== selectedLocation;
    const categoryOptionsLoaded = categoryOptions.length > 0 && categoryOptions.length !== lastCategoryOptionsLengthRef.current;
    
    // Update refs
    if (locationChanged) {
      lastLocationRef.current = selectedLocation;
    }
    if (categoryOptionsLoaded) {
      lastCategoryOptionsLengthRef.current = categoryOptions.length;
    }
    
    // Only restore if location changed and categoryOptions are loaded
    if (!locationChanged || !categoryOptionsLoaded || categoryOptions.length === 0) return;
    
    const productToPreserve = lastSelectedProductRef.current;
    
    // Only preserve if we have a specific product selected (not "all")
    if (productToPreserve !== "all") {
      // Try to find the product in any category for the new location
      let foundCategory: CategoryOption | null = null;
      for (const cat of categoryOptions) {
        if (cat && cat.products && Array.isArray(cat.products)) {
          if (cat.products.some(p => p && p.value === productToPreserve)) {
            foundCategory = cat;
            break;
          }
        }
      }
      
      if (foundCategory && foundCategory.value) {
        // Product exists in new location - restore selection
        setSelectedCategory(foundCategory.value);
        setSelectedProduct(productToPreserve);
      } else {
        // Product doesn't exist in new location - reset to "all"
        setSelectedProduct("all");
      }
    }
  }, [locationKey]); // Stable dependency array - single string key

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedCategory,
    selectedProduct,
    selectedDatePreset,
    activeTimePeriod,
    expandedCategories,
    isCurrentYear,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedCategory,
    setSelectedProduct,
    setSelectedDatePreset,
    setActiveTimePeriod,
    toggleCategoryExpanded,
    
    // Data
    locationOptions,
    categoryOptions,
    aggregatedData: aggregatedData || null,
    isLoading,
    error: error as Error | null,
    
    // Methods
    refetchData: () => {
      refetchAggregatedData();
    },
    
    // Date range
    startDate: queryFilters.startDate || '',
    endDate: queryFilters.endDate || '',
  };
}

