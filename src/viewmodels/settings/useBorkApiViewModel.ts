/**
 * Settings Bork API ViewModel Layer
 * Business logic for Bork API settings
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { createClient } from "@/integrations/supabase/client";
import { updateConnectionStatus } from "@/lib/finance/bork/connectionStatusService";
import {
  fetchBorkConnections,
  testBorkConnection,
  syncBorkData,
  processBorkData,
  validateBorkData,
  validateBorkRevenue,
  fetchConnectionStatus,
  fetchMonthlySyncStatus,
} from "@/lib/services/settings/bork-api.service";
import type {
  ApiConnection,
  ConnectionTestResult,
  ValidationResult,
  RevenueValidationResult,
  SyncResult,
  ProcessResult,
  MonthlySyncStatus,
} from "@/models/settings/bork-api.model";

export function useBorkApiViewModel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Tab state
  const [selectedTab, setSelectedTab] = useState("connection-test");

  // UI state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<ApiConnection | null>(null);

  // Connection test state
  const [testResults, setTestResults] = useState<
    Map<string, ConnectionTestResult>
  >(new Map());
  const [isTesting, setIsTesting] = useState<Set<string>>(new Set());

  // Manual sync state
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    new Set()
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedPeriodType, setSelectedPeriodType] = useState<
    "weekly" | "monthly"
  >("weekly");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingLocations, setSyncingLocations] = useState<Set<string>>(
    new Set()
  );
  const [syncResults, setSyncResults] = useState<
    Map<string, SyncResult & { message: string }>
  >(new Map());
  const [monthlySyncStatus, setMonthlySyncStatus] = useState<
    Map<string, MonthlySyncStatus>
  >(new Map());

  // Raw data processing state
  const [isProcessingRawData, setIsProcessingRawData] = useState(false);
  const [rawDataProcessingResults, setRawDataProcessingResults] = useState<
    Map<string, ProcessResult & { message: string }>
  >(new Map());
  const [processingDates, setProcessingDates] = useState<Set<string>>(
    new Set()
  );

  // Data validation state
  const [validationData, setValidationData] = useState<
    Map<string, ValidationResult>
  >(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [syncingDates, setSyncingDates] = useState<Set<string>>(new Set());
  const [completedMonths, setCompletedMonths] = useState<Set<string>>(
    new Set()
  );

  // Revenue validation state
  const [revenueValidationData, setRevenueValidationData] = useState<
    Map<string, RevenueValidationResult>
  >(new Map());
  const [isValidatingRevenue, setIsValidatingRevenue] = useState(false);

  // Fetch connections
  const {
    data: connections = [],
    isLoading: isLoadingConnections,
  } = useQuery({
    queryKey: ["bork-connections"],
    queryFn: fetchBorkConnections,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isClient,
  });

  // Fetch connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ["bork-connection-status"],
    queryFn: fetchConnectionStatus,
    staleTime: 5 * 60 * 1000,
    enabled: isClient,
  });

  // Update test results when connection status changes
  useEffect(() => {
    if (connectionStatus) {
      setTestResults(connectionStatus);
    }
  }, [connectionStatus]);

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: ({ locationId, testDate }: { locationId: string; testDate?: string }) =>
      testBorkConnection(locationId, testDate),
    onSuccess: (result: ConnectionTestResult, variables: { locationId: string; testDate?: string }) => {
      const locationId = variables.locationId;
      setTestResults((prev) => new Map(prev).set(locationId, result));
      setIsTesting((prev) => {
        const next = new Set(prev);
        next.delete(locationId);
        return next;
      });

      // Update database
      updateConnectionStatus(
        locationId,
        result.success ? "success" : "failed",
        result.message
      ).catch((error) => {
        console.warn("Database update failed:", error);
      });

      toast({
        title: result.success ? "Success" : "Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: Error, locationId: string) => {
      setIsTesting((prev) => {
        const next = new Set(prev);
        next.delete(locationId);
        return next;
      });

      toast({
        title: "Error",
        description: error.message || "Connection test failed",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const toggleCardExpansion = useCallback((locationId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }, []);

  const handleTestConnection = useCallback(
    async (connection: ApiConnection) => {
      setIsTesting((prev) => new Set(prev).add(connection.locationId));
      const testDate = format(subDays(new Date(), 30), "yyyyMMdd");
      testMutation.mutate({ locationId: connection.locationId, testDate });
    },
    [testMutation]
  );

  const addConnection = useCallback(() => {
    setEditingConnection({
      id: "",
      location: "",
      locationId: "",
      apiKey: "",
      baseUrl: "",
      isActive: true,
    });
  }, []);

  const editConnection = useCallback((connection: ApiConnection) => {
    setEditingConnection(connection);
  }, []);

  const deleteConnection = useCallback((id: string) => {
    // This would need to be implemented via API
    toast({
      title: "Delete Connection",
      description: "Connection deletion not yet implemented",
      variant: "default",
    });
  }, [toast]);

  const saveConnection = useCallback(() => {
    if (!editingConnection) return;
    // This would need to be implemented via API
    toast({
      title: "Save Connection",
      description: "Connection saving not yet implemented",
      variant: "default",
    });
    setEditingConnection(null);
  }, [editingConnection, toast]);

  // Generate weekly periods
  const generateWeeklyPeriods = useCallback(() => {
    const periods = [];
    const startDate = new Date(2024, 0, 1);
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

    const currentPeriod = new Date(startDate);

    while (currentPeriod <= currentWeekStart) {
      const periodEnd = new Date(currentPeriod);
      periodEnd.setDate(periodEnd.getDate() + 6);

      const periodKey = `${format(currentPeriod, "yyyy-MM-dd")}_${format(periodEnd, "yyyy-MM-dd")}`;
      const periodLabel = `${format(currentPeriod, "MMM d")} - ${format(periodEnd, "MMM d, yyyy")}`;

      periods.push({
        key: periodKey,
        label: periodLabel,
        startDate: format(currentPeriod, "yyyy-MM-dd"),
        endDate: format(periodEnd, "yyyy-MM-dd"),
      });

      currentPeriod.setDate(currentPeriod.getDate() + 7);
    }

    return periods.reverse();
  }, []);

  // Generate monthly periods
  const generateMonthlyPeriods = useCallback(() => {
    const periods = [];
    const startDate = new Date(2024, 0, 1);
    const currentDate = new Date();
    const currentPeriod = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    while (currentPeriod <= currentMonth) {
      const periodEnd = new Date(
        currentPeriod.getFullYear(),
        currentPeriod.getMonth() + 1,
        0
      );

      const periodKey = `${format(currentPeriod, "yyyy-MM-dd")}_${format(periodEnd, "yyyy-MM-dd")}`;
      const periodLabel = format(currentPeriod, "MMMM yyyy");

      const monthStatus = monthlySyncStatus.get(periodKey);

      periods.push({
        key: periodKey,
        label: periodLabel,
        startDate: format(currentPeriod, "yyyy-MM-dd"),
        endDate: format(periodEnd, "yyyy-MM-dd"),
        hasData: monthStatus?.hasData || false,
        recordCount: monthStatus?.recordCount || 0,
      });

      currentPeriod.setMonth(currentPeriod.getMonth() + 1);
    }

    return periods.reverse();
  }, [monthlySyncStatus]);

  // Generate periods based on selected type
  const generatePeriods = useCallback(() => {
    return selectedPeriodType === "weekly"
      ? generateWeeklyPeriods()
      : generateMonthlyPeriods();
  }, [selectedPeriodType, generateWeeklyPeriods, generateMonthlyPeriods]);

  // Check monthly sync status
  useEffect(() => {
    const checkMonthlySyncStatus = async () => {
      if (selectedPeriodType !== "monthly" || !isClient) return;

      try {
        const supabase = createClient();
        if (!supabase) return;

        const monthlyStatus = new Map<string, MonthlySyncStatus>();
        const months = generateMonthlyPeriods();

        for (const month of months) {
          const status = await fetchMonthlySyncStatus(
            connections[0]?.locationId || ""
          );
          monthlyStatus.set(month.key, status);
        }

        setMonthlySyncStatus(monthlyStatus);
      } catch (error) {
        console.error("Error checking monthly sync status:", error);
      }
    };

    checkMonthlySyncStatus();
  }, [selectedPeriodType, generateMonthlyPeriods, isClient, connections]);

  const toggleLocationSelection = useCallback((locationId: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }, []);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncBorkData,
    onSuccess: (result: SyncResult, variables) => {
      const connection = connections.find(
        (c) => c.locationId === variables.locationId
      );
      const message = result.success
        ? `✅ ${connection?.location || "Location"} sync completed successfully - ${result.data?.totalRecords || 0} records stored`
        : `❌ ${connection?.location || "Location"} sync failed: ${result.error || "Unknown error"}`;

      setSyncResults((prev) =>
        new Map(prev).set(variables.locationId, { ...result, message })
      );
      setSyncingLocations((prev) => {
        const next = new Set(prev);
        next.delete(variables.locationId);
        return next;
      });

      toast({
        title: result.success ? "Sync Successful" : "Sync Failed",
        description: message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: Error, variables) => {
      const connection = connections.find(
        (c) => c.locationId === variables.locationId
      );
      const message = `❌ ${connection?.location || "Location"} sync failed: ${error.message}`;

      setSyncResults((prev) =>
        new Map(prev).set(variables.locationId, {
          success: false,
          message,
          error: error.message,
        })
      );
      setSyncingLocations((prev) => {
        const next = new Set(prev);
        next.delete(variables.locationId);
        return next;
      });

      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const startManualSync = useCallback(async () => {
    if (selectedLocations.size === 0 || !selectedPeriod) {
      toast({
        title: "Validation Error",
        description: "Please select at least one location and a period",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    const [startDate, endDate] = selectedPeriod.split("_");

    // Process locations in parallel
    const syncPromises = Array.from(selectedLocations).map((locationId) => {
      setSyncingLocations((prev) => new Set(prev).add(locationId));
      return syncMutation.mutateAsync({
        locationId,
        startDate,
        endDate,
      });
    });

    await Promise.allSettled(syncPromises);
    setIsSyncing(false);
  }, [selectedLocations, selectedPeriod, syncMutation, toast]);

  const retryLocationSync = useCallback(
    async (locationId: string) => {
      if (!selectedPeriod) {
        toast({
          title: "Validation Error",
          description: "Please select a period",
          variant: "destructive",
        });
        return;
      }

      setSyncingLocations((prev) => new Set(prev).add(locationId));
      const [startDate, endDate] = selectedPeriod.split("_");

      try {
        await syncMutation.mutateAsync({ locationId, startDate, endDate });
      } catch (error) {
        // Error handled by mutation
      }
    },
    [selectedPeriod, syncMutation, toast]
  );

  // Process mutation
  const processMutation = useMutation({
    mutationFn: processBorkData,
    onSuccess: (result: ProcessResult, variables) => {
      const connection = connections.find(
        (c) => c.locationId === variables.locationId
      );
      const message = result.success
        ? `✅ ${connection?.location || "Location"} processing completed successfully`
        : `❌ ${connection?.location || "Location"} processing failed: ${result.error || "Unknown error"}`;

      setRawDataProcessingResults((prev) =>
        new Map(prev).set(variables.locationId, { ...result, message })
      );
      setProcessingDates((prev) => {
        const next = new Set(prev);
        next.delete(`${variables.startDate}_${variables.endDate}`);
        return next;
      });

      toast({
        title: result.success ? "Processing Successful" : "Processing Failed",
        description: message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: Error, variables) => {
      const connection = connections.find(
        (c) => c.locationId === variables.locationId
      );
      const message = `❌ ${connection?.location || "Location"} processing failed: ${error.message}`;

      setRawDataProcessingResults((prev) =>
        new Map(prev).set(variables.locationId, {
          success: false,
          message,
          error: error.message,
        })
      );
      setProcessingDates((prev) => {
        const next = new Set(prev);
        next.delete(`${variables.startDate}_${variables.endDate}`);
        return next;
      });

      toast({
        title: "Processing Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const processRawData = useCallback(
    async (locationId?: string, startDate?: string, endDate?: string) => {
      // If no parameters provided, process all selected locations for selected period
      if (!locationId || !startDate || !endDate) {
        if (selectedLocations.size === 0 || !selectedPeriod) {
          toast({
            title: "Selection Required",
            description: "Please select at least one location and a period",
            variant: "destructive",
          });
          return;
        }

        setIsProcessingRawData(true);
        const results = new Map();
        const [periodStartDate, periodEndDate] = selectedPeriod.split("_");

        const processPromises = Array.from(selectedLocations).map(
          async (locId) => {
            const connection = connections.find((c) => c.locationId === locId);
            if (!connection) return;

            setProcessingDates((prev) => new Set(prev).add(locId));

            try {
              const result = await processMutation.mutateAsync({
                locationId: locId,
                startDate: periodStartDate,
                endDate: periodEndDate,
              });
              results.set(locId, result);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              results.set(locId, {
                success: false,
                error: errorMessage,
                message: `❌ ${connection.location} processing failed: ${errorMessage}`,
              });
            } finally {
              setProcessingDates((prev) => {
                const next = new Set(prev);
                next.delete(locId);
                return next;
              });
            }
          }
        );

        await Promise.allSettled(processPromises);
        setRawDataProcessingResults(results);
        setIsProcessingRawData(false);
        return;
      }

      // Process specific location and date range
      const dateKey = `${startDate}_${endDate}`;
      setProcessingDates((prev) => new Set(prev).add(dateKey));

      try {
        await processMutation.mutateAsync({ locationId, startDate, endDate });
      } catch (error) {
        // Error handled by mutation
      }
    },
    [processMutation, selectedLocations, selectedPeriod, connections, toast]
  );

  // Validation functions
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      const results = await validateBorkData();
      const validationMap = new Map<string, ValidationResult>();
      results.forEach((result) => {
        validationMap.set(result.locationId, result);
      });
      setValidationData(validationMap);
    } catch (error) {
      toast({
        title: "Validation Failed",
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  const runRevenueValidation = useCallback(async () => {
    setIsValidatingRevenue(true);
    try {
      const results = await validateBorkRevenue();
      const validationMap = new Map<string, RevenueValidationResult>();
      results.forEach((result) => {
        validationMap.set(result.locationId, result);
      });
      setRevenueValidationData(validationMap);
    } catch (error) {
      toast({
        title: "Revenue Validation Failed",
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsValidatingRevenue(false);
    }
  }, [toast]);

  // Sync and process for date range
  const syncAndProcessDateRange = useCallback(
    async (
      locationId: string,
      startDate: string,
      endDate: string,
      autoProcess: boolean = false
    ) => {
      const dateKey = `${startDate}_${endDate}`;
      setSyncingDates((prev) => new Set(prev).add(dateKey));

      try {
        // Sync first
        const syncResult = await syncMutation.mutateAsync({
          locationId,
          startDate,
          endDate,
        });

        if (syncResult.success && autoProcess) {
          // Process after sync
          await processMutation.mutateAsync({
            locationId,
            startDate,
            endDate,
          });
        }

        setSyncingDates((prev) => {
          const next = new Set(prev);
          next.delete(dateKey);
          return next;
        });
      } catch (error) {
        setSyncingDates((prev) => {
          const next = new Set(prev);
          next.delete(dateKey);
          return next;
        });
      }
    },
    [syncMutation, processMutation]
  );

  return {
    // State
    selectedTab,
    setSelectedTab,
    isClient,
    expandedCards,
    showSettings,
    setShowSettings,
    editingConnection,
    setEditingConnection,

    // Connections
    connections,
    isLoadingConnections,

    // Connection testing
    testResults,
    isTesting,
    handleTestConnection,

    // Connection management
    addConnection,
    editConnection,
    deleteConnection,
    saveConnection,
    toggleCardExpansion,

    // Manual sync
    selectedLocations,
    selectedPeriod,
    selectedPeriodType,
    setSelectedPeriod,
    setSelectedPeriodType,
    isSyncing,
    syncingLocations,
    syncResults,
    monthlySyncStatus,
    generatePeriods,
    toggleLocationSelection,
    startManualSync,
    retryLocationSync,

    // Raw data processing
    isProcessingRawData,
    rawDataProcessingResults,
    processingDates,
    processRawData,

    // Data validation
    validationData,
    isValidating,
    syncingDates,
    completedMonths,
    setCompletedMonths,
    runValidation,

    // Revenue validation
    revenueValidationData,
    isValidatingRevenue,
    runRevenueValidation,

    // Combined operations
    syncAndProcessDateRange,
  };
}
