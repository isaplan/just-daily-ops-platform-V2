/**
 * Workforce Hours ViewModel
 * 
 * Business logic and state management for workforce hours page
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLocations, getLaborAggregated, type LaborData, type Location } from '@/lib/services/graphql/queries';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type DatePreset = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'this-year' | 'last-year';

const ITEMS_PER_PAGE = 50;

export function useHoursViewModel() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>('this-month');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate date range from preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (selectedDatePreset) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'yesterday':
        start = subDays(now, 1);
        end = subDays(now, 1);
        break;
      case 'last-7-days':
        start = subDays(now, 7);
        break;
      case 'last-30-days':
        start = subDays(now, 30);
        break;
      case 'this-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'this-year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'last-year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const locationOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Locations' },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch labor data for all locations or a specific location
  const { data: laborData = [], isLoading: isLoadingData, error } = useQuery({
    queryKey: ['labor-aggregated', selectedLocationId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (selectedLocationId === 'all') {
        // Fetch for all locations
        const promises = locations.map((location) =>
          getLaborAggregated(location.id, dateRange.start, dateRange.end)
        );
        const results = await Promise.all(promises);
        return results.flat();
      } else {
        // Fetch for specific location
        return getLaborAggregated(selectedLocationId, dateRange.start, dateRange.end);
      }
    },
    enabled: locations.length > 0 && !!dateRange.start && !!dateRange.end,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Paginate data
  const paginatedData = useMemo(() => {
    const sorted = [...laborData].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Most recent first
    });

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sorted.slice(start, end);
  }, [laborData, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(laborData.length / ITEMS_PER_PAGE);
  }, [laborData.length]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (laborData.length === 0) {
      return {
        totalHours: 0,
        totalCost: 0,
        totalRevenue: 0,
        avgLaborCostPercentage: 0,
        avgRevenuePerHour: 0,
        recordCount: 0,
      };
    }

    const totals = laborData.reduce(
      (acc, item) => ({
        totalHours: acc.totalHours + (item.totalHoursWorked || 0),
        totalCost: acc.totalCost + (item.totalWageCost || 0),
        totalRevenue: acc.totalRevenue + (item.totalRevenue || 0),
        laborCostPercentage: acc.laborCostPercentage + (item.laborCostPercentage || 0),
        revenuePerHour: acc.revenuePerHour + (item.revenuePerHour || 0),
      }),
      {
        totalHours: 0,
        totalCost: 0,
        totalRevenue: 0,
        laborCostPercentage: 0,
        revenuePerHour: 0,
      }
    );

    return {
      totalHours: totals.totalHours,
      totalCost: totals.totalCost,
      totalRevenue: totals.totalRevenue,
      avgLaborCostPercentage: totals.laborCostPercentage / laborData.length,
      avgRevenuePerHour: totals.revenuePerHour / laborData.length,
      recordCount: laborData.length,
    };
  }, [laborData]);

  return {
    // State
    selectedLocationId,
    setSelectedLocationId,
    selectedDatePreset,
    setSelectedDatePreset,
    currentPage,
    setCurrentPage,
    dateRange,

    // Data
    locations,
    locationOptions,
    laborData: paginatedData,
    allLaborData: laborData,
    summary,

    // Loading states
    isLoadingLocations,
    isLoadingData,
    isLoading: isLoadingLocations || isLoadingData,
    error,

    // Pagination
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}






