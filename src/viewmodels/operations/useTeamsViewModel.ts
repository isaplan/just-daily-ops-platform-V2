/**
 * Operations Teams ViewModel Layer
 * Business logic for teams management
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "@/lib/services/operations/teams.service";

export function useTeamsViewModel() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    teams: teams || [],
    isLoading,
  };
}




