"use client";

import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkerProfileSheetContent } from "./WorkerProfileSheetContent";

interface WorkerProfileResizablePanelProps {
  children: React.ReactNode;
}

export function WorkerProfileResizablePanel({ children }: WorkerProfileResizablePanelProps) {
  const { selectedWorker, isSheetOpen, closeWorkerSheet } = useWorkerProfileSheet();
  const isMobile = useIsMobile();

  // Mobile: Don't use resizable panels, use regular sheet
  if (isMobile) {
    return <>{children}</>;
  }

  // Desktop: Use resizable panels when worker sheet is open
  if (isSheetOpen && selectedWorker) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={70} minSize={30} className="min-w-0 flex flex-col">
          {children}
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle withHandle className="bg-sidebar-border w-1 hover:w-2 transition-all cursor-col-resize" />

        {/* Worker Profile Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="bg-white border-l border-sidebar-border flex flex-col overflow-hidden">
          <WorkerProfileSheetContent />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Desktop: No worker sheet open, just render children
  return <>{children}</>;
}











