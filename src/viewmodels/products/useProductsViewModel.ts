/**
 * Products ViewModel Layer
 * Manages product catalog with workload and MEP metrics
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  Product,
  ProductInput,
  ProductUpdateInput,
  ProductFilters 
} from "@/lib/services/graphql/queries";

const ITEMS_PER_PAGE = 50;

export function useProductsViewModel() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWorkloadLevel, setSelectedWorkloadLevel] = useState<string>("all");
  const [selectedMEPLevel, setSelectedMEPLevel] = useState<string>("all");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const queryClient = useQueryClient();

  const filters = useMemo<ProductFilters>(() => {
    const f: ProductFilters = {};
    if (searchTerm) f.search = searchTerm;
    if (selectedCategory !== "all") f.category = selectedCategory;
    if (selectedWorkloadLevel !== "all") f.workloadLevel = selectedWorkloadLevel as 'low' | 'mid' | 'high';
    if (selectedMEPLevel !== "all") f.mepLevel = selectedMEPLevel as 'low' | 'mid' | 'high';
    if (showActiveOnly) f.isActive = true;
    return f;
  }, [searchTerm, selectedCategory, selectedWorkloadLevel, selectedMEPLevel, showActiveOnly]);

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ["products", currentPage, filters],
    queryFn: () => getProducts(currentPage, ITEMS_PER_PAGE, filters),
    staleTime: 30 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductUpdateInput }) => updateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Extract unique categories from products
  const categories = useMemo(() => {
    if (!productsData?.records) return [];
    const cats = new Set<string>();
    productsData.records.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [productsData?.records]);

  return {
    products: productsData?.records || [],
    isLoading,
    error: error as Error | null,
    totalPages: productsData?.totalPages || 0,
    total: productsData?.total || 0,
    currentPage,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedWorkloadLevel,
    setSelectedWorkloadLevel,
    selectedMEPLevel,
    setSelectedMEPLevel,
    showActiveOnly,
    setShowActiveOnly,
    categories,
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

