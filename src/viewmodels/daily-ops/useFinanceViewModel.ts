/**
 * Daily Ops Finance ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPnLDataForComparison } from "@/lib/services/daily-ops/finance.service";
import {
  AggregatedPnLRecord,
  KpiData,
  LocationOption,
  MonthOption,
  MetricType,
  ChartType,
  TimeGranularity,
  FinanceDashboardQueryParams,
} from "@/models/daily-ops/finance.model";

const MONTHS: MonthOption[] = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

const LOCATIONS: LocationOption[] = [
  { value: "all", label: "All Locations" },
  { value: "550e8400-e29b-41d4-a716-446655440001", label: "Van Kinsbergen" },
  { value: "550e8400-e29b-41d4-a716-446655440002", label: "Bar Bea" },
  { value: "550e8400-e29b-41d4-a716-446655440003", label: "L'Amour Toujours" },
];

export interface UseFinanceViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedLocation: string;
  selectedMetric: MetricType;
  chartType: ChartType;
  xAxisGranularity: TimeGranularity;
  availableMonths: number[];

  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedMetric: (metric: MetricType) => void;
  setChartType: (type: ChartType) => void;
  setXAxisGranularity: (granularity: TimeGranularity) => void;

  // Constants
  months: MonthOption[];
  locations: LocationOption[];
  currentYear: number;

  // Data
  data: AggregatedPnLRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;

  // Calculated KPIs (memoized)
  revenueKpi: KpiData | null;
  costOfSalesKpi: KpiData | null;
  laborKpi: KpiData | null;
  otherCostsKpi: KpiData | null;
  resultaatKpi: KpiData | null;
  grossProfitKpi: KpiData | null;
  ebitdaKpi: KpiData | null;
  grossMarginKpi: KpiData | null;
  laborCostPercentageKpi: KpiData | null;

  // Chart data
  chartDateRange: { start: Date; end: Date };

  // Utilities
  formatCurrency: (value: number) => string;
  getMostRecentMonth: () => { month: number; year: number };
  getMonthName: (month: number) => string;
  clearFilters: () => void;
}

/**
 * Calculate KPI data from aggregated records
 */
