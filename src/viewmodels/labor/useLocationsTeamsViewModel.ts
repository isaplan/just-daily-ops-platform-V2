/**
 * Locations & Teams ViewModel
 * Business logic and state management for worker profiles with location/team filtering
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchWorkersWithFilters,
  fetchLocations,
  fetchTeams,
} from '@/lib/services/labor/locations-teams.service';
import {
  FilterState,
  ActiveFilterLabels,
  CONTRACT_TYPE_OPTIONS,
  Location,
  Team,
} from '@/models/labor/locations-teams.model';

const CURRENT_YEAR = new Date().getFullYear();
const ITEMS_PER_PAGE = 50;

export function useLocationsTeamsViewModel() {
  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedContractType, setSelectedContractType] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Build filter state object
  const filters: FilterState = useMemo(
    () => ({
      year: selectedYear,
      month: selectedMonth,
      location: selectedLocation,
      team: selectedTeam,
      contractType: selectedContractType,
    }),
    [selectedYear, selectedMonth, selectedLocation, selectedTeam, selectedContractType]
  );

  // Fetch locations
  const {
    data: locations = [],
    isLoading: locationsLoading,
    error: locationsError,
  } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch teams (all teams or filtered by location)
  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ['teams', selectedLocation],
    queryFn: () => fetchTeams(selectedLocation === 'all' ? undefined : selectedLocation),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch workers with filters
  const {
    data: workersData,
    isLoading: workersLoading,
    error: workersError,
    refetch: refetchWorkers,
  } = useQuery({
    queryKey: ['workers-filtered', filters, currentPage],
    queryFn: () => fetchWorkersWithFilters(filters, currentPage, ITEMS_PER_PAGE),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Active filter labels for title
  const activeFilterLabels: ActiveFilterLabels = useMemo(() => {
    const labels: ActiveFilterLabels = {};

    // Location label
    if (selectedLocation !== 'all') {
      const location = locations.find((loc) => loc.id === selectedLocation);
      if (location) {
        labels.location = location.name;
      }
    }

    // Team label
    if (selectedTeam !== 'all') {
      const team = teams.find((t) => t.id === selectedTeam);
      if (team) {
        labels.team = team.name;
      }
    }

    // Contract type label
    if (selectedContractType !== 'all') {
      const contractType = CONTRACT_TYPE_OPTIONS.find((ct) => ct.value === selectedContractType);
      if (contractType) {
        labels.contractType = contractType.label;
      }
    }

    return labels;
  }, [selectedLocation, selectedTeam, selectedContractType, locations, teams]);

  // Build dynamic title from active filters
  const dynamicTitle = useMemo(() => {
    const parts: string[] = [];
    if (activeFilterLabels.location) parts.push(activeFilterLabels.location);
    if (activeFilterLabels.team) parts.push(activeFilterLabels.team);
    if (activeFilterLabels.contractType) parts.push(activeFilterLabels.contractType);
    
    return parts.length > 0 ? parts.join(' / ') : 'All Workers';
  }, [activeFilterLabels]);

  // Location options for filter
  const locationOptions = useMemo(() => {
    return [
      { id: 'all', name: 'All Locations' },
      ...locations,
    ];
  }, [locations]);

  // Team options for filter
  const teamOptions = useMemo(() => {
    return [
      { id: 'all', name: 'All Teams' },
      ...teams,
    ];
  }, [teams]);

  // Contract type options
  const contractTypeOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Contract Types' },
      ...CONTRACT_TYPE_OPTIONS,
    ];
  }, []);

  // Year options (current year and previous 2 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  // Month options
  const months = useMemo(() => {
    return [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' },
    ];
  }, []);

  // Handle location change (reset team filter when location changes)
  const handleLocationChange = useCallback((locationId: string) => {
    setSelectedLocation(locationId);
    setSelectedTeam('all'); // Reset team when location changes
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle team change
  const handleTeamChange = useCallback((teamId: string) => {
    setSelectedTeam(teamId);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle contract type change
  const handleContractTypeChange = useCallback((contractType: string) => {
    setSelectedContractType(contractType);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle year/month change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    setCurrentPage(1);
  }, []);

  const handleMonthChange = useCallback((month: number | null) => {
    setSelectedMonth(month);
    setCurrentPage(1);
  }, []);

  // Pagination helpers
  const totalPages = useMemo(() => {
    if (!workersData) return 1;
    return Math.ceil(workersData.total / ITEMS_PER_PAGE);
  }, [workersData]);

  // Combined loading state
  const isLoading = locationsLoading || teamsLoading || workersLoading;

  // Combined error state
  const error = locationsError || teamsError || workersError;

  return {
    // Filter state
    selectedYear,
    selectedMonth,
    selectedLocation,
    selectedTeam,
    selectedContractType,
    setSelectedYear: handleYearChange,
    setSelectedMonth: handleMonthChange,
    setSelectedLocation: handleLocationChange,
    setSelectedTeam: handleTeamChange,
    setSelectedContractType: handleContractTypeChange,

    // Filter options
    locationOptions,
    teamOptions,
    contractTypeOptions,
    years,
    months,

    // Data
    workersData,
    locations,
    teams,

    // Loading & errors
    isLoading,
    error,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,

    // Computed
    dynamicTitle,
    activeFilterLabels,

    // Actions
    refetchWorkers,
  };
}

