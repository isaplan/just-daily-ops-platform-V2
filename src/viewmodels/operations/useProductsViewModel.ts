/**
 * Operations Products ViewModel Layer
 * Business logic for products management
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/services/operations/products.service";

export function useProductsViewModel() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    products: products || [],
    isLoading,
  };
}




