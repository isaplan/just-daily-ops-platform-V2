"use client";

import { useEffect } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePageFilters } from "@/contexts/page-filters-context";
import { cn } from "@/lib/utils";

const Drawer = ({ shouldScaleBackground = false, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);

const DrawerPortal = DrawerPrimitive.Portal;
const DrawerOverlay = DrawerPrimitive.Overlay;
const DrawerClose = DrawerPrimitive.Close;

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDrawer({ open, onOpenChange }: FilterDrawerProps) {
  const { filters } = usePageFilters();

  // Responsively resize content when drawer is open (shrink height using max-height)
  useEffect(() => {
    // Only resize if filters are registered AND drawer is open
    if (!filters || !filters.filterComponent || !open) {
      // Reset if closing or no filters
      const mainContent = document.querySelector("main") || document.querySelector("[role='main']");
      if (mainContent) {
        (mainContent as HTMLElement).style.maxHeight = "";
        (mainContent as HTMLElement).style.height = "";
        (mainContent as HTMLElement).style.transition = "";
      }
      return;
    }

    const mainContent = document.querySelector("main") || document.querySelector("[role='main']");
    if (!mainContent) return;

    const mainElement = mainContent as HTMLElement;
    const drawerHeightPercent = 80; // 80vh

    if (open) {
      // Shrink height responsively using calc() - content will resize to fit
      mainElement.style.transition = "max-height 0.3s ease-in-out, height 0.3s ease-in-out";
      mainElement.style.maxHeight = `calc(100vh - ${drawerHeightPercent}vh)`;
      mainElement.style.height = `calc(100vh - ${drawerHeightPercent}vh)`;
    } else {
      // Reset to full height
      mainElement.style.maxHeight = "";
      mainElement.style.height = "";
    }

    return () => {
      // Cleanup on unmount
      if (mainElement) {
        mainElement.style.maxHeight = "";
        mainElement.style.height = "";
        mainElement.style.transition = "";
      }
    };
  }, [open, filters]);

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        {/* Transparent overlay for push effect */}
        <DrawerOverlay className="fixed inset-0 z-40 bg-transparent pointer-events-none" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border-t border-sidebar-border bg-white max-h-[80vh]",
          )}
        >
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
          <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <DrawerHeader className="border-b border-sidebar-border bg-white">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg font-semibold">Filters</DrawerTitle>
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close filters</span>
                  </Button>
                </DrawerClose>
              </div>
              
              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <DrawerDescription className="text-xs font-medium text-muted-foreground">
                      Active Filters ({activeFilters.length})
                    </DrawerDescription>
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
            </DrawerHeader>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
              {filters?.filterComponent ? (
                filters.filterComponent
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No filters available on this page
                </div>
              )}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  );
}

