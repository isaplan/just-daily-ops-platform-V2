/**
 * Finance Eitje Data Locations & Teams ViewModel Layer
 * Business logic and state management for Eitje locations and teams data
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLocationsData, fetchTeamsData } from "@/lib/services/finance/eitje-data-locations-teams.service";
import type {
  LocationsDataResponse,
  TeamsDataResponse,
} from "@/models/finance/eitje-data-locations-teams.model";

const ITEMS_PER_PAGE = 50;

export function useEitjeDataLocationsTeamsViewModel() {
  // UI State
  const [currentPageLocations, setCurrentPageLocations] = useState(1);
  const [currentPageTeams, setCurrentPageTeams] = useState(1);
  const [activeTab, setActiveTab] = useState<"locations" | "teams">("locations");
  const [showAllColumnsLocations, setShowAllColumnsLocations] = useState(false);
  const [showAllColumnsTeams, setShowAllColumnsTeams] = useState(false);

  // Fetch locations data
  const {
    data: locationsData,
    isLoading: locationsLoading,
    error: locationsError,
  } = useQuery<LocationsDataResponse>({
    queryKey: ["eitje-locations", currentPageLocations],
    queryFn: () =>
      fetchLocationsData({
        page: currentPageLocations,
        itemsPerPage: ITEMS_PER_PAGE,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch teams data
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useQuery<TeamsDataResponse>({
    queryKey: ["eitje-teams", currentPageTeams],
    queryFn: () =>
      fetchTeamsData({
        page: currentPageTeams,
        itemsPerPage: ITEMS_PER_PAGE,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Calculate total pages
  const locationsTotalPages = useMemo(() => {
    if (!locationsData?.total) return 1;
    return Math.ceil(locationsData.total / ITEMS_PER_PAGE);
  }, [locationsData?.total]);

  const teamsTotalPages = useMemo(() => {
    if (!teamsData?.total) return 1;
    return Math.ceil(teamsData.total / ITEMS_PER_PAGE);
  }, [teamsData?.total]);

  return {
    // State
    currentPageLocations,
    setCurrentPageLocations,
    currentPageTeams,
    setCurrentPageTeams,
    activeTab,
    setActiveTab,
    showAllColumnsLocations,
    setShowAllColumnsLocations,
    showAllColumnsTeams,
    setShowAllColumnsTeams,

    // Data
    locationsData,
    locationsLoading,
    locationsError,
    teamsData,
    teamsLoading,
    teamsError,

    // Computed
    locationsTotalPages,
    teamsTotalPages,
  };
}



