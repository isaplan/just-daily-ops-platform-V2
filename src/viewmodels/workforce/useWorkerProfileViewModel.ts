/**
 * Worker Profile ViewModel Layer
 * Custom hook that manages worker profile sheet state and data fetching
 */

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getLocations } from "@/lib/services/graphql/queries";
import { fetchTeams } from "@/lib/services/labor/locations-teams.service";
import { updateWorkerProfile, type WorkerProfileInput } from "@/lib/services/graphql/mutations";
import { type WorkerProfile } from "@/lib/services/graphql/queries";
import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";

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
import { 
  getWorkerHours,
  getWorkerSales,
  getWorkerLaborCost,
  getWorkerHoursSummary,
  type WorkerHoursBreakdown,
  type WorkerSalesSummary,
  type WorkerLaborCost,
  type WorkerHoursSummary
} from "@/lib/services/graphql/queries";

export type TimePeriod = "total" | "thisMonth" | "lastMonth";

export interface UseWorkerProfileViewModelReturn {
  // State
  isEditMode: boolean;
  editingProfile: WorkerProfileWithTeams | null;
  editingTeamIds: string[];
  performancePeriod: TimePeriod;
  laborCostPeriod: TimePeriod;
  hoursBreakdown: {
    gewerkt: number;
    ziek: number;
    verlof: number;
    total: number;
  } | null;
  salesSummary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTicketValue: number;
    totalItems: number;
  } | null;
  laborCost: WorkerLaborCost | null;
  hoursSummary: WorkerHoursSummary | null;
  isLoadingHours: boolean;
  isLoadingSales: boolean;
  isLoadingLaborCost: boolean;
  isLoadingHoursSummary: boolean;

  // Setters
  setIsEditMode: (edit: boolean) => void;
  setEditingProfile: (profile: WorkerProfileWithTeams | null) => void;
  setEditingTeamIds: (teamIds: string[]) => void;
  setPerformancePeriod: (period: TimePeriod) => void;
  setLaborCostPeriod: (period: TimePeriod) => void;

  // Data
  locationOptions: Array<{ value: string; label: string }>;
  teamOptions: Array<{ value: string; label: string; locationId?: string }>;

  // Handlers
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: () => void;
  updateMutation: {
    mutate: (args: { id: string; updates: WorkerProfileInput }) => void;
    isPending: boolean;
  };
}

