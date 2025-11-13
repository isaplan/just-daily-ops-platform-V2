/**
 * Settings Data Import ViewModel Layer
 * Business logic for data import settings
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchImportConfigs } from "@/lib/services/settings/data-import.service";

export function useDataImportViewModel() {
  const { data: importConfigs, isLoading } = useQuery({
    queryKey: ["import-configs"],
    queryFn: fetchImportConfigs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    importConfigs: importConfigs || [],
    isLoading,
  };
}




