/**
 * Data Reservations ViewModel Layer
 * Business logic for reservations data
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReservationsData } from "@/lib/services/data/reservations.service";

export function useReservationsViewModel() {
  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ["reservations-data"],
    queryFn: fetchReservationsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    reservationsData: reservationsData || [],
    isLoading,
  };
}




