/**
 * Operations Suppliers ViewModel Layer
 * Business logic for suppliers management
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers } from "@/lib/services/operations/suppliers.service";

export function useSuppliersViewModel() {
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    suppliers: suppliers || [],
    isLoading,
  };
}




