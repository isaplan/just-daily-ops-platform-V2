/**
 * Worker Profile Sheet Context
 * Global context for managing worker profile sheet state across the application
 */

"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
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
  saveCurrentWorker: () => Promise<void>;
  registerSaveCallback: (callback: () => Promise<void>) => void;
}

const WorkerProfileSheetContext = createContext<WorkerProfileSheetContextType | undefined>(undefined);

export function WorkerProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileWithTeams | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const saveCallbackRef = useRef<(() => Promise<void>) | null>(null);

  const saveCurrentWorker = useCallback(async () => {
    if (saveCallbackRef.current) {
      await saveCallbackRef.current();
    }
  }, []);

  const openWorkerSheet = useCallback(async (worker: WorkerProfileWithTeams) => {
    // Don't auto-save when switching workers - user must click Save button
    // Just switch to the new worker
    setSelectedWorker(worker);
    setIsSheetOpen(true);
  }, []);

  const closeWorkerSheet = useCallback(() => {
    // Don't auto-save on close - only save when user clicks Save button
    setIsSheetOpen(false);
    // Keep selectedWorker until sheet animation completes
    setTimeout(() => {
      setSelectedWorker(null);
      saveCallbackRef.current = null;
    }, 300);
  }, []);

  // Register save callback (called from ViewModel)
  const registerSaveCallback = useCallback((callback: () => Promise<void>) => {
    saveCallbackRef.current = callback;
  }, []);

  return (
    <WorkerProfileSheetContext.Provider
      value={{
        selectedWorker,
        isSheetOpen,
        openWorkerSheet,
        closeWorkerSheet,
        saveCurrentWorker,
        registerSaveCallback, // Internal use only
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


