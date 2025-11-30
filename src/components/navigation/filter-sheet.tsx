"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePageFilters } from "@/contexts/page-filters-context";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { useIsMobile } from "@/hooks/use-mobile";

const Sheet = SheetPrimitive.Root;

// Custom SheetContent with transparent overlay for push effect
const SheetOverlay = SheetPrimitive.Overlay;
const SheetPortal = SheetPrimitive.Portal;

const sheetContentVariants = cva(
  "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full w-[400px] border-l border-sidebar-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterSheet({ open, onOpenChange }: FilterSheetProps) {
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

  // Mobile: Regular Sheet (overlay)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
          <SheetOverlay className="fixed inset-0 z-40 bg-black/80" />
          <SheetPrimitive.Content 
            className={cn(sheetContentVariants({ side: "right" }), "p-0 overflow-y-auto bg-white")}
          >
            <div className="flex flex-col h-full bg-white">
              {/* Header */}
              <SheetHeader className="sticky top-0 z-10 bg-white border-b border-sidebar-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
                  <SheetPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted"
                      onClick={() => onOpenChange(false)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close filters</span>
                    </Button>
                  </SheetPrimitive.Close>
                </div>
                
                {/* Active Filters */}
                {activeFilters.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <SheetDescription className="text-xs font-medium text-muted-foreground">
                        Active Filters ({activeFilters.length})
                      </SheetDescription>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleClearAll}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                  </div>
                )}
              </SheetHeader>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
                {filters?.filterComponent ? (
                  filters.filterComponent
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No filters available on this page
                  </div>
                )}
              </div>
            </div>
          </SheetPrimitive.Content>
        </SheetPortal>
      </Sheet>
    );
  }

  // Desktop: Resizable panel (rendered separately via FilterResizablePanel)
  // This component only handles mobile sheet, desktop is handled by FilterResizablePanel
  return null;
}
