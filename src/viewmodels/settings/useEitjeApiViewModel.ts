/**
 * Eitje API Settings ViewModel
 * 
 * Business logic and state management for Eitje API settings page
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createApiCredential, updateApiCredential } from '@/lib/services/graphql/mutations';
import { getApiCredentials } from '@/lib/services/graphql/queries';
import {
  syncEitjeData,
  aggregateEitjeData,
  getMonthlyProgressV2,
  testEitjeConnection,
} from '@/lib/services/eitje/v2-api-service';
import type { EitjeCredentials, MonthlyProgressV2, ProcessMonthResult } from '@/models/settings/eitje-api.model';

export function useEitjeApiViewModel() {
  const queryClient = useQueryClient();

  // Credentials state
  const [credentials, setCredentials] = useState<EitjeCredentials>({
    baseUrl: 'https://open-api.eitje.app/open_api',
    partnerUsername: '',
    partnerPassword: '',
    apiUsername: '',
    apiPassword: '',
    isActive: true,
  });
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Progress V2 state
  const [processingV2Months, setProcessingV2Months] = useState<Set<string>>(new Set());

  // Load credentials query
  const { data: credentialsData, isLoading: isLoadingCredentials, error: credentialsError } = useQuery({
    queryKey: ['eitje-credentials'],
    queryFn: async () => {
      try {
        const creds = await getApiCredentials('eitje');
        return creds.length > 0 ? creds[0] : null;
      } catch (error: any) {
        // If MongoDB connection fails, return null to allow user to still enter credentials
        console.warn('[Eitje API ViewModel] Failed to load credentials:', error.message);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Update local state when credentials are loaded
  useEffect(() => {
    if (credentialsData) {
      setCredentialId(credentialsData.id);
      setCredentials({
        baseUrl: credentialsData.baseUrl || 'https://open-api.eitje.app/open_api',
        partnerUsername: credentialsData.additionalConfig?.partner_username || '',
        partnerPassword: credentialsData.additionalConfig?.partner_password || '',
        apiUsername: credentialsData.additionalConfig?.api_username || '',
        apiPassword: credentialsData.additionalConfig?.api_password || '',
        isActive: credentialsData.isActive,
      });
    }
  }, [credentialsData]);

  // Save credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async (creds: EitjeCredentials) => {
      const input = {
        provider: 'eitje',
        baseUrl: creds.baseUrl,
        additionalConfig: {
          partner_username: creds.partnerUsername,
          partner_password: creds.partnerPassword,
          api_username: creds.apiUsername,
          api_password: creds.apiPassword,
        },
        isActive: creds.isActive,
      };

      if (credentialId) {
        return await updateApiCredential(credentialId, input);
      } else {
        return await createApiCredential(input);
      }
    },
    onSuccess: (data) => {
      setCredentialId(data.id);
      queryClient.invalidateQueries({ queryKey: ['eitje-credentials'] });
      toast.success('Credentials saved successfully');
      setConnectionStatus('unknown');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save credentials');
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (creds: EitjeCredentials) => {
      return await testEitjeConnection({
        baseUrl: creds.baseUrl,
        partnerUsername: creds.partnerUsername,
        partnerPassword: creds.partnerPassword,
        apiUsername: creds.apiUsername,
        apiPassword: creds.apiPassword,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        setConnectionStatus('connected');
        toast.success('Connection successful');
      } else {
        setConnectionStatus('failed');
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: () => {
      setConnectionStatus('failed');
      toast.error('Connection test failed');
    },
  });

  // Load monthly progress
  const loadMonthlyProgressV2 = useCallback(async () => {
    const years = [2024, 2025];
    const progressData: Record<string, MonthlyProgressV2> = {};

    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        const progress = await getMonthlyProgressV2(year, month);
        if (progress) {
          const monthKey = `${year}-${month}`;
          progressData[monthKey] = progress;
        }
      }
    }

    return progressData;
  }, []);

  // Process month (sync + aggregate)
  const processMonth = useCallback(async (
    month: number,
    year: number
  ): Promise<ProcessMonthResult> => {
    const monthKey = `${year}-${month}`;
    setProcessingV2Months((prev) => new Set([...prev, monthKey]));

    try {
      // Calculate date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      toast.info(`Syncing ${year}-${month}...`);

      // Split into 7-day chunks (Eitje API limit)
      const dateChunks = splitDateRange(startDate, endDate);
      let totalRecordsSaved = 0;

      // Sync each chunk
      for (const chunk of dateChunks) {
        const syncResult = await syncEitjeData(chunk.start, chunk.end, 'time_registration_shifts');
        if (!syncResult.success) {
          throw new Error(syncResult.error || `Failed to sync data for ${chunk.start} to ${chunk.end}`);
        }
        totalRecordsSaved += syncResult.recordsSaved || 0;
      }

      toast.info(`Synced ${totalRecordsSaved} records. Aggregating...`);

      // Aggregate full month
      const aggregateResult = await aggregateEitjeData(startDate, endDate);
      if (!aggregateResult.success) {
        throw new Error(aggregateResult.error || 'Failed to aggregate data');
      }

      toast.success(
        `Processing completed: ${totalRecordsSaved} synced, ${aggregateResult.recordsAggregated} aggregated`
      );

      return {
        recordsSaved: totalRecordsSaved,
        recordsAggregated: aggregateResult.recordsAggregated,
      };
    } catch (error: any) {
      toast.error(error.message || `Failed to process ${year}-${month}`);
      throw error;
    } finally {
      setProcessingV2Months((prev) => {
        const newSet = new Set(prev);
        newSet.delete(monthKey);
        return newSet;
      });
    }
  }, []);

  // Helper function to split date range into 7-day chunks
  const splitDateRange = (startDate: string, endDate: string): Array<{ start: string; end: string }> => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const chunks: Array<{ start: string; end: string }> = [];

    let currentStart = new Date(start);

    while (currentStart <= end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6); // 7 days (including start day)

      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }

      chunks.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0],
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1); // Start next chunk the day after
    }

    return chunks;
  };

  return {
    // State
    credentials,
    setCredentials,
    credentialId,
    connectionStatus,
    isLoadingCredentials,
    credentialsError,
    processingV2Months,

    // Actions
    saveCredentials: (creds: EitjeCredentials) => saveCredentialsMutation.mutate(creds),
    testConnection: (creds: EitjeCredentials) => testConnectionMutation.mutate(creds),
    loadMonthlyProgressV2,
    processMonth,

    // Loading states
    isSaving: saveCredentialsMutation.isPending,
    isTesting: testConnectionMutation.isPending,
  };
}

