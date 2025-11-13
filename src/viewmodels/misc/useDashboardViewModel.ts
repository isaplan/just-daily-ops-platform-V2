/**
 * Dashboard ViewModel Layer
 * Business logic for dashboard pages
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDashboardKpis } from "@/lib/services/misc/dashboard.service";

export function useDashboardViewModel() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    kpis: kpis || [],
    isLoading,
  };
}



