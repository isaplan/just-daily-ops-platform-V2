/**
 * Finance View Data Sales ViewModel Layer
 * Business logic and state management for sales data view
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSalesData } from "@/lib/services/finance/view-data-sales.service";
import type { SalesDataResponse } from "@/models/finance/view-data-sales.model";

export function useViewDataSalesViewModel() {
  // UI State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [dateFilter, setDateFilter] = useState("");

  // Fetch sales data
  const { data, isLoading, error } = useQuery<SalesDataResponse>({
    queryKey: ["eitje-revenue-aggregated", currentPage, rowsPerPage, dateFilter],
    queryFn: () =>
      fetchSalesData({
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



