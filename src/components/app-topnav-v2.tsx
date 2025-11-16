"use client";

import { useState, useEffect, useRef } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, X } from "lucide-react";
import Link from "next/link";
import { TopnavBreadcrumb } from "@/components/navigation/topnav-breadcrumb";
import { TopnavFilterDropdownV2 } from "@/components/navigation/topnav-filter-dropdown-v2";
import { usePageFilters } from "@/contexts/page-filters-context";

interface AppTopnavV2Props {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

interface ActiveFilter {
  key: string;
  label: string;
  value: string | number | null;
}

export function AppTopnavV2({ layoutVersion, onVersionChange }: AppTopnavV2Props) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isFilterCardVisible, setIsFilterCardVisible] = useState(true);
  const { filters, isFilterOpen } = usePageFilters();
  const { state } = useSidebar();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isCollapsed = state === "collapsed";

  // Track filter card visibility with Intersection Observer
  useEffect(() => {
    if (!filters?.filterCardRef?.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsFilterCardVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(filters.filterCardRef.current);

    return () => {
      if (observerRef.current && filters?.filterCardRef?.current) {
        observerRef.current.unobserve(filters.filterCardRef.current);
      }
    };
  }, [filters?.filterCardRef]);

  // Determine if labels should be shown below icons
  // Show labels when: filter is closed OR (filter is open but card is scrolled out of view)
  const shouldShowLabelsBelowIcons = !isFilterOpen || (isFilterOpen && !isFilterCardVisible);

  // Handle filter removal
  const handleFilterRemove = (key: string) => {
    if (filters?.onFilterRemove) {
      filters.onFilterRemove(key);
    }
  };

  return (
    <>
      {/* SidebarTrigger and Breadcrumb - fixed left, account for sidebar */}
      <div 
        className="fixed top-4 z-50 flex items-center gap-2 flex-nowrap transition-all duration-200"
        style={{
          left: isCollapsed ? '1rem' : 'calc(var(--sidebar-width) + 1rem)'
        }}
      >
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <div className="flex-shrink-0">
          <TopnavBreadcrumb />
        </div>
      </div>
      
      {/* Icons - fixed right with background and border */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Icons row */}
        <div className="flex items-center gap-2">
          <TopnavFilterDropdownV2 onActiveFiltersChange={setActiveFilters} />
          
          <Link href="/dashboard">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-white border-2 border-black rounded-lg h-10 w-10 shadow-none"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </Link>
          <div className="bg-white border-2 border-black rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                U
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Active filter labels - shown below icons based on filter state and scroll position */}
        {shouldShowLabelsBelowIcons && activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end max-w-[calc(100vw-var(--sidebar-width)-12rem)]">
            {activeFilters.map((filter) => (
              <div
                key={filter.key}
                className="bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <span className="font-medium text-muted-foreground">{filter.label}:</span>
                <span className="font-semibold">{String(filter.value)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleFilterRemove(filter.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}


