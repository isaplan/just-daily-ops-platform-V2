"use client";

import { WorkerProfileSheetProvider } from "@/contexts/WorkerProfileSheetContext";
import { WorkerProfileSheet } from "@/components/workforce/WorkerProfileSheet";
import { WorkerProfileResizablePanel } from "@/components/workforce/worker-profile-resizable-panel";

export function WorkerProfileSheetProviderWithSheet({ children }: { children: React.ReactNode }) {
  return (
    <WorkerProfileSheetProvider>
      <WorkerProfileResizablePanel>
        {children}
      </WorkerProfileResizablePanel>
      <WorkerProfileSheet />
    </WorkerProfileSheetProvider>
  );
}


