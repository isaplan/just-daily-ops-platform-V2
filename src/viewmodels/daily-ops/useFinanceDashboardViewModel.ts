/**
 * Daily Ops Finance Dashboard ViewModel Layer
 * Business logic for finance dashboard (last 6 months view)
 */

"use client";

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPnLAggregatedData } from "@/lib/services/daily-ops/finance.service";
import { AggregatedPnLRecord, KpiData } from "@/models/daily-ops/finance.model";

/**
 * Calculate KPI data from aggregated records
 */
function calculateKpi(
  data: AggregatedPnLRecord[],
  lastMonthYear: number,
  lastMonth: number,
  getValue: (record: AggregatedPnLRecord) => number,
  inverse: boolean = false
): KpiData | null {
  if (!data || data.length === 0) return null;

  // Get last month data
  const sortedData = [...data].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const lastMonthData = sortedData.filter(
    (d) => d.year === lastMonthYear && d.month === lastMonth
  );
  const lastMonthValue = lastMonthData.reduce(
    (sum, d) => sum + getValue(d),
    0
  );

  // Calculate 6-month average
  const sixMonthData = sortedData.slice(0, 6);
  const sixMonthTotal = sixMonthData.reduce((sum, d) => sum + getValue(d), 0);
  const sixMonthAverage = sixMonthTotal / Math.max(sixMonthData.length, 1);

  const difference = lastMonthValue - sixMonthAverage;
  const percentageChange =
    sixMonthAverage !== 0 ? (difference / Math.abs(sixMonthAverage)) * 100 : 0;

  const isPositive = inverse ? difference < 0 : difference > 0;

  return {
    lastMonth: lastMonthValue,
    sixMonthAverage,
    percentageChange,
    isPositive,
  };
}

export function useFinanceDashboardViewModel() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Calculate last month
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Calculate months to fetch
  const monthsToFetch = useMemo(() => {
    const months: Array<{ year: number; month: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let month = lastMonth - i;
      let year = lastMonthYear;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      months.push({ year, month });
    }
    return months;
  }, [lastMonth, lastMonthYear]);

  // Fetch data for last 6 months
  const { data, isLoading, error } = useQuery({
    queryKey: ["pnl-dashboard", lastMonthYear, lastMonth],
    queryFn: async () => {
      const allData: AggregatedPnLRecord[] = [];
      
      // Fetch data for each month in parallel
      const fetchPromises = monthsToFetch.map(({ year, month }) =>
        fetchPnLAggregatedData({
          year,
          location: "all",
          month,
        })
      );
      
      const results = await Promise.all(fetchPromises);
      results.forEach((monthData) => {
        allData.push(...monthData);
      });

      return allData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate KPIs (memoized)
  const revenueKpi = useMemo(
    () =>
      data
        ? calculateKpi(data, lastMonthYear, lastMonth, (d) => d.revenue_total || 0)
        : null,
    [data, lastMonthYear, lastMonth]
  );

  const costOfSalesKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            lastMonthYear,
            lastMonth,
            (d) =>
              Math.abs(
                d.cost_of_sales_total || d.inkoopwaarde_handelsgoederen || 0
              ),
            true
          )
        : null,
    [data, lastMonthYear, lastMonth]
  );

  const laborKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            lastMonthYear,
            lastMonth,
            (d) => Math.abs(d.labor_total || d.lonen_en_salarissen || 0),
            true
          )
        : null,
    [data, lastMonthYear, lastMonth]
  );

  const otherCostsKpi = useMemo(
    () =>
      data
        ? calculateKpi(
            data,
            lastMonthYear,
            lastMonth,
            (d) =>
              Math.abs(
                d.other_costs_total || d.overige_bedrijfskosten || 0
              ),
            true
          )
        : null,
    [data, lastMonthYear, lastMonth]
  );

  const resultaatKpi = useMemo(
    () =>
      data
        ? calculateKpi(data, lastMonthYear, lastMonth, (d) => d.resultaat || 0)
        : null,
    [data, lastMonthYear, lastMonth]
  );

  // Utility functions (memoized)
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

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

  return {
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
    
    // Utilities
    formatCurrency,
    getMonthName,
    lastMonth,
    lastMonthYear,
  };
}




