/**
 * Product Performance ViewModel Layer
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { getProductPerformance } from "@/lib/services/graphql/queries";
import { getLocations } from "@/lib/services/graphql/queries";
import { LocationOption } from "@/models/sales/bork-sales-v2.model";

const ITEMS_PER_PAGE = 50;

export function useProductPerformanceViewModel() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, selectedYear, selectedMonth, selectedDay, selectedDatePreset]);

  const dateRange = useMemo(() => getDateRangeForPreset(selectedDatePreset), [selectedDatePreset]);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 60 * 60 * 1000,
  });

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

  const isCurrentYear = useMemo(() => selectedYear === new Date().getFullYear(), [selectedYear]);

  const { startDate, endDate } = useMemo(() => {
    if (selectedDatePreset !== "custom" && dateRange) {
      // Convert Date objects to YYYY-MM-DD strings
      const startYear = dateRange.start.getUTCFullYear();
      const startMonth = String(dateRange.start.getUTCMonth() + 1).padStart(2, '0');
      const startDay = String(dateRange.start.getUTCDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = dateRange.end.getUTCFullYear();
      const endMonth = String(dateRange.end.getUTCMonth() + 1).padStart(2, '0');
      const endDay = String(dateRange.end.getUTCDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;
      
      return {
        startDate: startDateStr,
        endDate: endDateStr,
      };
    }

    let start: Date, end: Date;
    if (selectedDay !== null && selectedMonth !== null) {
      start = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 23, 59, 59));
    } else if (selectedMonth !== null) {
      start = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59));
    } else {
      start = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
      end = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59));
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [selectedYear, selectedMonth, selectedDay, selectedDatePreset, dateRange]);

  // Fetch product performance for ALL locations
  const { data: allProductData, isLoading, error } = useQuery({
    queryKey: ["product-performance", startDate, endDate],
    queryFn: () => getProductPerformance(startDate, endDate, 1, 10000, {}), // Fetch all
    staleTime: 30 * 60 * 1000,
    enabled: !!startDate && !!endDate,
  });

  // Filter and paginate data client-side
  const { productData, totalPages, total } = useMemo(() => {
    if (!allProductData?.records) {
      return { productData: [], totalPages: 0, total: 0 };
    }
    
    // Filter by location
    let filtered = allProductData.records;
    if (selectedLocation !== "all") {
      filtered = filtered.filter((product: any) => 
        product.location_id === selectedLocation
      );
    }
    
    // Paginate client-side
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, endIndex);
    
    return {
      productData: paginated,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      total: filtered.length,
    };
  }, [allProductData?.records, selectedLocation, currentPage]);

  return {
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    selectedDatePreset,
    currentPage,
    isCurrentYear,
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setSelectedDatePreset,
    setCurrentPage,
    locationOptions,
    productData,
    isLoading,
    error: error as Error | null,
    totalPages,
    total,
  };
}

