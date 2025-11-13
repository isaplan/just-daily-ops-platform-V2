"use client";

import { useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { usePageFilters } from "@/contexts/page-filters-context";

interface TopnavFilterDropdownV2Props {
  onActiveFiltersChange?: (filters: Array<{ key: string; label: string; value: string | number | null }>) => void;
}

export function TopnavFilterDropdownV2({ onActiveFiltersChange }: TopnavFilterDropdownV2Props) {
  const { filters, isFilterOpen, setIsFilterOpen } = usePageFilters();
  const callbackRef = useRef(onActiveFiltersChange);
  const prevFiltersKeyRef = useRef<string>("");
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onActiveFiltersChange;
  }, [onActiveFiltersChange]);

  // Notify parent of active filters change (only when filters actually change)
  useEffect(() => {
    if (!filters || !filters.labels) {
      // Clear filters if none exist
      if (prevFiltersKeyRef.current !== "" && callbackRef.current) {
        prevFiltersKeyRef.current = "";
        callbackRef.current([]);
      }
      return;
    }
    
    // Calculate active filters inside the effect
    const activeFilters = filters.labels.filter(
      (filter) => filter.value !== null && filter.value !== "" && filter.value !== "all"
    );
    
    // Create a stable string key for comparison
    const currentFiltersKey = JSON.stringify(activeFilters.map(f => ({ key: f.key, value: f.value })));
    
    // Only call if filters actually changed (compare string keys to avoid infinite loops)
    if (currentFiltersKey !== prevFiltersKeyRef.current) {
      prevFiltersKeyRef.current = currentFiltersKey;
      // Use setTimeout to defer the state update and avoid render conflicts
      if (callbackRef.current) {
        setTimeout(() => {
          callbackRef.current?.(activeFilters);
        }, 0);
      }
    }
  }, [filters?.labels]); // Depend on filters.labels array reference

  // Get active filter labels for rendering (non-default values)
  const activeFilters = !filters || !filters.labels || filters.labels.length === 0
    ? []
    : filters.labels.filter(
        (filter) => filter.value !== null && filter.value !== "" && filter.value !== "all"
      );

  // Toggle filter visibility on page
  const handleToggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
    
    // Scroll to filter card if opening
    if (!isFilterOpen && filters?.filterCardRef?.current) {
      setTimeout(() => {
        filters.filterCardRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="bg-white border-2 border-black rounded-lg h-10 w-10 shadow-none relative"
      onClick={handleToggleFilter}
    >
      <Filter className="h-4 w-4" />
      {activeFilters.length > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
          {activeFilters.length}
        </span>
      )}
    </Button>
  );
}

