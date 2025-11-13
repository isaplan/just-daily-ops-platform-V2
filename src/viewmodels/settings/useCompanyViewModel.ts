/**
 * Settings Company ViewModel Layer
 * Business logic for company settings
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanySettings } from "@/lib/services/settings/company.service";

export function useCompanyViewModel() {
  const { data: companySettings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: fetchCompanySettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    companySettings,
    isLoading,
  };
}




