/**
 * View Data ViewModel Layer
 * Business logic for view data pages
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchViewDataOverview } from "@/lib/services/misc/view-data.service";

export function useViewDataViewModel() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["view-data-overview"],
    queryFn: fetchViewDataOverview,
    staleTime: 10 * 60 * 1000, // 10 minutes - static data
  });

  return {
    overview: overview || {
      dataSources: [],
    },
    isLoading,
  };
}



