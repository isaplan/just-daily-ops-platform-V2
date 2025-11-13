/**
 * Data Sales ViewModel Layer
 * Business logic for sales data
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSalesData } from "@/lib/services/data/sales.service";

export function useSalesViewModel() {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales-data"],
    queryFn: fetchSalesData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    salesData: salesData || [],
    isLoading,
  };
}




