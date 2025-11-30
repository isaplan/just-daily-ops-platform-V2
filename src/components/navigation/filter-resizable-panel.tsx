"use client";

import { usePageFilters } from "@/contexts/page-filters-context";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterResizablePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function FilterResizablePanel({ open, onOpenChange, children }: FilterResizablePanelProps) {
  const { filters } = usePageFilters();
  const isMobile = useIsMobile();

  // Get active filters
  const activeFilters = !filters || !filters.labels || filters.labels.length === 0
    ? []
    : filters.labels.filter(
        (filter) => filter.value !== null && filter.value !== "" && filter.value !== "all"
      );

  // Handle filter removal
  const handleFilterRemove = (key: string) => {
    if (filters?.onFilterRemove) {
      filters.onFilterRemove(key);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    if (filters?.labels) {
      filters.labels.forEach((filter) => {
        if (filters.onFilterRemove && filter.value !== null && filter.value !== "" && filter.value !== "all") {
          filters.onFilterRemove(filter.key);
        }
      });
    }
  };

  // Mobile: Don't use resizable panels, use regular sheet
  if (isMobile) {
    return <>{children}</>;
  }

  // Desktop: Use resizable panels when filter is open
  if (open && filters?.filterComponent) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={70} minSize={30} className="min-w-0 flex flex-col">
          {children}
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle withHandle className="bg-sidebar-border w-1 hover:w-2 transition-all cursor-col-resize" />

        {/* Filter Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="bg-white border-l border-sidebar-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-sidebar-border px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close filters</span>
              </Button>
            </div>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
            {filters.filterComponent}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Desktop: No filter open, just render children
  return <>{children}</>;
}

