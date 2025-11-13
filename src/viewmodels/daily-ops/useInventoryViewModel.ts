/**
 * Daily Ops Inventory ViewModel Layer
 * Business logic for inventory page
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInventoryItems } from "@/lib/services/daily-ops/inventory.service";

export function useInventoryViewModel() {
  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: fetchInventoryItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    inventoryItems: inventoryItems || [],
    isLoading,
  };
}




