/**
 * Workers V2 ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 */

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchWorkerProfiles } from "@/lib/services/eitje-v2/workers-v2.service";
import {
  WorkersV2QueryParams,
  EditingProfile,
  LocationOption,
  SortOrder,
  WorkerProfile,
} from "@/models/eitje-v2/workers-v2.model";

const ITEMS_PER_PAGE = 50;

export interface UseWorkersV2ViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  activeFilter: "all" | "active" | "inactive";
  nameSortOrder: SortOrder;
  currentPage: number;
  editingId: number | null;
  editingProfile: EditingProfile | null;
  isCreating: boolean;

  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setActiveFilter: (filter: "all" | "active" | "inactive") => void;
  setNameSortOrder: (order: SortOrder) => void;
  setCurrentPage: (page: number) => void;
  setEditingId: (id: number | null) => void;
  setEditingProfile: (profile: EditingProfile | null) => void;
  setIsCreating: (creating: boolean) => void;

  // Data
  locationOptions: LocationOption[];
  locations: Array<{ id: string; name: string }>;
  years: number[];
  months: Array<{ value: number; label: string }>;
  availableDays: number[];
  yearMonthValue: string;
  sortedRecords: EditingProfile[];
  data: {
    records: EditingProfile[];
    total: number;
    page: number;
    totalPages: number;
  } | undefined;
  isLoading: boolean;
  error: Error | null;
  totalPages: number;

  // Handlers
  handleYearMonthChange: (value: string) => void;
  handleDayChange: (value: string) => void;
  handleNameSort: () => void;
  handleEdit: (profile: EditingProfile) => void;
  handleCancel: () => void;
  handleSave: () => void;
  handleDelete: (id: number) => void;
  updateMutation: {
    mutate: (args: { id: number; updates: Partial<WorkerProfile> }) => void;
    isPending: boolean;
  };
  createMutation: {
    mutate: (profile: Omit<WorkerProfile, "id" | "created_at" | "updated_at">) => void;
    isPending: boolean;
  };
  deleteMutation: {
    mutate: (id: number) => void;
    isPending: boolean;
  };
}

export function useWorkersV2ViewModel(): UseWorkersV2ViewModelReturn {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [nameSortOrder, setNameSortOrder] = useState<SortOrder>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState<EditingProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedDay, activeFilter, selectedLocation]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .neq("name", "All HNHG Locations")
        .neq("name", "All HNG Locations")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch unique environments from processed_v2 (for location filter)
  const { data: environments = [] } = useQuery({
    queryKey: ["eitje-environments-v2-all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: processedData, error: processedError } = await supabase
        .from("eitje_time_registration_shifts_processed_v2")
        .select("environment_name")
        .not("environment_name", "is", null)
        .order("environment_name");

      if (processedError) throw processedError;

      const envNames = new Set<string>();
      (processedData || []).forEach((d: { environment_name: string | null }) => {
        if (d.environment_name) {
          envNames.add(d.environment_name.trim());
        }
      });

      const commonLocations = ["Van Kinsbergen", "L'amour Toujours", "Bar Bea"];
      commonLocations.forEach(loc => envNames.add(loc));

      return Array.from(envNames).sort().map((name: string) => ({ name, id: `env_${name}` }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const locationOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All Locations" },
    ];

    const envNames = new Set(environments.map((e: { name: string; id: string }) => e.name).filter(Boolean));
    envNames.forEach((envName: string) => {
      options.push({
        value: envName,
        label: envName
      });
    });

    return options;
  }, [environments]);

  // Month options
  const MONTHS = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Calculate available days for selected month
  const availableDays = useMemo(() => {
    if (!selectedMonth) return [];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Year/Month dropdown value
  const yearMonthValue = selectedMonth
    ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
    : `${selectedYear}-all`;

  const handleYearMonthChange = (value: string) => {
    const [year, month] = value.split("-");
    setSelectedYear(Number(year));
    const monthNum = month === "all" ? null : Number(month);
    setSelectedMonth(monthNum);
    if (monthNum !== null) {
      setSelectedDay(null);
    }
  };

  const handleDayChange = (value: string) => {
    const day = value === "all" ? null : Number(value);
    setSelectedDay(day);
  };

  // Build query params
  const queryParams = useMemo<WorkersV2QueryParams>(() => {
    return {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      year: selectedYear,
      month: selectedMonth,
      day: selectedDay,
      locationId: selectedLocation !== "all" ? selectedLocation : undefined,
      activeOnly: activeFilter === "active" ? true : activeFilter === "inactive" ? false : null,
    };
  }, [currentPage, activeFilter, selectedYear, selectedMonth, selectedDay, selectedLocation]);

  // Fetch worker profiles
  const { data, isLoading, error } = useQuery({
    queryKey: ["worker-profiles-v2", queryParams],
    queryFn: () => fetchWorkerProfiles(queryParams),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<WorkerProfile> }) => {
      const response = await fetch(`/api/eitje/v2/worker-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2"] });
      setEditingId(null);
      setEditingProfile(null);
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (profile: Omit<WorkerProfile, "id" | "created_at" | "updated_at">) => {
      const response = await fetch("/api/eitje/v2/worker-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2"] });
      setIsCreating(false);
      setEditingProfile(null);
      toast({
        title: "Success",
        description: "Worker profile created successfully",
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/eitje/v2/worker-profiles/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2"] });
      toast({
        title: "Success",
        description: "Worker profile deleted successfully",
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

  // Handle name column sorting - use useCallback to prevent function recreation
  const handleNameSort = useCallback(() => {
    setNameSortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  }, []);

  // Sort records by name
  const sortedRecords = useMemo(() => {
    if (!data?.records || nameSortOrder === null) return data?.records || [];

    const sorted = [...data.records].sort((a: EditingProfile, b: EditingProfile) => {
      const nameA = (a.user_name || `User ${a.eitje_user_id}`).toLowerCase();
      const nameB = (b.user_name || `User ${b.eitje_user_id}`).toLowerCase();

      if (nameA < nameB) return nameSortOrder === "asc" ? -1 : 1;
      if (nameA > nameB) return nameSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data?.records, nameSortOrder]);

  const handleEdit = (profile: EditingProfile) => {
    setEditingId(profile.id!);
    setEditingProfile({ ...profile });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingProfile(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingProfile) return;

    if (isCreating) {
      const { id, user_name, ...profile } = editingProfile;
      createMutation.mutate(profile);
    } else if (editingId) {
      const { id, user_name, created_at, updated_at, ...updates } = editingProfile;
      updateMutation.mutate({ id: editingId, updates });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this worker profile?")) {
      deleteMutation.mutate(id);
    }
  };

  const totalPages = data?.totalPages || 1;

  return {
    // State
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedLocation,
    activeFilter,
    nameSortOrder,
    currentPage,
    editingId,
    editingProfile,
    isCreating,

    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedDay,
    setSelectedLocation,
    setActiveFilter,
    setNameSortOrder,
    setCurrentPage,
    setEditingId,
    setEditingProfile,
    setIsCreating,

    // Data
    locationOptions,
    locations,
    years,
    months: MONTHS,
    availableDays,
    yearMonthValue,
    sortedRecords,
    data,
    isLoading,
    error: error as Error | null,
    totalPages,

    // Handlers
    handleYearMonthChange,
    handleDayChange,
    handleNameSort,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
    updateMutation,
    createMutation,
    deleteMutation,
  };
}

