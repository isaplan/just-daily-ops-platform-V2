/**
 * Lazy Loading Hook for Category Products
 * Loads products only when category is expanded
 * Uses React Query for caching and automatic refetching
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCategoryProducts } from '@/lib/services/sales/categories-products.service';
import { CategoryAggregate } from '@/lib/services/graphql/queries';

interface UseLazyCategoryProductsProps {
  startDate: string;
  endDate: string;
  filters?: {
    locationId?: string;
    productName?: string;
  };
}

export function useLazyCategoryProducts({ startDate, endDate, filters }: UseLazyCategoryProductsProps) {
  const queryClient = useQueryClient();

  // Load products for a specific category (using React Query for caching)
  const loadCategory = useCallback(async (categoryName: string): Promise<CategoryAggregate | null> => {
    const queryKey = ['category-products', categoryName, startDate, endDate, filters?.locationId, filters?.productName];
    
    // Check if already cached
    const cached = queryClient.getQueryData<CategoryAggregate>(queryKey);
    if (cached) {
      return cached;
    }

    // Fetch and cache
    try {
      const categoryData = await fetchCategoryProducts(categoryName, {
        startDate,
        endDate,
        locationId: filters?.locationId || 'all',
        productName: filters?.productName,
      });

      // Cache with React Query (30 minute stale time)
      queryClient.setQueryData(queryKey, categoryData);
      return categoryData;
    } catch (error: any) {
      // Ignore AbortError - expected when requests are cancelled (e.g., by React Query)
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        // Return null - the request was cancelled, which is fine
        return null;
      }
      console.error(`Error loading products for category ${categoryName}:`, error);
      return null;
    }
  }, [startDate, endDate, filters?.locationId, filters?.productName, queryClient]);

  // Prefetch next categories in background
  const prefetchNextCategories = useCallback((currentCategory: string, allCategories: string[]) => {
    const currentIndex = allCategories.indexOf(currentCategory);
    if (currentIndex === -1) return;

    // Prefetch next 3 categories
    const nextCategories = allCategories.slice(currentIndex + 1, currentIndex + 4);
    
    // Use requestIdleCallback or setTimeout for background prefetch
    const prefetchFn = () => {
      nextCategories.forEach(categoryName => {
        const queryKey = ['category-products', categoryName, startDate, endDate, filters?.locationId, filters?.productName];
        const cached = queryClient.getQueryData<CategoryAggregate>(queryKey);
        if (!cached) {
          // Prefetch using React Query
          queryClient.prefetchQuery({
            queryKey,
            queryFn: () => fetchCategoryProducts(categoryName, {
              startDate,
              endDate,
              locationId: filters?.locationId || 'all',
              productName: filters?.productName,
            }),
            staleTime: 30 * 60 * 1000, // 30 minutes
          }).catch((error: any) => {
            // Silently fail - prefetch is best effort
            // Ignore AbortError - expected when requests are cancelled
            if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
              // Only log non-abort errors
              console.debug(`Prefetch cancelled for ${categoryName}`);
            }
          });
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(prefetchFn);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(prefetchFn, 1000);
    }
  }, [startDate, endDate, filters?.locationId, filters?.productName, queryClient]);

  // Get cached category products
  const getCategoryProducts = useCallback((categoryName: string): CategoryAggregate | null => {
    const queryKey = ['category-products', categoryName, startDate, endDate, filters?.locationId, filters?.productName];
    return queryClient.getQueryData<CategoryAggregate>(queryKey) || null;
  }, [startDate, endDate, filters?.locationId, filters?.productName, queryClient]);

  // Check if category is loaded
  const isCategoryLoaded = useCallback((categoryName: string): boolean => {
    const queryKey = ['category-products', categoryName, startDate, endDate, filters?.locationId, filters?.productName];
    return !!queryClient.getQueryData<CategoryAggregate>(queryKey);
  }, [startDate, endDate, filters?.locationId, filters?.productName, queryClient]);

  // Clear cache (useful when date range changes)
  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['category-products'] });
  }, [queryClient]);

  return {
    loadCategory,
    getCategoryProducts,
    isCategoryLoaded,
    prefetchNextCategories,
    clearCache,
  };
}

