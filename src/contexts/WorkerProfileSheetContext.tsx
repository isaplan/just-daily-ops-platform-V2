/**
 * Worker Profile Sheet Context
 * Global context for managing worker profile sheet state across the application
 */

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { WorkerProfile } from "@/lib/services/graphql/queries";

// Extend WorkerProfile to include teams field
interface WorkerProfileWithTeams extends WorkerProfile {
  teams?: Array<{
    team_id: string;
    team_name: string;
    team_type?: string;
    is_active?: boolean;
  }>;
  teamName?: string | null;
}

interface WorkerProfileSheetContextType {
  selectedWorker: WorkerProfileWithTeams | null;
  isSheetOpen: boolean;
  openWorkerSheet: (worker: WorkerProfileWithTeams) => void;
  closeWorkerSheet: () => void;
}

const WorkerProfileSheetContext = createContext<WorkerProfileSheetContextType | undefined>(undefined);

export function WorkerProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileWithTeams | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openWorkerSheet = useCallback((worker: WorkerProfileWithTeams) => {
    setSelectedWorker(worker);
    setIsSheetOpen(true);
  }, []);

  const closeWorkerSheet = useCallback(() => {
    setIsSheetOpen(false);
    // Keep selectedWorker until sheet animation completes
    setTimeout(() => {
      setSelectedWorker(null);
    }, 300);
  }, []);

  return (
    <WorkerProfileSheetContext.Provider
      value={{
        selectedWorker,
        isSheetOpen,
        openWorkerSheet,
        closeWorkerSheet,
      }}
    >
      {children}
    </WorkerProfileSheetContext.Provider>
  );
}

export function useWorkerProfileSheet() {
  const context = useContext(WorkerProfileSheetContext);
  if (context === undefined) {
    throw new Error("useWorkerProfileSheet must be used within a WorkerProfileSheetProvider");
  }
  return context;
}


