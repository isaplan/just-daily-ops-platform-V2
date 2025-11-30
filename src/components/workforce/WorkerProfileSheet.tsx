/**
 * Worker Profile Sheet Component
 * Mobile-only sheet component (desktop uses ResizablePanel)
 */

"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkerProfileSheetContent } from "./WorkerProfileSheetContent";
import { cn } from "@/lib/utils";

export function WorkerProfileSheet() {
  const { selectedWorker, isSheetOpen, closeWorkerSheet } = useWorkerProfileSheet();
  const isMobile = useIsMobile();

  if (!selectedWorker) return null;

  // Desktop: Resizable panel handles this (rendered separately via WorkerProfileResizablePanel)
  // This component only handles mobile sheet
  if (!isMobile) {
    return null;
  }

  // Mobile: Regular Sheet (overlay)
  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && closeWorkerSheet()}>
      <SheetContent className={cn("w-[400px] p-0 overflow-hidden bg-white border-l border-sidebar-border")}>
        {/* Accessibility: Visually hidden title for screen readers */}
        <SheetTitle className="sr-only">
          {selectedWorker.userName || `User ${selectedWorker.eitjeUserId}`} - Worker Profile
        </SheetTitle>
        <div className="flex flex-col h-full bg-white">
          <WorkerProfileSheetContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
