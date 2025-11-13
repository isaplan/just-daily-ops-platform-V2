/**
 * Finance View Data Labor Costs ViewModel Layer
 * Business logic and state management for labor costs data view
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLaborCostsData } from "@/lib/services/finance/view-data-labor-costs.service";
import type { LaborCostsDataResponse } from "@/models/finance/view-data-labor-costs.model";

export function useViewDataLaborCostsViewModel() {
  // UI State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [dateFilter, setDateFilter] = useState("");

  // Fetch labor costs data
  const { data, isLoading, error } = useQuery<LaborCostsDataResponse>({
    queryKey: ["eitje-labor-costs-aggregated", currentPage, rowsPerPage, dateFilter],
    queryFn: () =>
      fetchLaborCostsData({
        page: currentPage,
        limit: rowsPerPage,
        dateFilter: dateFilter || undefined,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const totalPages = data?.totalPages || 1;

  // Handlers that reset pagination
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  return {
    // State
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage: handleRowsPerPageChange,
    dateFilter,
    setDateFilter: handleDateFilterChange,

    // Data
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  };
}



