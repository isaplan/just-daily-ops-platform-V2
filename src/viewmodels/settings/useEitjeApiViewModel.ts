/**
 * Settings Eitje API ViewModel
 * Manages state and business logic for Eitje API settings page
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EitjeCredentials,
  SyncResult,
  RawDataRecord,
  DataStats,
  MonthlyProgress,
  ConnectionStatus,
} from "@/models/settings/eitje-api.model";
import {
  fetchCredentials,
  saveCredentials as saveCredentialsService,
  testConnection as testConnectionService,
  fetchRawData,
  calculateDataStats,
  chunkDateRange,
  fetchMonthProgress,
  fetchMonthProgressV2,
  processV2Month,
} from "@/lib/services/settings/eitje-api.service";

const DEFAULT_CREDENTIALS: EitjeCredentials = {
  provider: "eitje",
  api_key: "",
  base_url: "https://open-api.eitje.app/open_api",
  additional_config: {
    partner_username: "",
    partner_password: "",
    api_username: "",
    api_password: "",
    content_type: "application/json",
    accept: "application/json",
    timeout: 30000,
    retry_attempts: 3,
    rate_limit: 100,
  },
  is_active: true,
};

export function useEitjeApiViewModel() {
  const [credentials, setCredentials] = useState<EitjeCredentials>(DEFAULT_CREDENTIALS);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingMonths, setSyncingMonths] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("unknown");
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncedMonths, setSyncedMonths] = useState<Set<string>>(new Set());
  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress>({});
  const [monthlyProgressV2, setMonthlyProgressV2] = useState<MonthlyProgress>({});
  const [isLoadingV2Progress, setIsLoadingV2Progress] = useState(false);
  const [processingV2Months, setProcessingV2Months] = useState<Set<string>>(new Set());
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [progressData, setProgressData] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch credentials
  const { data: loadedCredentials, isLoading: isLoadingCredentials } = useQuery<EitjeCredentials | null>({
    queryKey: ["eitje-api-credentials"],
    queryFn: fetchCredentials,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update credentials when loaded
  useEffect(() => {
    if (loadedCredentials) {
      setCredentials(loadedCredentials);
    }
  }, [loadedCredentials]);

  // Initialize synced months
  useEffect(() => {
    setSyncedMonths(new Set(["2024-1", "2025-8", "2025-9", "2025-10"]));
  }, []);

  // Fetch raw data
  const { data: rawData = [], isLoading: isLoadingRawData } = useQuery<RawDataRecord[]>({
    queryKey: ["eitje-api-raw-data"],
    queryFn: fetchRawData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate data stats
  const dataStats = useMemo(() => calculateDataStats(rawData), [rawData]);

  // Load monthly progress for all months
  const loadMonthlyProgress = useCallback(async () => {
    const progressPromises = [];
    
    // Load all 12 months for 2024 and 2025
    for (let year of [2024, 2025]) {
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          fetchMonthProgress(year, month).then((data) => ({
            month,
            year,
            data,
          }))
        );
      }
    }

    const allProgress = await Promise.all(progressPromises);
    const newMonthlyProgress: MonthlyProgress = {};

    allProgress.forEach(({ month, year, data }) => {
      if (data) {
        const monthKey = `${year}-${month}`;
        newMonthlyProgress[monthKey] = data;
      }
    });

    setMonthlyProgress(newMonthlyProgress);
    setProgressData({ lastUpdated: new Date() }); // Set progress data when loaded
  }, []);

  // Load V2 progress for all months
  const loadMonthlyProgressV2 = useCallback(async () => {
    setIsLoadingV2Progress(true);
    try {
      const progressPromises = [];

      for (let year of [2024, 2025]) {
        for (let month = 1; month <= 12; month++) {
          progressPromises.push(
            fetchMonthProgressV2(year, month).then((data) => ({
              month,
              year,
              data,
            }))
          );
        }
      }

      const allProgress = await Promise.all(progressPromises);
      const newMonthlyProgressV2: MonthlyProgress = {};

      allProgress.forEach(({ month, year, data }) => {
        if (data) {
          const monthKey = `${year}-${month}`;
          newMonthlyProgressV2[monthKey] = data;
        }
      });

      setMonthlyProgressV2(newMonthlyProgressV2);
    } finally {
      setIsLoadingV2Progress(false);
    }
  }, []);

  // Save credentials
  const saveCredentials = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await saveCredentialsService(credentials);
      if (success) {
        setConnectionStatus("unknown"); // Reset connection status
        queryClient.invalidateQueries({ queryKey: ["eitje-api-credentials"] });
      }
      return success;
    } finally {
      setIsSaving(false);
    }
  }, [credentials, queryClient]);

  // Test connection
  const testConnection = useCallback(async () => {
    setIsTesting(true);
    try {
      const result = await testConnectionService(credentials);
      setConnectionStatus(result.success ? "connected" : "failed");
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [credentials]);

  // Process V2 month
  const handleProcessV2Month = useCallback(
    async (month: number, year: number) => {
      const monthKey = `${year}-${month}`;
      setProcessingV2Months((prev) => new Set(prev).add(monthKey));

      try {
        const result = await processV2Month(year, month);
        if (result.success) {
          // Refresh progress data for this month
          const monthProgress = await fetchMonthProgressV2(year, month);
          if (monthProgress) {
            setMonthlyProgressV2((prev) => ({
              ...prev,
              [monthKey]: monthProgress,
            }));
          }
        } else {
          alert(
            `Failed to process V2 data: ${result.error || "Unknown error"}`
          );
        }
        return result;
      } catch (error) {
        console.error(
          `Failed to process V2 data for ${year} month ${month}:`,
          error
        );
        alert(
          `Failed to process V2 data: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      } finally {
        setProcessingV2Months((prev) => {
          const next = new Set(prev);
          next.delete(monthKey);
          return next;
        });
      }
    },
    []
  );

  // Toggle history expanded
  const toggleHistoryExpanded = useCallback((key: string) => {
    setHistoryExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  return {
    // State
    credentials,
    isSaving,
    isTesting,
    isSyncing,
    syncingMonths,
    connectionStatus,
    lastSync,
    rawData,
    dataStats,
    syncedMonths,
    monthlyProgress,
    monthlyProgressV2,
    isLoadingV2Progress,
    processingV2Months,
    historyExpanded,
    historyData,
    progressData,
    isLoading: isLoadingCredentials || isLoadingRawData,

    // Actions
    setCredentials,
    saveCredentials,
    testConnection,
    setSyncingMonths,
    setLastSync,
    setSyncedMonths,
    loadMonthlyProgress,
    loadMonthlyProgressV2,
    handleProcessV2Month,
    toggleHistoryExpanded,
    setHistoryData,
    chunkDateRange,
  };
}
