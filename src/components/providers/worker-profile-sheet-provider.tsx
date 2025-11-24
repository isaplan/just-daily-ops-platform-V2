"use client";

import { WorkerProfileSheetProvider } from "@/contexts/WorkerProfileSheetContext";
import { WorkerProfileSheet } from "@/components/workforce/WorkerProfileSheet";

export function WorkerProfileSheetProviderWithSheet({ children }: { children: React.ReactNode }) {
  return (
    <WorkerProfileSheetProvider>
      {children}
      <WorkerProfileSheet />
    </WorkerProfileSheetProvider>
  );
}


