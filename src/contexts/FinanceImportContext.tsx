"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ImportState {
  uploadProgress: number;
  currentImportId: string | null;
  currentImportType: string | null;
}

interface FinanceImportContextType {
  importState: ImportState;
  setImportState: (state: Partial<ImportState>) => void;
  saveImportSnapshot: (importId: string, type: string, recordCount: number) => void;
  logImportError: (type: string, message: string) => void;
}

const FinanceImportContext = createContext<FinanceImportContextType | undefined>(undefined);

export function FinanceImportProvider({ children }: { children: ReactNode }) {
  const [importState, setImportState] = useState<ImportState>({
    uploadProgress: 0,
    currentImportId: null,
    currentImportType: null,
  });

  const saveImportSnapshot = (importId: string, type: string, recordCount: number) => {
    console.log('Import snapshot saved:', { importId, type, recordCount });
  };

  const logImportError = (type: string, message: string) => {
    console.error('Import error:', { type, message });
  };

  return (
    <FinanceImportContext.Provider
      value={{
        importState,
        setImportState,
        saveImportSnapshot,
        logImportError,
      }}
    >
      {children}
    </FinanceImportContext.Provider>
  );
}

export function useFinanceImport() {
  const context = useContext(FinanceImportContext);
  if (context === undefined) {
    throw new Error('useFinanceImport must be used within a FinanceImportProvider');
  }
  return context;
}

