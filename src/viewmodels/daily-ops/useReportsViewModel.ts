/**
 * Daily Ops Reports ViewModel Layer
 * Business logic for reports page
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReportOptions } from "@/lib/services/daily-ops/reports.service";

export function useReportsViewModel() {
  const { data: reportOptions, isLoading } = useQuery({
    queryKey: ["report-options"],
    queryFn: fetchReportOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    reportOptions: reportOptions || [],
    isLoading,
  };
}




