import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Optimized query hook with automatic memoization
 */
export function useOptimizedQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
) {
  // Use queryKey directly - React Query handles memoization internally
  // Don't use JSON.stringify in dependency arrays as it's not stable
  return useQuery<TData, TError>({
    ...options,
    queryKey: options.queryKey,
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
  });
}
