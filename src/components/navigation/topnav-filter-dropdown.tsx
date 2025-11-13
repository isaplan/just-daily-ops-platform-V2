"use client";

import { useState, useEffect, useRef } from "react";
import { usePageFilters } from "@/contexts/page-filters-context";
import { Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TopnavFilterDropdownProps {
  onActiveFiltersChange?: (filters: Array<{ key: string; label: string; value: string | number | null }>) => void;
}

export function TopnavFilterDropdown({ onActiveFiltersChange }: TopnavFilterDropdownProps) {
  const { filters } = usePageFilters();
  const [isOpen, setIsOpen] = useState(false);
  const callbackRef = useRef(onActiveFiltersChange);
  const prevActiveFiltersRef = useRef<string>("");

  // Always show filter button (even if no filters registered yet)
  // This allows testing the functionality
  const hasFilters = filters && filters.labels.length > 0;

  // Get active filter labels (non-default values)
  const activeFilters = hasFilters
    ? filters.labels.filter(
        (filter) => filter.value !== null && filter.value !== "" && filter.value !== "all"
      )
    : [];

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onActiveFiltersChange;
  }, [onActiveFiltersChange]);

  // Notify parent of active filters change (only when filters actually change)
  useEffect(() => {
    // Create a stable string representation to compare
    const currentFiltersKey = JSON.stringify(activeFilters.map(f => ({ key: f.key, value: f.value })));
    
    // Only call if filters actually changed
    if (currentFiltersKey !== prevActiveFiltersRef.current && callbackRef.current) {
      prevActiveFiltersRef.current = currentFiltersKey;
      callbackRef.current(activeFilters);
    }
  }, [activeFilters]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white border-2 border-black rounded-lg h-10 w-10 shadow-none relative"
        >
          <Filter className="h-4 w-4" />
          {activeFilters.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-var(--sidebar-width)-12rem)] max-w-5xl bg-white border-2 border-black rounded-lg p-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Filters</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!hasFilters ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No filters available. Pages can register filters using the PageFiltersContext.
            </div>
          ) : (
            <>
              {/* Filter Labels (shown when closed) */}
              {activeFilters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Active Filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <div
                        key={filter.key}
                        className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <span className="font-medium">{filter.label}:</span>
                        <span>{String(filter.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Component (when open) */}
              {isOpen && filters.filterComponent && (
                <ScrollArea className="max-h-96">
                  {filters.filterComponent}
                </ScrollArea>
              )}

              {/* Filter Labels List (when open) */}
              {isOpen && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">All Filters:</p>
                  <div className="space-y-1">
                    {filters.labels.map((filter) => (
                      <div
                        key={filter.key}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">{filter.label}:</span>
                        <span className="font-medium">
                          {filter.value !== null && filter.value !== "" && filter.value !== "all"
                            ? String(filter.value)
                            : "All"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