export function useWorkerProfileViewModel(
  worker: WorkerProfileWithTeams | null
): UseWorkerProfileViewModelReturn {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState<WorkerProfile | null>(null);
  const [editingTeamIds, setEditingTeamIds] = useState<string[]>([]);
  const [performancePeriod, setPerformancePeriod] = useState<TimePeriod>("thisMonth");
  const [laborCostPeriod, setLaborCostPeriod] = useState<TimePeriod>("thisMonth");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get context functions for updating selected worker
  const { selectedWorker: contextSelectedWorker, openWorkerSheet, registerSaveCallback } = useWorkerProfileSheet();

  // Initialize editing profile when worker changes
  useEffect(() => {
    if (worker) {
      // Initialize locationIds from worker data
      const initialLocationIds = worker.locationIds || (worker.locationId ? [worker.locationId] : []);
      setEditingProfile({ 
        ...worker, 
        locationIds: initialLocationIds.length > 0 ? initialLocationIds : null 
      });
      
      // Initialize team IDs from worker teams
      const initialTeamIds = worker.teams && Array.isArray(worker.teams)
        ? worker.teams.map((t: any) => t.team_id || t.id || t.team_name).filter(Boolean)
        : [];
      setEditingTeamIds(initialTeamIds);
      
      setIsEditMode(false);
    }
  }, [worker]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 10 * 60 * 1000,
  });

  const locationOptions = useMemo(() => {
    const validLocations = locations.filter(
      (loc: any) => 
        loc.name !== "All HNHG Locations" && 
        loc.name !== "All HNG Locations" &&
        loc.name !== "Default Location"
    );
    return [
      { value: "all", label: "All Locations" },
      ...validLocations.map((loc: any) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Get selected location IDs for fetching teams (use editing profile if in edit mode)
  const selectedLocationIds = useMemo(() => {
    // In edit mode, use editing profile locations
    if (isEditMode && editingProfile?.locationIds && Array.isArray(editingProfile.locationIds) && editingProfile.locationIds.length > 0) {
      return editingProfile.locationIds;
    }
    // Otherwise use worker locations
    if (worker?.locationIds && Array.isArray(worker.locationIds) && worker.locationIds.length > 0) {
      return worker.locationIds;
    }
    if (worker?.locationId) {
      return [worker.locationId];
    }
    return [];
  }, [isEditMode, editingProfile?.locationIds, worker?.locationIds, worker?.locationId]);

  // Fetch teams for selected locations
  const { data: teamsData = [] } = useQuery({
    queryKey: ["teams-for-worker", selectedLocationIds],
    queryFn: async () => {
      if (selectedLocationIds.length === 0) return [];
      
      // Fetch teams for each location and combine
      const teamPromises = selectedLocationIds.map(locationId => fetchTeams(locationId));
      const teamsArrays = await Promise.all(teamPromises);
      return teamsArrays.flat();
    },
    enabled: selectedLocationIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const teamOptions = useMemo(() => {
    // Get unique teams (by name) from all locations
    const teamsMap = new Map<string, { value: string; label: string; locationId?: string }>();
    
    teamsData.forEach((team: any) => {
      const teamKey = team.name || team.team_name;
      if (teamKey && !teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, {
          value: team.id || team.team_id || teamKey,
          label: team.name || team.team_name || teamKey,
          locationId: team.locationId,
        });
      }
    });

    return Array.from(teamsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [teamsData]);

  // Date range calculation helpers
  const getThisMonthRange = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }, []);

  const getLastMonthRange = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    
    // Calculate previous month
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    
    if (prevMonth < 0) {
      prevMonth = 11; // December
      prevYear = currentYear - 1;
    }
    
    const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    const endDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }, []);

  const getTotalRange = useCallback(() => {
    // If contract has effectiveFrom, start from there, otherwise use a far back date
    const contractStart = worker?.effectiveFrom 
      ? new Date(worker.effectiveFrom).toISOString().split('T')[0]
      : '2020-01-01'; // Default far back date
    
    // If contract has effectiveTo and it's in the past, end there, otherwise use today
    const contractEnd = worker?.effectiveTo 
      ? new Date(worker.effectiveTo) < new Date()
        ? new Date(worker.effectiveTo).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    return { startDate: contractStart, endDate: contractEnd };
  }, [worker?.effectiveFrom, worker?.effectiveTo]);

  // Calculate date range based on performance period
  const performanceDateRange = useMemo(() => {
    switch (performancePeriod) {
      case "total":
        return getTotalRange();
      case "thisMonth":
        return getThisMonthRange();
      case "lastMonth":
        return getLastMonthRange();
      default:
        return getThisMonthRange();
    }
  }, [performancePeriod, getTotalRange, getThisMonthRange, getLastMonthRange]);

  // Calculate date range based on labor cost period
  const laborCostDateRange = useMemo(() => {
    switch (laborCostPeriod) {
      case "total":
        return getTotalRange();
      case "thisMonth":
        return getThisMonthRange();
      case "lastMonth":
        return getLastMonthRange();
      default:
        return getThisMonthRange();
    }
  }, [laborCostPeriod, getTotalRange, getThisMonthRange, getLastMonthRange]);

  // Fetch hours breakdown
  const { 
    data: hoursBreakdown, 
    isLoading: isLoadingHours 
  } = useQuery({
    queryKey: ["worker-hours-breakdown", worker?.eitjeUserId, performanceDateRange.startDate, performanceDateRange.endDate, performancePeriod],
    queryFn: () => {
      if (!worker?.eitjeUserId) return null;
      return getWorkerHours(
        worker.eitjeUserId,
        performanceDateRange.startDate,
        performanceDateRange.endDate
      );
    },
    enabled: !!worker?.eitjeUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch sales summary
  const { 
    data: salesSummary, 
    isLoading: isLoadingSales 
  } = useQuery({
    queryKey: ["worker-sales", worker?.userName, performanceDateRange.startDate, performanceDateRange.endDate, performancePeriod],
    queryFn: () => {
      if (!worker?.userName) return null;
      return getWorkerSales(
        worker.userName,
        performanceDateRange.startDate,
        performanceDateRange.endDate
      );
    },
    enabled: !!worker?.userName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch labor cost
  const { 
    data: laborCost, 
    isLoading: isLoadingLaborCost 
  } = useQuery({
    queryKey: ["worker-labor-cost", worker?.eitjeUserId, laborCostDateRange.startDate, laborCostDateRange.endDate, laborCostPeriod],
    queryFn: () => {
      if (!worker?.eitjeUserId) return null;
      return getWorkerLaborCost(
        worker.eitjeUserId,
        laborCostDateRange.startDate,
        laborCostDateRange.endDate
      );
    },
    enabled: !!worker?.eitjeUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch hours summary (contract vs worked, leave accrual vs taken)
  const { 
    data: hoursSummary, 
    isLoading: isLoadingHoursSummary,
    error: hoursSummaryError
  } = useQuery({
    queryKey: [
      "worker-hours-summary", 
      worker?.eitjeUserId, 
      worker?.contractHours,
      worker?.effectiveFrom,
      worker?.effectiveTo,
      performanceDateRange.startDate, 
      performanceDateRange.endDate,
      performancePeriod
    ],
    queryFn: async () => {
      if (!worker?.eitjeUserId || !worker?.contractHours || !worker?.effectiveFrom) {
        return null;
      }
      try {
        return await getWorkerHoursSummary(
          worker.eitjeUserId,
          worker.contractHours || null,
          worker.effectiveFrom || '',
          worker.effectiveTo || null,
          performanceDateRange.startDate,
          performanceDateRange.endDate
        );
      } catch (error) {
        console.error('[WorkerProfileViewModel] Error fetching hours summary:', error);
        // Return null to show "No data available" instead of crashing
        return null;
      }
    },
    enabled: !!worker?.eitjeUserId && !!worker?.contractHours && !!worker?.effectiveFrom,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once to avoid long waits
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WorkerProfileInput }) => {
      return await updateWorkerProfile(id, updates);
    },
    onSuccess: async (updatedProfile) => {
      // Invalidate and immediately refetch workers table query (this will refresh the table)
      // Using refetchQueries ensures the table updates immediately without waiting for next render
      await queryClient.refetchQueries({ 
        queryKey: ["worker-profiles-v2-graphql"],
        type: 'active' // Only refetch active queries (visible table)
      });
      
      // Also invalidate to mark as stale for any inactive queries
      queryClient.invalidateQueries({ 
        queryKey: ["worker-profiles-v2-graphql"]
      });
      
      // Invalidate worker profile queries
      queryClient.invalidateQueries({ queryKey: ["worker-profile"] });
      queryClient.invalidateQueries({ queryKey: ["workerProfileByName"] });
      queryClient.invalidateQueries({ queryKey: ["workerProfileByEitjeUserId"] });
      
      // Invalidate related queries that might use worker data
      queryClient.invalidateQueries({ queryKey: ["worker-hours-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["worker-sales"] });
      queryClient.invalidateQueries({ queryKey: ["worker-labor-cost"] });
      queryClient.invalidateQueries({ queryKey: ["worker-hours-summary"] });
      
      // Update the selected worker in context if it matches the updated worker
      if (worker && updatedProfile && contextSelectedWorker) {
        const isSameWorker = contextSelectedWorker.id === worker.id || 
                           contextSelectedWorker.eitjeUserId === worker.eitjeUserId;
        
        if (isSameWorker) {
          // Refetch the updated worker profile to get latest data with all fields
          const { getWorkerProfile } = await import("@/lib/services/graphql/queries");
          try {
            const refreshedWorker = await getWorkerProfile(worker.id);
            if (refreshedWorker) {
              // Update context with refreshed data (this will trigger a re-render with new data)
              openWorkerSheet({
                ...refreshedWorker,
                teams: contextSelectedWorker.teams, // Preserve teams data
                teamName: contextSelectedWorker.teamName,
                locationIds: updatedProfile.locationIds || contextSelectedWorker.locationIds,
                locationNames: updatedProfile.locationNames || contextSelectedWorker.locationNames,
              } as WorkerProfileWithTeams);
            } else {
              // Fallback: use updated profile with preserved teams data
              openWorkerSheet({
                ...updatedProfile,
                teams: contextSelectedWorker.teams,
                teamName: contextSelectedWorker.teamName,
              } as WorkerProfileWithTeams);
            }
          } catch (error) {
            console.error('[WorkerProfileViewModel] Error refreshing worker after update:', error);
            // Fallback: use updated profile with preserved teams data
            openWorkerSheet({
              ...updatedProfile,
              teams: contextSelectedWorker.teams,
              teamName: contextSelectedWorker.teamName,
            } as WorkerProfileWithTeams);
          }
        }
      }
      
      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Worker profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (worker) {
      const initialLocationIds = worker.locationIds || (worker.locationId ? [worker.locationId] : []);
      setEditingProfile({ 
        ...worker, 
        locationIds: initialLocationIds.length > 0 ? initialLocationIds : null 
      });
      
      // Initialize team IDs from worker teams
      const initialTeamIds = worker.teams && Array.isArray(worker.teams)
        ? worker.teams.map((t: any) => t.team_id || t.id || t.team_name).filter(Boolean)
        : [];
      setEditingTeamIds(initialTeamIds);
      
      setIsEditMode(true);
    }
  };

  const handleCancel = () => {
    if (worker) {
      const initialLocationIds = worker.locationIds || (worker.locationId ? [worker.locationId] : []);
      setEditingProfile({ 
        ...worker, 
        locationIds: initialLocationIds.length > 0 ? initialLocationIds : null 
      });
      
      // Reset team IDs
      const initialTeamIds = worker.teams && Array.isArray(worker.teams)
        ? worker.teams.map((t: any) => t.team_id || t.id || t.team_name).filter(Boolean)
        : [];
      setEditingTeamIds(initialTeamIds);
    }
    setIsEditMode(false);
  };

  const handleSave = useCallback(async () => {
    if (!editingProfile || !worker) return;

    // Map "Contract" to "uren contract" for backend compatibility
    let contractType = editingProfile.contractType;
    if (contractType === "Contract") {
      contractType = "uren contract";
    }

    const input: WorkerProfileInput = {
      eitjeUserId: editingProfile.eitjeUserId,
      locationId: editingProfile.locationId,
      locationIds: editingProfile.locationIds || null,
      contractType: contractType,
      contractHours: editingProfile.contractHours,
      hourlyWage: editingProfile.hourlyWage,
      wageOverride: editingProfile.wageOverride,
      effectiveFrom: editingProfile.effectiveFrom,
      effectiveTo: editingProfile.effectiveTo,
      notes: editingProfile.notes,
    };

    // The resolver will handle both MongoDB ObjectId and eitje_user_id formats
    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate(
        { id: worker.id, updates: input },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  }, [editingProfile, worker, updateMutation]);

  // Register save callback (currently unused - saves only happen on Save button click)
  // This was previously used for auto-save on worker switch, but now saves only happen via Save button
  useEffect(() => {
    if (isEditMode && editingProfile && worker) {
      registerSaveCallback(handleSave);
    } else {
      registerSaveCallback(async () => {
        // No-op if not in edit mode
        return Promise.resolve();
      });
    }
  }, [isEditMode, editingProfile, worker, handleSave, registerSaveCallback]);

  return {
    // State
    isEditMode,
    editingProfile,
    performancePeriod,
    laborCostPeriod,
    hoursBreakdown: hoursBreakdown || null,
    salesSummary: salesSummary || null,
    laborCost: laborCost ?? null,
    hoursSummary: hoursSummary || null,
    isLoadingHours,
    isLoadingSales,
    isLoadingLaborCost,
    isLoadingHoursSummary,

    // Setters
    setIsEditMode,
    setEditingProfile,
    setPerformancePeriod,
    setLaborCostPeriod,

    // Data
    locationOptions,
    teamOptions,

    // Team editing state
    editingTeamIds,
    setEditingTeamIds,

    // Handlers
    handleEdit,
    handleCancel,
    handleSave,
    updateMutation,
  };
}

