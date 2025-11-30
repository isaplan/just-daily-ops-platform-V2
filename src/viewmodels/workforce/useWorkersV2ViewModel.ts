/**
 * Workers V2 ViewModel Layer
 * Custom hook that manages all business logic, state, and data fetching
 * Uses GraphQL for data operations
 */

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getLocations } from "@/lib/services/graphql/queries";
import { 
  getWorkerProfiles,
  type WorkerProfile,
  type WorkerProfileFilters 
} from "@/lib/services/graphql/queries";
import {
  createWorkerProfile,
  updateWorkerProfile,
  deleteWorkerProfile,
  type WorkerProfileInput,
} from "@/lib/services/graphql/mutations";
import { LocationOption, SortOrder } from "@/models/workforce/workers-v2.model";

const ITEMS_PER_PAGE = 50;

export interface UseWorkersV2ViewModelReturn {
  // State
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  activeFilter: "all" | "active" | "inactive";
  contractTypeFilter: string;
  showAllColumns: boolean;
  nameSortOrder: SortOrder;
  currentPage: number;
  editingId: string | null;
  editingProfile: WorkerProfile | null;
  isCreating: boolean;

  // Setters
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedDay: (day: number | null) => void;
  setSelectedLocation: (location: string) => void;
  setActiveFilter: (filter: "all" | "active" | "inactive") => void;
  setContractTypeFilter: (type: string) => void;
  setShowAllColumns: (show: boolean) => void;
  setNameSortOrder: (order: SortOrder) => void;
  setCurrentPage: (page: number) => void;
  setEditingId: (id: string | null) => void;
  setEditingProfile: (profile: WorkerProfile | null) => void;
  setIsCreating: (creating: boolean) => void;

  // Data
  locationOptions: LocationOption[];
  years: number[];
  months: Array<{ value: number; label: string }>;
  availableDays: number[];
  yearMonthValue: string;
  sortedRecords: WorkerProfile[];
  data: {
    records: WorkerProfile[];
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
  handleEdit: (profile: WorkerProfile) => void;
  handleCancel: () => void;
  handleSave: () => void;
  handleDelete: (id: string) => void;
  updateMutation: {
    mutate: (args: { id: string; updates: WorkerProfileInput }) => void;
    isPending: boolean;
  };
  createMutation: {
    mutate: (profile: WorkerProfileInput) => void;
    isPending: boolean;
  };
  deleteMutation: {
    mutate: (id: string) => void;
    isPending: boolean;
  };
}

export function useWorkersV2ViewModel(initialData?: { workersData?: any; locations?: any[] }): UseWorkersV2ViewModelReturn {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [contractTypeFilter, setContractTypeFilter] = useState<string>("all");
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [nameSortOrder, setNameSortOrder] = useState<SortOrder>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<WorkerProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedDay, activeFilter, selectedLocation, contractTypeFilter]);

  // Fetch locations via GraphQL
  const { data: locations = initialData?.locations || [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    initialData: initialData?.locations,
    staleTime: 10 * 60 * 1000,
  });

  const locationOptions = useMemo<LocationOption[]>(() => {
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

  // Build query filters
  const queryFilters = useMemo<WorkerProfileFilters>(() => {
    const filters: WorkerProfileFilters = {};
    
    if (selectedLocation !== "all") {
      filters.locationId = selectedLocation;
    }
    
    if (activeFilter === "active") {
      filters.activeOnly = true;
    } else if (activeFilter === "inactive") {
      filters.activeOnly = false;
    }
    
    return filters;
  }, [selectedLocation, activeFilter]);

  // Fetch worker profiles via GraphQL
  const { data, isLoading, error } = useQuery({
    queryKey: ["worker-profiles-v2-graphql", selectedYear, selectedMonth, selectedDay, currentPage, queryFilters],
    queryFn: () => getWorkerProfiles(
      selectedYear,
      selectedMonth,
      selectedDay,
      currentPage,
      ITEMS_PER_PAGE,
      queryFilters
    ),
    initialData: currentPage === 1 && selectedYear === new Date().getFullYear() && !selectedMonth && !selectedDay ? initialData?.workersData : undefined,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (profile: WorkerProfileInput) => {
      return await createWorkerProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2-graphql"] });
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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WorkerProfileInput }) => {
      return await updateWorkerProfile(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2-graphql"] });
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteWorkerProfile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profiles-v2-graphql"] });
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

  // Handle name column sorting
  const handleNameSort = useCallback(() => {
    setNameSortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  }, []);

  // Filter and sort records
  const sortedRecords = useMemo(() => {
    let records = data?.records || [];

    // Filter by contract type (case-insensitive, handle variations)
    if (contractTypeFilter !== "all") {
      records = records.filter((record) => {
        const type = record.contractType?.toLowerCase() || "";
        const filter = contractTypeFilter.toLowerCase();
        
        // Handle "Flexible" matching "flex"
        if (filter === "flex" && type === "flexible") return true;
        
        // Handle "Contract" matching "uren contract"
        if (filter === "contract" && (
          type.includes("uren contract") || 
          type.includes("urencontract") ||
          type === "contract"
        )) return true;
        
        // Handle "Nul Uren" matching variations
        if (filter === "nul uren" && (
          type.includes("nul uren") || 
          type.includes("nul-uren") ||
          type.includes("nulurencontract")
        )) return true;
        
        return type === filter;
      });
    }

    // Sort by name
    if (nameSortOrder !== null) {
      records = [...records].sort((a: WorkerProfile, b: WorkerProfile) => {
        const nameA = (a.userName || `User ${a.eitjeUserId}`).toLowerCase();
        const nameB = (b.userName || `User ${b.eitjeUserId}`).toLowerCase();

        if (nameA < nameB) return nameSortOrder === "asc" ? -1 : 1;
        if (nameA > nameB) return nameSortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return records;
  }, [data?.records, nameSortOrder, contractTypeFilter]);

  const handleEdit = (profile: WorkerProfile) => {
    setEditingId(profile.id);
    setEditingProfile({ ...profile });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingProfile(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingProfile) return;

    const input: WorkerProfileInput = {
      eitjeUserId: editingProfile.eitjeUserId,
      locationId: editingProfile.locationId,
      contractType: editingProfile.contractType,
      contractHours: editingProfile.contractHours,
      hourlyWage: editingProfile.hourlyWage,
      wageOverride: editingProfile.wageOverride,
      effectiveFrom: editingProfile.effectiveFrom,
      effectiveTo: editingProfile.effectiveTo,
      notes: editingProfile.notes,
    };

    if (isCreating) {
      createMutation.mutate(input);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, updates: input });
    }
  };

  const handleDelete = (id: string) => {
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
    contractTypeFilter,
    showAllColumns,
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
    setContractTypeFilter,
    setShowAllColumns,
    setNameSortOrder,
    setCurrentPage,
    setEditingId,
    setEditingProfile,
    setIsCreating,

    // Data
    locationOptions,
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


