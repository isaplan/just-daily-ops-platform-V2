/**
 * Operations Locations ViewModel Layer
 * Business logic for locations management
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocations } from "@/lib/services/operations/locations.service";

export function useLocationsViewModel() {
  const { data: locations, isLoading } = useQuery({
    queryKey: ["operations-locations"],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    locations: locations || [],
    isLoading,
  };
}