function calculateKpi(
  data: AggregatedPnLRecord[],
  selectedYear: number,
  selectedMonth: number | null,
  getValue: (record: AggregatedPnLRecord) => number,
  inverse: boolean = false
): KpiData | null {
  if (!data || data.length === 0) return null;

  // Filter data by selected month if specified
  let filteredData = data;
  if (selectedMonth !== null) {
    filteredData = data.filter(
      (d) => d.month === selectedMonth && d.year === selectedYear
    );
  }

  // Group data by month and aggregate values
  const dataByMonth = new Map<string, number>();
  filteredData.forEach((d) => {
    const key = `${d.year}-${d.month}`;
    const currentValue = dataByMonth.get(key) || 0;
    dataByMonth.set(key, currentValue + getValue(d));
  });

  // Get all months sorted by date (most recent first)
  const sortedMonths = Array.from(dataByMonth.entries())
    .map(([key, value]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, value, key };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  if (sortedMonths.length === 0) return null;

  // If a specific month is selected, use that month's value
  // Otherwise, use the most recent month
  let lastMonthEntry;
  if (selectedMonth !== null) {
    lastMonthEntry = sortedMonths.find(
      (m) => m.month === selectedMonth && m.year === selectedYear
    );
    if (!lastMonthEntry) return null;
  } else {
    lastMonthEntry = sortedMonths[0];
  }

  const lastMonthValue = lastMonthEntry.value;

  // Get 6 months PRIOR to last month (exclude last month from average)
  const monthsForAverage = sortedMonths
    .filter((m) => {
      // Exclude the selected/last month
      if (selectedMonth !== null) {
        return !(m.month === selectedMonth && m.year === selectedYear);
      }
      return m.key !== lastMonthEntry.key;
    })
    .slice(0, 6); // Take up to 6 months

  const sixMonthTotal = monthsForAverage.reduce((sum, m) => sum + m.value, 0);
  const sixMonthAverage =
    monthsForAverage.length > 0 ? sixMonthTotal / monthsForAverage.length : 0;

  const difference = lastMonthValue - sixMonthAverage;
  const percentageChange =
    sixMonthAverage !== 0
      ? (difference / Math.abs(sixMonthAverage)) * 100
      : 0;

  // For costs, positive change is bad (costs increased)
  // For revenue and resultaat, positive change is good
  const isPositive = inverse ? difference < 0 : difference > 0;

  return {
    lastMonth: lastMonthValue,
    sixMonthAverage,
    percentageChange,
    isPositive,
  };
}

export function useFinanceViewModel(): UseFinanceViewModelReturn {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);

  // Chart state
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("revenue");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [xAxisGranularity, setXAxisGranularity] =
    useState<TimeGranularity>("month");

  // Query params (memoized to prevent unnecessary refetches)
  const queryParams = useMemo<FinanceDashboardQueryParams>(
    () => ({
      year: selectedYear,
      location: selectedLocation,
      month: selectedMonth,
    }),
    [selectedYear, selectedLocation, selectedMonth]
  );

  // Fetch data based on selected filters
  const { data, isLoading, error } = useQuery({
    queryKey: ["pnl-dashboard", queryParams],
    queryFn: async () => {
      const { currentYear: currentYearData, previousYear: previousYearData } =
        await fetchPnLDataForComparison(queryParams);

      // Combine both years' data
      const allData = [...currentYearData, ...previousYearData];

      // Extract available months from the data
      if (allData.length > 0) {
        const months = [
          ...new Set(allData.map((item) => item.month)),
        ] as number[];
        months.sort((a, b) => a - b);
        setAvailableMonths(months);
      }

      return allData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Calculate KPIs (memoized for performance)
  const revenueKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            selectedYear,
            selectedMonth,
            (d) => d.revenue_total || 0
          )
        : null,
    [data, selectedYear, selectedMonth]
  );

  const costOfSalesKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            selectedYear,
            selectedMonth,
            (d) =>
              Math.abs(
                d.cost_of_sales_total || d.inkoopwaarde_handelsgoederen || 0
              ),
            true
          )
        : null,
    [data, selectedYear, selectedMonth]
  );

  const laborKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            selectedYear,
            selectedMonth,
            (d) => Math.abs(d.labor_total || d.lonen_en_salarissen || 0),
            true
          )
        : null,
    [data, selectedYear, selectedMonth]
  );

  const otherCostsKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            selectedYear,
            selectedMonth,
            (d) =>
              Math.abs(
                d.other_costs_total || d.overige_bedrijfskosten || 0
              ),
            true
          )
        : null,
    [data, selectedYear, selectedMonth]
  );

  const resultaatKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            selectedYear,
            selectedMonth,
            (d) => d.resultaat || 0
          )
        : null,
    [data, selectedYear, selectedMonth]
  );

  // Calculate additional KPIs (memoized)
  const grossProfitKpi = useMemo(() => {
    if (!revenueKpi || !costOfSalesKpi) return null;
    const lastMonth = revenueKpi.lastMonth - costOfSalesKpi.lastMonth;
    const avg =
      revenueKpi.sixMonthAverage - costOfSalesKpi.sixMonthAverage;
    const difference = lastMonth - avg;
    const percentageChange = avg !== 0 ? (difference / Math.abs(avg)) * 100 : 0;
    return {
      lastMonth,
      sixMonthAverage: avg,
      percentageChange,
      isPositive: difference > 0,
    };
  }, [revenueKpi, costOfSalesKpi]);

  const ebitdaKpi = useMemo(() => {
    if (!grossProfitKpi || !laborKpi || !otherCostsKpi) return null;
    const lastMonth =
      grossProfitKpi.lastMonth - laborKpi.lastMonth - otherCostsKpi.lastMonth;
    const avg =
      grossProfitKpi.sixMonthAverage -
      laborKpi.sixMonthAverage -
      otherCostsKpi.sixMonthAverage;
    const difference = lastMonth - avg;
    const percentageChange = avg !== 0 ? (difference / Math.abs(avg)) * 100 : 0;
    return {
      lastMonth,
      sixMonthAverage: avg,
      percentageChange,
      isPositive: difference > 0,
    };
  }, [grossProfitKpi, laborKpi, otherCostsKpi]);

  const grossMarginKpi = useMemo(() => {
    if (!revenueKpi || !costOfSalesKpi) return null;
    const lastMonth =
      revenueKpi.lastMonth !== 0
        ? ((revenueKpi.lastMonth - costOfSalesKpi.lastMonth) /
            revenueKpi.lastMonth) *
          100
        : 0;
    const avg =
      revenueKpi.sixMonthAverage !== 0
        ? ((revenueKpi.sixMonthAverage - costOfSalesKpi.sixMonthAverage) /
            revenueKpi.sixMonthAverage) *
          100
        : 0;
    const difference = lastMonth - avg;
    return {
      lastMonth,
      sixMonthAverage: avg,
      percentageChange: difference,
      isPositive: difference > 0,
    };
  }, [revenueKpi, costOfSalesKpi]);

  const laborCostPercentageKpi = useMemo(() => {
    if (!revenueKpi || !laborKpi) return null;
    const lastMonth =
      revenueKpi.lastMonth !== 0
        ? (laborKpi.lastMonth / revenueKpi.lastMonth) * 100
        : 0;
    const avg =
      revenueKpi.sixMonthAverage !== 0
        ? (laborKpi.sixMonthAverage / revenueKpi.sixMonthAverage) * 100
        : 0;
    const difference = lastMonth - avg;
    // For labor cost %, lower is better (inverse)
    return {
      lastMonth,
      sixMonthAverage: avg,
      percentageChange: difference,
      isPositive: difference < 0,
    };
  }, [revenueKpi, laborKpi]);

  // Calculate date range for charts (memoized)
  const chartDateRange = useMemo(() => {
    // selectedMonth is 1-indexed (1=Jan, 12=Dec), but Date constructor uses 0-indexed (0=Jan, 11=Dec)
    // To get last day of selected month: new Date(year, month, 0) where month is 1-indexed
    // Example: selectedMonth=9 (Sep) -> new Date(2025, 9, 0) = Sep 30, 2025 ✅
    let endDate: Date;
    if (selectedMonth) {
      // Get last day of selected month
      // selectedMonth is 1-indexed, so we use it directly: new Date(year, month, 0) gives last day of that month
      endDate = new Date(selectedYear, selectedMonth, 0);
      // Ensure we're at end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // End of selected year (Dec 31)
      endDate = new Date(selectedYear, 11, 31);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // For chart, show last 12 months from the end date (inclusive)
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 11); // 12 months back
    startDate.setDate(1); // Start from first day of the start month
    startDate.setHours(0, 0, 0, 0); // Start of day
    
    return { start: startDate, end: endDate };
  }, [selectedYear, selectedMonth]);

  // Utility functions (memoized with useCallback)
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const getMostRecentMonth = useCallback(() => {
    if (!data || data.length === 0) return { month: 0, year: 0 };

    const sortedData = [...data].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    if (sortedData.length > 0) {
      return { month: sortedData[0].month, year: sortedData[0].year };
    }
    return { month: 0, year: 0 };
  }, [data]);

  const getMonthName = useCallback((month: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || `Month ${month}`;
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedYear(currentYear);
    setSelectedMonth(null);
    setSelectedLocation("all");
  }, [currentYear]);

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedLocation,
    selectedMetric,
    chartType,
    xAxisGranularity,
    availableMonths,

    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedLocation,
    setSelectedMetric,
    setChartType,
    setXAxisGranularity,

    // Constants
    months: MONTHS,
    locations: LOCATIONS,
    currentYear,

    // Data
    data,
    isLoading,
    error: error as Error | null,

    // KPIs
    revenueKpi,
    costOfSalesKpi,
    laborKpi,
    otherCostsKpi,
    resultaatKpi,
    grossProfitKpi,
    ebitdaKpi,
    grossMarginKpi,
    laborCostPercentageKpi,

    // Chart data
    chartDateRange,

    // Utilities
    formatCurrency,
    getMostRecentMonth,
    getMonthName,
    clearFilters,
  };
}


