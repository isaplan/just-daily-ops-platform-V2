/**
 * Data Inventory ViewModel Layer
 * Business logic for inventory data
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInventoryData } from "@/lib/services/data/inventory.service";

export function useInventoryViewModel() {
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ["inventory-data"],
    queryFn: fetchInventoryData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    inventoryData: inventoryData || [],
    isLoading,
  };
}




