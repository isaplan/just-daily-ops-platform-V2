/**
 * Data Status ViewModel
 * 
 * Business logic and state management for Data & Status page
 * Uses React Query with proper stale times for performance
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  DatabaseStats,
  DatabaseIntegrity,
  SystemStatus,
  LoginHistoryResponse,
} from '@/models/settings/data-status.model';

// API service functions
async function fetchDatabaseStats(): Promise<{ data: DatabaseStats; lastUpdated?: string }> {
  const response = await fetch('/api/admin/database-stats');
  if (!response.ok) {
    throw new Error('Failed to fetch database statistics');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch database statistics');
  }
  return { data: result.data, lastUpdated: result.lastUpdated };
}

async function fetchDatabaseIntegrity(): Promise<{ data: DatabaseIntegrity; lastUpdated?: string }> {
  const response = await fetch('/api/admin/database-integrity');
  if (!response.ok) {
    throw new Error('Failed to fetch database integrity');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch database integrity');
  }
  return { data: result.data, lastUpdated: result.lastUpdated };
}

async function fetchSystemStatus(): Promise<{ data: SystemStatus; lastUpdated?: string }> {
  const response = await fetch('/api/admin/system-status');
  if (!response.ok) {
    throw new Error('Failed to fetch system status');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch system status');
  }
  return { data: result.data, lastUpdated: result.lastUpdated };
}

async function fetchLoginHistory(page: number, limit: number): Promise<LoginHistoryResponse> {
  const response = await fetch(`/api/admin/login-history?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch login history');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch login history');
  }
  return {
    success: true,
    data: result.data,
  };
}

async function triggerReaggregation(type: 'products' | 'sales' | 'labor'): Promise<any> {
  const endpoints: Record<string, string> = {
    products: '/api/products/reaggregate-hierarchical',
    sales: '/api/bork/v2/aggregate',
    labor: '/api/eitje/v2/aggregate',
  };

  const endpoint = endpoints[type];
  if (!endpoint) {
    throw new Error(`Unknown reaggregation type: ${type}`);
  }

  // Build request body based on endpoint requirements
  let body: any = {};
  if (type === 'products') {
    // Products reaggregate doesn't require dates, but can accept productNames and force
    body = { force: true }; // Force reaggregation of all products
  } else {
    // Sales and Labor require startDate and endDate
    body = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `Failed to trigger ${type} reaggregation`;
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  // Return success response if available
  try {
    const result = await response.json();
    return result;
  } catch {
    // If no JSON response, that's okay - the request succeeded
    return { success: true };
  }
}

export function useDataStatusViewModel() {
  const queryClient = useQueryClient();
  const [loginHistoryPage, setLoginHistoryPage] = useState(1);
  const [loginHistoryLimit] = useState(50);

  // Database Statistics Query (5 minute stale time)
  const {
    data: databaseStatsResponse,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<{ data: DatabaseStats; lastUpdated?: string }>({
    queryKey: ['database-stats'],
    queryFn: fetchDatabaseStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
  const databaseStats = databaseStatsResponse?.data;
  const databaseStatsLastUpdated = databaseStatsResponse?.lastUpdated;

  // Database Integrity Query (10 minute stale time - more expensive)
  const {
    data: databaseIntegrityResponse,
    isLoading: isLoadingIntegrity,
    error: integrityError,
    refetch: refetchIntegrity,
  } = useQuery<{ data: DatabaseIntegrity; lastUpdated?: string }>({
    queryKey: ['database-integrity'],
    queryFn: fetchDatabaseIntegrity,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
  const databaseIntegrity = databaseIntegrityResponse?.data;
  const databaseIntegrityLastUpdated = databaseIntegrityResponse?.lastUpdated;

  // System Status Query (2 minute stale time - more dynamic)
  const {
    data: systemStatusResponse,
    isLoading: isLoadingSystemStatus,
    error: systemStatusError,
    refetch: refetchSystemStatus,
  } = useQuery<{ data: SystemStatus; lastUpdated?: string }>({
    queryKey: ['system-status'],
    queryFn: fetchSystemStatus,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  const systemStatus = systemStatusResponse?.data;
  const systemStatusLastUpdated = systemStatusResponse?.lastUpdated;

  // Login History Query (1 minute stale time - real-time)
  const {
    data: loginHistory,
    isLoading: isLoadingLoginHistory,
    error: loginHistoryError,
    refetch: refetchLoginHistory,
  } = useQuery<LoginHistoryResponse>({
    queryKey: ['login-history', loginHistoryPage, loginHistoryLimit],
    queryFn: () => fetchLoginHistory(loginHistoryPage, loginHistoryLimit),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Reaggregation Mutation
  const reaggregationMutation = useMutation({
    mutationFn: triggerReaggregation,
    onSuccess: (result, type) => {
      const message = result?.message || `${type.charAt(0).toUpperCase() + type.slice(1)} reaggregation started`;
      toast.success(message);
      // Invalidate related queries after a delay to allow processing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['database-stats'] });
        queryClient.invalidateQueries({ queryKey: ['database-integrity'] });
      }, 2000);
    },
    onError: (error: Error, type) => {
      toast.error(`Failed to start ${type} reaggregation: ${error.message}`);
    },
  });

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      refetchStats(),
      refetchIntegrity(),
      refetchSystemStatus(),
      refetchLoginHistory(),
    ]);
    toast.success('All data refreshed');
  };

  return {
    // Database Stats
    databaseStats,
    databaseStatsLastUpdated,
    isLoadingStats,
    statsError,
    refetchStats,

    // Database Integrity
    databaseIntegrity,
    databaseIntegrityLastUpdated,
    isLoadingIntegrity,
    integrityError,
    refetchIntegrity,

    // System Status
    systemStatus,
    systemStatusLastUpdated,
    isLoadingSystemStatus,
    systemStatusError,
    refetchSystemStatus,

    // Login History
    loginHistory: loginHistory?.data,
    isLoadingLoginHistory,
    loginHistoryError,
    refetchLoginHistory,
    loginHistoryPage,
    setLoginHistoryPage,
    loginHistoryLimit,

    // Reaggregation
    triggerReaggregation: reaggregationMutation.mutate,
    isReaggregating: reaggregationMutation.isPending,

    // Refresh all
    refreshAll,
  };
}

