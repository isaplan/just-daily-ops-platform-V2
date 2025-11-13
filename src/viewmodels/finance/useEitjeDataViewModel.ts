/**
 * Finance Eitje Data ViewModel Layer
 * Business logic for Eitje data pages
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEitjeDataOverview } from "@/lib/services/finance/eitje-data.service";

export function useEitjeDataViewModel() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["eitje-data-overview"],
    queryFn: fetchEitjeDataOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    overview: overview || {
      totalRecords: 0,
      lastSync: new Date().toISOString(),
      dataSources: [],
    },
    isLoading,
  };
}




