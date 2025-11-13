/**
 * Finance Eitje Data Workers ViewModel Layer
 * Business logic and state management for Eitje workers data
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkersData } from "@/lib/services/finance/eitje-data-workers.service";
import type { WorkersDataResponse } from "@/models/finance/eitje-data-workers.model";

const ITEMS_PER_PAGE = 50;

export function useEitjeDataWorkersViewModel() {
  // UI State
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Fetch workers data
  const { data, isLoading, error } = useQuery<WorkersDataResponse>({
    queryKey: ["eitje-workers", currentPage],
    queryFn: () =>
      fetchWorkersData({
        page: currentPage,
        itemsPerPage: ITEMS_PER_PAGE,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  return {
    // State
    currentPage,
    setCurrentPage,
    showAllColumns,
    setShowAllColumns,

    // Data
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  };
}



