/**
 * Finance Daily Ops ViewModel Layer
 * Business logic for daily ops finance pages
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDailyOpsKpis, fetchDailyOpsTrends } from "@/lib/services/finance/daily-ops.service";

export interface UseDailyOpsViewModelOptions {
  page: "kpis" | "trends" | "productivity" | "insights";
}

export function useDailyOpsViewModel(options: UseDailyOpsViewModelOptions) {
  const { page } = options;
  const [selectedLocation, setSelectedLocation] = useState<string>("total");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("today");

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["daily-ops-kpis", selectedLocation, selectedDateRange],
    queryFn: fetchDailyOpsKpis,
    enabled: page === "kpis",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["daily-ops-trends", selectedLocation, selectedDateRange],
    queryFn: fetchDailyOpsTrends,
    enabled: page === "trends" || page === "productivity",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    selectedLocation,
    selectedDateRange,
    setSelectedLocation,
    setSelectedDateRange,
    kpis: kpis || [],
    trends: trends || [],
    isLoading: kpisLoading || trendsLoading,
  };
}




