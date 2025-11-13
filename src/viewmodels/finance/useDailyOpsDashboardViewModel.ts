/**
 * Finance Daily Ops Dashboard ViewModel Layer
 * Business logic and state management for daily ops dashboard
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fetchLaborData, fetchSalesData } from "@/lib/services/finance/daily-ops-dashboard.service";
import type {
  Location,
  DateRangePreset,
  KPIData,
  LocationKey,
  DateRangeKey,
} from "@/models/finance/daily-ops-dashboard.model";

// Location mapping
const LOCATIONS: Record<LocationKey, Location> = {
  total: { id: "total", name: "Total", color: "bg-blue-500" },
  kinsbergen: { id: "1125", name: "Van Kinsbergen", color: "bg-green-500" },
  barbea: { id: "1711", name: "Bar Bea", color: "bg-purple-500" },
  lamour: { id: "2499", name: "L'Amour Toujours", color: "bg-orange-500" },
};

// Date range presets
const DATE_RANGES: Record<DateRangeKey, DateRangePreset> = {
  today: {
    label: "Today",
    getRange: () => ({ from: new Date(), to: new Date() }),
  },
  yesterday: {
    label: "Yesterday",
    getRange: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1),
    }),
  },
  thisWeek: {
    label: "This Week",
    getRange: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }),
  },
  lastWeek: {
    label: "Last Week",
    getRange: () => ({
      from: startOfWeek(subDays(new Date(), 7)),
      to: endOfWeek(subDays(new Date(), 7)),
    }),
  },
  thisMonth: {
    label: "This Month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  lastMonth: {
    label: "Last Month",
    getRange: () => ({
      from: startOfMonth(subDays(new Date(), 30)),
      to: endOfMonth(subDays(new Date(), 30)),
    }),
  },
};

export function useDailyOpsDashboardViewModel() {
  // UI State
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>("total");
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>("today");
  const [dateRange, setDateRange] = useState(DATE_RANGES.today.getRange());

  // Update date range when preset changes
  useEffect(() => {
    setDateRange(DATE_RANGES[selectedDateRange].getRange());
  }, [selectedDateRange]);

  // Prepare query params
  const queryParams = useMemo(
    () => ({
      locationId: selectedLocation === "total" ? undefined : LOCATIONS[selectedLocation].id,
      startDate: dateRange.from.toISOString().split("T")[0],
      endDate: dateRange.to.toISOString().split("T")[0],
    }),
    [selectedLocation, dateRange]
  );

  // Fetch labor data
  const { data: laborData, isLoading: laborLoading } = useQuery({
    queryKey: ["labor-kpis", queryParams],
    queryFn: () => fetchLaborData(queryParams),
    enabled: !!dateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-kpis", queryParams],
    queryFn: () => fetchSalesData(queryParams),
    enabled: !!dateRange,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Calculate combined KPIs
  const kpiData: KPIData | null = useMemo(() => {
    if (!laborData || !salesData) return null;

    return {
      labor: laborData,
      sales: salesData,
      combined: {
        revenuePerWorker:
          laborData.totalWorkers > 0
            ? salesData.totalRevenue / laborData.totalWorkers
            : 0,
        salesProductivity:
          laborData.totalHours > 0
            ? salesData.totalRevenue / laborData.totalHours
            : 0,
        laborEfficiency:
          laborData.laborCost > 0
            ? salesData.totalRevenue / laborData.laborCost
            : 0,
        profitMargin:
          salesData.totalRevenue > 0
            ? ((salesData.totalRevenue - laborData.laborCost) /
                salesData.totalRevenue) *
              100
            : 0,
      },
    };
  }, [laborData, salesData]);

  const isLoading = laborLoading || salesLoading;

  return {
    // State
    selectedLocation,
    setSelectedLocation,
    selectedDateRange,
    setSelectedDateRange,
    dateRange,

    // Data
    laborData,
    salesData,
    kpiData,
    isLoading,

    // Constants
    LOCATIONS,
    DATE_RANGES,
  };
}



