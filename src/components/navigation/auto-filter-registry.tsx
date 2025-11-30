"use client";

import { useEffect, useRef, ReactNode, useMemo } from "react";
import { usePageFilters, FilterLabel } from "@/contexts/page-filters-context";

interface AutoFilterRegistryProps {
  children: ReactNode;
  filters: {
    labels: FilterLabel[];
    onFilterChange?: (key: string, value: any) => void;
    onFilterRemove?: (key: string) => void;
  };
  hideInPage?: boolean; // Hide filters from page content when true (default: true)
}

/**
 * Automatically registers filters with PageFiltersContext
 * Wraps filter components and registers them automatically
 * When hideInPage is true (default), filters are hidden from page content but still registered for Sheet display
 */
export function AutoFilterRegistry({ children, filters, hideInPage = true }: AutoFilterRegistryProps) {
  const { registerFilters } = usePageFilters();
  const filterRef = useRef<HTMLDivElement>(null);

  // Create a stable string key from labels to track changes
  const labelsKey = useMemo(() => {
    return JSON.stringify(filters.labels.map(f => ({ key: f.key, value: f.value })));
  }, [filters.labels]);

  // Register filters automatically
  useEffect(() => {
    registerFilters({
      labels: filters.labels,
      onFilterChange: filters.onFilterChange,
      onFilterRemove: filters.onFilterRemove,
      filterComponent: children,
      filterCardRef: filterRef,
    });

    // Cleanup on unmount
    return () => {
      registerFilters({
        labels: [],
        filterComponent: null,
        filterCardRef: null,
      });
    };
    // Use labelsKey instead of filters.labels to avoid array length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsKey, filters.onFilterChange, filters.onFilterRemove, registerFilters]);

  // Hide filters from page when hideInPage is true (they'll show in Sheet instead)
  return (
    <div ref={filterRef} className={hideInPage ? "hidden" : ""}>
      {children}
    </div>
  );
}

