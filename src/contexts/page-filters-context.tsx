"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface FilterLabel {
  key: string;
  label: string;
  value: string | number | null;
}

export interface PageFilters {
  labels: FilterLabel[];
  onFilterChange?: (key: string, value: any) => void;
  onFilterRemove?: (key: string) => void;
  filterComponent?: ReactNode;
  filterCardRef?: React.RefObject<HTMLDivElement>;
}

interface PageFiltersContextType {
  filters: PageFilters | null;
  registerFilters: (filters: PageFilters) => void;
  clearFilters: () => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
}

const PageFiltersContext = createContext<PageFiltersContextType | undefined>(undefined);

export function PageFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<PageFilters | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const registerFilters = useCallback((newFilters: PageFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(null);
    setIsFilterOpen(false);
  }, []);

  return (
    <PageFiltersContext.Provider value={{ filters, registerFilters, clearFilters, isFilterOpen, setIsFilterOpen }}>
      {children}
    </PageFiltersContext.Provider>
  );
}

export function usePageFilters() {
  const context = useContext(PageFiltersContext);
  if (!context) {
    throw new Error("usePageFilters must be used within PageFiltersProvider");
  }
  return context;
}


