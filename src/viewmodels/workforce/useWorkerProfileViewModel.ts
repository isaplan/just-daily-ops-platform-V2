/**
 * Worker Profile ViewModel Layer
 * Custom hook that manages worker profile sheet state and data fetching
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getLocations } from "@/lib/services/graphql/queries";
import { updateWorkerProfile, type WorkerProfileInput } from "@/lib/services/graphql/mutations";
import { type WorkerProfile } from "@/lib/services/graphql/queries";

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
import { fetchWorkerHoursBreakdown } from "@/lib/services/workforce/worker-hours.service";
import { fetchWorkerSales } from "@/lib/services/workforce/worker-sales.service";

export interface UseWorkerProfileViewModelReturn {
  // State
  isEditMode: boolean;
  editingProfile: WorkerProfileWithTeams | null;
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
  isLoadingHours: boolean;
  isLoadingSales: boolean;

  // Setters
  setIsEditMode: (edit: boolean) => void;
  setEditingProfile: (profile: WorkerProfileWithTeams | null) => void;

  // Data
  locationOptions: Array<{ value: string; label: string }>;

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize editing profile when worker changes
  useEffect(() => {
    if (worker) {
      // Initialize locationIds from worker data
      const initialLocationIds = worker.locationIds || (worker.locationId ? [worker.locationId] : []);
      setEditingProfile({ 
        ...worker, 
        locationIds: initialLocationIds.length > 0 ? initialLocationIds : null 
      });
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

  // Calculate date range for current month
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }, []);

  // Fetch hours breakdown
  const { 
    data: hoursBreakdown, 
    isLoading: isLoadingHours 
  } = useQuery({
    queryKey: ["worker-hours-breakdown", worker?.eitjeUserId, dateRange.startDate, dateRange.endDate],
    queryFn: () => {
      if (!worker?.eitjeUserId) return null;
      return fetchWorkerHoursBreakdown(
        worker.eitjeUserId,
        dateRange.startDate,
        dateRange.endDate
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
    queryKey: ["worker-sales", worker?.userName, dateRange.startDate, dateRange.endDate],
    queryFn: () => {
      if (!worker?.userName) return null;
      return fetchWorkerSales(
        worker.userName,
        dateRange.startDate,
        dateRange.endDate
      );
    },
    enabled: !!worker?.userName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WorkerProfileInput }) => {
      return await updateWorkerProfile(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2-graphql"] });
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
      setEditingProfile({ ...worker });
      setIsEditMode(true);
    }
  };

  const handleCancel = () => {
    if (worker) {
      setEditingProfile({ ...worker });
    }
    setIsEditMode(false);
  };

  const handleSave = () => {
    if (!editingProfile || !worker) return;

    const input: WorkerProfileInput = {
      eitjeUserId: editingProfile.eitjeUserId,
      locationId: editingProfile.locationId,
      locationIds: editingProfile.locationIds || null,
      contractType: editingProfile.contractType,
      contractHours: editingProfile.contractHours,
      hourlyWage: editingProfile.hourlyWage,
      wageOverride: editingProfile.wageOverride,
      effectiveFrom: editingProfile.effectiveFrom,
      effectiveTo: editingProfile.effectiveTo,
      notes: editingProfile.notes,
    };

    // The resolver will handle both MongoDB ObjectId and eitje_user_id formats
    updateMutation.mutate({ id: worker.id, updates: input });
  };

  return {
    // State
    isEditMode,
    editingProfile,
    hoursBreakdown: hoursBreakdown || null,
    salesSummary: salesSummary || null,
    isLoadingHours,
    isLoadingSales,

    // Setters
    setIsEditMode,
    setEditingProfile,

    // Data
    locationOptions,

    // Handlers
    handleEdit,
    handleCancel,
    handleSave,
    updateMutation,
  };
}

