/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/eitje-api
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, TestTube, RefreshCw, Database, Settings, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EitjeCronjobConfig } from '@/components/finance/EitjeCronjobConfig';
import { CronSyncHistory } from '@/components/finance/CronSyncHistory';

interface EitjeCredentials {
  id?: string;
  provider: string;
  api_key: string;
  base_url: string;
  additional_config: {
    partner_username: string;
    partner_password: string;
    api_username: string;
    api_password: string;
    content_type: string;
    accept: string;
    timeout: number;
    retry_attempts: number;
    rate_limit: number;
  };
  is_active: boolean;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  syncTime: number;
  lastSyncDate?: string;
  nextSyncDate?: string;
}

interface RawDataRecord {
  id: string;
  location_id: string;
  date: string;
  product_name: string;
  category: string | null;
  quantity: number;
  price: number;
  revenue: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export default function EitjeSettingsPage() {
  const [credentials, setCredentials] = useState<EitjeCredentials>({
    provider: 'eitje',
    api_key: '', // Keep for compatibility but not used for auth
    base_url: 'https://open-api.eitje.app/open_api', // CORRECT BASE URL
    additional_config: {
      partner_username: '',
      partner_password: '',
      api_username: '',
      api_password: '',
      content_type: 'application/json',
      accept: 'application/json',
      timeout: 30000,
      retry_attempts: 3,
      rate_limit: 100
    },
    is_active: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingMonths, setSyncingMonths] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [rawData, setRawData] = useState<RawDataRecord[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [syncedMonths, setSyncedMonths] = useState<Set<string>>(new Set());
  const [monthlyProgress, setMonthlyProgress] = useState<Record<string, any>>({});
  const [monthlyProgressV2, setMonthlyProgressV2] = useState<Record<string, any>>({});
  const [isLoadingV2Progress, setIsLoadingV2Progress] = useState(false);
  const [processingV2Months, setProcessingV2Months] = useState<Set<string>>(new Set());
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    totalRevenue: 0,
    totalQuantity: 0,
    dateRange: { start: '', end: '' }
  });


  // DEFENSIVE: Load existing credentials
  useEffect(() => {
    loadCredentials();
    loadRawData();
    loadMonthlyProgress(); // Load progress data on mount
    
    // Initialize with months you already synced
    setSyncedMonths(new Set(['2024-1', '2025-8', '2025-9', '2025-10']));
    
  }, []);


  // DEFENSIVE: Load credentials from database
  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/eitje/credentials');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.credentials) {
          // Credentials loaded
          setCredentials(data.credentials);
        } else {
          // No credentials found, using defaults
        }
      } else {
        console.log('Failed to load credentials, using defaults');
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  // DEFENSIVE: Save credentials
  const saveCredentials = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/eitje/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (data.success) {
        // Credentials saved successfully
        setConnectionStatus('unknown'); // Reset connection status
      } else {
        console.error('Failed to save credentials:', data.error);
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // DEFENSIVE: Test connection
  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/eitje/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: credentials.base_url,
          apiKey: credentials.api_key, // Keep for compatibility
          additional_config: credentials.additional_config // Pass all 4 credentials
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('connected');
        console.log('Connection test successful');
      } else {
        setConnectionStatus('failed');
        console.error('Connection test failed:', data.error);
      }
    } catch (error) {
      setConnectionStatus('failed');
      console.error('Connection test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // DEFENSIVE: Chunk large date ranges into 7-day chunks
  const chunkDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const chunks = [];
    
    const currentStart = new Date(start);
    
    while (currentStart <= end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6); // 7 days total
      
      // Don't go beyond the original end date
      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }
      
      chunks.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      });
      
      // Move to next chunk
      currentStart.setDate(currentStart.getDate() + 7);
    }
    
    return chunks;
  };


  // DEFENSIVE: Load raw data
  const loadRawData = async () => {
    try {
      const response = await fetch('/api/eitje/raw-data');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRawData(data.data || []);
          
          // Calculate stats
          const stats = calculateDataStats(data.data || []);
          setDataStats(stats);
        }
      }
    } catch (error) {
      console.error('Failed to load raw data:', error);
    }
  };

  // DEFENSIVE: Calculate data statistics
  const calculateDataStats = (data: RawDataRecord[]) => {
    if (data.length === 0) {
      return {
        totalRecords: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        dateRange: { start: '', end: '' }
      };
    }

    const totalRevenue = data.reduce((sum, record) => sum + record.revenue, 0);
    const totalQuantity = data.reduce((sum, record) => sum + record.quantity, 0);
    const dates = data.map(record => record.date).sort();
    
    return {
      totalRecords: data.length,
      totalRevenue,
      totalQuantity,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      }
    };
  };

  // DEFENSIVE: Load monthly progress for all months
  const loadMonthlyProgress = async () => {
    try {
      setIsLoading(true);
      
      // Load progress for all months in both years using the detailed endpoint-status API
      const progressPromises = [];
      
      // Load all 12 months for 2024
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          loadMonthProgress(2024, month).then(data => ({ month, year: 2024, data }))
        );
      }
      
      // Load all 12 months for 2025
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          loadMonthProgress(2025, month).then(data => ({ month, year: 2025, data }))
        );
      }
      
      const allProgress = await Promise.all(progressPromises);
      
      // Update monthlyProgress state with detailed endpoint data
      const newMonthlyProgress: Record<string, any> = {};
      
      allProgress.forEach(({ month, year, data }) => {
        if (data) {
          const monthKey = `${year}-${month}`;
          newMonthlyProgress[monthKey] = data;
        }
      });
      
      setMonthlyProgress(newMonthlyProgress);
      // Monthly progress loaded
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Load V2 progress for all months (lazy load)
  const loadMonthlyProgressV2 = async () => {
    try {
      setIsLoadingV2Progress(true);
      
      // Load progress for all months in both years
      const progressPromises = [];
      
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          loadMonthProgressV2(2024, month).then(data => ({ month, year: 2024, data }))
        );
        progressPromises.push(
          loadMonthProgressV2(2025, month).then(data => ({ month, year: 2025, data }))
        );
      }
      
      const allProgress = await Promise.all(progressPromises);
      
      const newMonthlyProgressV2: Record<string, any> = {};
      
      allProgress.forEach(({ month, year, data }) => {
        if (data) {
          const monthKey = `${year}-${month}`;
          newMonthlyProgressV2[monthKey] = data;
        }
      });
      
      setMonthlyProgressV2(newMonthlyProgressV2);
    } catch (error) {
      console.error('Failed to load V2 progress:', error);
    } finally {
      setIsLoadingV2Progress(false);
    }
  };

  // DEFENSIVE: Load V2 progress for specific month
  const loadMonthProgressV2 = async (year: number, month: number) => {
    try {
      const response = await fetch(`/api/eitje/v2/progress?year=${year}&month=${month}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load V2 progress for ${year}-${month}:`, error);
      return null;
    }
  };

  // DEFENSIVE: Process V2 data for specific month
  const handleProcessV2Month = async (month: number, year: number) => {
    const monthKey = `${year}-${month}`;
    setProcessingV2Months(prev => new Set(prev).add(monthKey));
    
    try {
      // Calculate date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      // Process raw → processed_v2
      const processResponse = await fetch(`/api/eitje/v2/process?startDate=${startDate}&endDate=${endDate}`, {
        method: 'POST'
      });
      const processData = await processResponse.json();
      
      if (!processData.success) {
        throw new Error(processData.error || 'Failed to process data');
      }
      
      // Aggregate processed_v2 → aggregated_v2
      const aggregateResponse = await fetch(`/api/eitje/v2/aggregate?startDate=${startDate}&endDate=${endDate}`, {
        method: 'POST'
      });
      const aggregateData = await aggregateResponse.json();
      
      if (!aggregateData.success) {
        throw new Error(aggregateData.error || 'Failed to aggregate data');
      }
      
      // Refresh progress data for this month
      const monthProgress = await loadMonthProgressV2(year, month);
      if (monthProgress) {
        setMonthlyProgressV2(prev => ({
          ...prev,
          [monthKey]: monthProgress
        }));
      }
      
    } catch (error) {
      console.error(`Failed to process V2 data for ${year} month ${month}:`, error);
      alert(`Failed to process V2 data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingV2Months(prev => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  };

  // DEFENSIVE: Load history for specific month (lazy load)
  const loadHistoryV2 = async (year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    
    // If already loaded, don't reload
    if (historyData[monthKey]) {
      return;
    }
    
    try {
      const response = await fetch(`/api/eitje/v2/progress-history?year=${year}&month=${month}`);
      const data = await response.json();
      
      if (data.success) {
        setHistoryData(prev => ({
          ...prev,
          [monthKey]: data.data.history || []
        }));
      }
    } catch (error) {
      console.error(`Failed to load V2 history for ${year}-${month}:`, error);
    }
  };

  // DEFENSIVE: Load progress for specific month
  const loadMonthProgress = async (year: number, month: number) => {
    try {
      const endpoints = ['environments', 'teams', 'users', 'shift_types', 'time_registration_shifts', 'revenue_days'];
      const endpointData: Record<string, any> = {};
      
      // Load data for each endpoint
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`/api/eitje/endpoint-status?endpoint=${endpoint}&year=${year}&month=${month}`);
          const data = await response.json();
          
          if (data.success) {
            const hasRawData = data.data.rawDataCount > 0;
            const hasAggregatedData = data.data.aggregatedDataCount > 0;
            
            let status = 'not_synced';
            if (hasAggregatedData) {
              status = 'processed';
            } else if (hasRawData) {
              status = 'synced';
            }
            
            endpointData[endpoint] = {
              recordsCount: data.data.rawDataCount || 0,
              status,
              lastSync: data.data.lastSync
            };
            
            // Progress data loaded for endpoint
          } else {
            console.warn(`[loadMonthProgress] ${endpoint} for ${year}-${month}: API returned success=false`);
            endpointData[endpoint] = {
              recordsCount: 0,
              status: 'not_synced'
            };
          }
        } catch (endpointError) {
          console.error(`Failed to load ${endpoint} for ${year}-${month}:`, endpointError);
          endpointData[endpoint] = {
            recordsCount: 0,
            status: 'not_synced'
          };
        }
      }
      
      return { endpoints: endpointData };
    } catch (error) {
      console.error(`Failed to load progress for ${year}-${month}:`, error);
      return null;
    }
  };

  // DEFENSIVE: Sync specific month
  const handleSyncMonth = async (month: number, year: number = 2024) => {
    const monthKey = `${year}-${month}`;
    setSyncingMonths(prev => new Set([...prev, monthKey]));
    
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      
      // Syncing month
      
      // Sync master data endpoints (no date restrictions)
      const masterEndpoints = ['environments', 'teams', 'users', 'shift_types'];
      
      for (const endpoint of masterEndpoints) {
        const response = await fetch('/api/eitje/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            startDate,
            endDate,
            batchSize: 100
          })
        });

        const data = await response.json();
        if (data.success) {
          // Endpoint synced successfully
        } else {
          console.error(`${endpoint} sync failed:`, data.error);
        }
      }

      // Sync data endpoints with 7-day chunking
      const dataEndpoints = ['time_registration_shifts', 'revenue_days'];
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysDiff > 7) {
        // Chunking large date range
        const chunks = chunkDateRange(startDate, endDate);
        
        for (const endpoint of dataEndpoints) {
          let totalRecords = 0;
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            // Syncing chunk
            
            const response = await fetch('/api/eitje/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint,
                startDate: chunk.start,
                endDate: chunk.end,
                batchSize: 100
              })
            });

            const data = await response.json();
            if (data.success) {
              totalRecords += data.result.recordsProcessed || 0;
              // Chunk completed
            } else {
              console.error(`${endpoint} chunk ${i + 1} failed:`, data.error);
            }
          }
          // Total records synced across chunks
        }
      } else {
        // Single sync for 7 days or less
        for (const endpoint of dataEndpoints) {
          const response = await fetch('/api/eitje/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              startDate,
              endDate,
              batchSize: 100
            })
          });

          const data = await response.json();
          if (data.success) {
            // Endpoint synced
          } else {
            console.error(`${endpoint} sync failed:`, data.error);
          }
        }
      }
      
      // Track this month as synced
      setSyncedMonths(prev => new Set([...prev, monthKey]));
      
      // Auto-process the synced data into aggregated tables
      // Processing aggregated data
      try {
        const processResponse = await fetch('/api/eitje/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate,
            locationIds: [], // All locations
            includeVat: true
          })
        });
        
        const processData = await processResponse.json();
        if (processData.success) {
          // Processing completed
        } else {
          console.error('Processing failed:', processData.error);
        }
      } catch (processError) {
        console.error('Processing error:', processError);
      }
      
      // Refresh progress data for this specific month
      // Add a small delay to ensure database transactions are committed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const monthProgress = await loadMonthProgress(year, month);
      if (monthProgress) {
        setMonthlyProgress(prev => ({
          ...prev,
          [monthKey]: monthProgress
        }));
        // Progress data refreshed
      } else {
        console.warn(`Failed to load progress data for ${year} month ${month}`);
      }
      
      // Sync and processing completed
      
    } catch (error) {
      console.error(`${year} month ${month} sync failed:`, error);
    } finally {
      setSyncingMonths(prev => {
        const newSet = new Set(prev);
        newSet.delete(monthKey);
        return newSet;
      });
    }
  };

  // DEFENSIVE: Resync specific month (for complete months)
  const handleResyncMonth = async (month: number, year: number = 2024) => {
    setIsSyncing(true);
    try {
      // Resyncing month
      // Same logic as sync but with resync messaging
      await handleSyncMonth(month, year);
      // Resync completed
    } catch (error) {
      console.error(`${year} month ${month} resync failed:`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  // DEFENSIVE: Process raw data (like Bork aggregation)
  const processRawData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dataStats.dateRange.start,
          endDate: dataStats.dateRange.end,
          locationIds: [], // All locations
          includeVat: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Raw data processed successfully
        await loadRawData(); // Refresh data
      } else {
        console.error('Failed to process raw data:', data.error);
      }
    } catch (error) {
      console.error('Failed to process raw data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Test individual endpoint
  const testEndpoint = async (endpointName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: endpointName,
          startDate: '2024-10-24',
          endDate: '2024-10-25'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Endpoint test successful
        alert(`✅ ${endpointName} test successful!\n\nResponse time: ${data.result.responseTime}ms\nData count: ${data.result.dataCount || 'N/A'}`);
      } else {
        console.error(`Endpoint ${endpointName} test failed:`, data.error);
        alert(`❌ ${endpointName} test failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`Failed to test endpoint ${endpointName}:`, error);
      alert(`❌ Failed to test ${endpointName}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Sync individual endpoint
  const syncEndpoint = async (endpointName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/sync-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: endpointName,
          startDate: '2024-10-24',
          endDate: '2024-10-25'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Endpoint sync successful
        alert(`✅ ${endpointName} sync successful!\n\nRecords processed: ${data.result.recordsProcessed}\nRecords added: ${data.result.recordsAdded}\nErrors: ${data.result.errors}`);
      } else {
        console.error(`Endpoint ${endpointName} sync failed:`, data.error);
        alert(`❌ ${endpointName} sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`Failed to sync endpoint ${endpointName}:`, error);
      alert(`❌ Failed to sync ${endpointName}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Test all endpoints
  const testAllEndpoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/test-all-endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        // All endpoints test completed
        const results = data.results;
        const successful = Object.values(results).filter((r: any) => r.success).length;
        const total = Object.keys(results).length;
        alert(`✅ Tested ${successful}/${total} endpoints successfully!\n\nCheck console for detailed results.`);
      } else {
        console.error('All endpoints test failed:', data.error);
        alert(`❌ All endpoints test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to test all endpoints:', error);
      alert(`❌ Failed to test all endpoints: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eitje API Connect</h1>
          <p className="text-muted-foreground">
            Configure Eitje API credentials and manage data synchronization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'failed' ? 'destructive' : 'secondary'}>
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : connectionStatus === 'failed' ? (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Unknown
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          {/* <TabsTrigger value="sync">Data Sync</TabsTrigger> - Replaced by Progress tab */}
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="progress-v2">Progress V2</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="cronjob">Cronjob</TabsTrigger>
          {/* <TabsTrigger value="raw-data">Raw Data</TabsTrigger> - Replaced by Progress tab */}
          {/* <TabsTrigger value="processing">Data Processing</TabsTrigger> - Replaced by Progress tab */}
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Eitje API Credentials</span>
              </CardTitle>
              <CardDescription>
                Configure your Eitje API connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={credentials.base_url}
                    onChange={(e) => setCredentials(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://open-api.eitje.app/open_api"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Eitje Open API base URL
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Eitje API Authentication (4 Required Credentials)</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partner_username">Partner Username</Label>
                    <Input
                      id="partner_username"
                      value={credentials.additional_config.partner_username}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, partner_username: e.target.value }
                      }))}
                      placeholder="Your partner username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="partner_password">Partner Password</Label>
                    <Input
                      id="partner_password"
                      type="password"
                      value={credentials.additional_config.partner_password}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, partner_password: e.target.value }
                      }))}
                      placeholder="Your partner password"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api_username">API Username</Label>
                    <Input
                      id="api_username"
                      value={credentials.additional_config.api_username}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, api_username: e.target.value }
                      }))}
                      placeholder="Your API username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api_password">API Password</Label>
                    <Input
                      id="api_password"
                      type="password"
                      value={credentials.additional_config.api_password}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, api_password: e.target.value }
                      }))}
                      placeholder="Your API password"
                    />
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={credentials.additional_config.timeout}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, timeout: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="retry_attempts">Retry Attempts</Label>
                  <Input
                    id="retry_attempts"
                    type="number"
                    value={credentials.additional_config.retry_attempts}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, retry_attempts: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rate_limit">Rate Limit</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={credentials.additional_config.rate_limit}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, rate_limit: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.is_active}
                  onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>

              <div className="flex space-x-4">
                <Button onClick={saveCredentials} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Credentials
                </Button>
                
                <Button onClick={testConnection} disabled={isTesting} variant="outline">
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sync Tab - REPLACED BY PROGRESS TAB */}
        {/* <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Data Synchronization</span>
              </CardTitle>
              <CardDescription>
                Sync data from Eitje API to your database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {lastSync && (
                <Alert>
                  <AlertDescription>
                    <strong>Last Sync:</strong> {lastSync.recordsProcessed} records processed, 
                    {lastSync.recordsAdded} added, {lastSync.errors} errors in {lastSync.syncTime}ms
                  </AlertDescription>
                </Alert>
              )}

            {/* </CardContent>
          </Card>
        </TabsContent> */}

        {/* Progress Tracking Tab */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Monthly Progress Tracking</span>
              </CardTitle>
              <CardDescription>
                Track sync and process status for each month and endpoint - detailed per-endpoint monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Load Progress Button */}
              <div className="flex justify-between items-center">
                <Button onClick={loadMonthlyProgress} disabled={isLoading}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Load Progress Data'}
                </Button>
                {progressData && (
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* 2024 Monthly Progress Grid */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">2024</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2024, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2024;
                      
                      return (
                        <Card key={`2024-${month}`} className={`p-4 hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{monthName} 2024</span>
                              {isCurrentMonth && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Status Summary */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Processed"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500" title="Synced"></div>
                                <div className="w-2 h-2 rounded-full bg-red-500" title="Not Synced"></div>
                              </div>
                            </div>
                            
                            {/* Endpoint Status List */}
                            <div className="space-y-1">
                              {['environments', 'teams', 'users', 'shift_types', 'time_registration_shifts', 'revenue_days'].map((endpoint) => {
                                const monthKey = `2024-${month}`;
                                const progress = monthlyProgress[monthKey];
                                const endpointData = progress?.endpoints?.[endpoint] || { recordsCount: 0, status: 'not_synced' };
                                
                                // Get display name and format value
                                let displayName = endpoint.replace('_', ' ');
                                const displayValue = endpointData.recordsCount || 0;
                                
                                if (endpoint === 'time_registration_shifts') {
                                  displayName = 'Hours Worked';
                                } else if (endpoint === 'revenue_days') {
                                  displayName = 'Financial Records';
                                  // Show only the count, no days format
                                }
                                
                                return (
                                  <div key={endpoint} className="flex items-center justify-between text-xs">
                                    <span className="capitalize">{displayName}</span>
                                    <div className="flex items-center space-x-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        endpointData.status === 'processed' ? 'bg-green-500' :
                                        endpointData.status === 'synced' ? 'bg-yellow-500' :
                                        'bg-gray-300'
                                      }`}></div>
                                      <span className="text-muted-foreground">{displayValue}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Action Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleSyncMonth(month, 2024)}
                                disabled={syncingMonths.has(`2024-${month}`)}
                                className="w-full"
                              >
                                {syncingMonths.has(`2024-${month}`) ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Sync & Process
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* 2025 Monthly Progress Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">2025</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2025, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2025;
                      
                      return (
                        <Card key={`2025-${month}`} className={`p-4 hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{monthName} 2025</span>
                              {isCurrentMonth && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Status Summary */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Processed"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500" title="Synced"></div>
                                <div className="w-2 h-2 rounded-full bg-red-500" title="Not Synced"></div>
                              </div>
                            </div>
                            
                            {/* Endpoint Status List */}
                            <div className="space-y-1">
                              {['environments', 'teams', 'users', 'shift_types', 'time_registration_shifts', 'revenue_days'].map((endpoint) => {
                                const monthKey = `2025-${month}`;
                                const progress = monthlyProgress[monthKey];
                                const endpointData = progress?.endpoints?.[endpoint] || { recordsCount: 0, status: 'not_synced' };
                                
                                // Get display name and format value
                                let displayName = endpoint.replace('_', ' ');
                                const displayValue = endpointData.recordsCount || 0;
                                
                                if (endpoint === 'time_registration_shifts') {
                                  displayName = 'Hours Worked';
                                } else if (endpoint === 'revenue_days') {
                                  displayName = 'Financial Records';
                                  // Show only the count, no days format
                                }
                                
                                return (
                                  <div key={endpoint} className="flex items-center justify-between text-xs">
                                    <span className="capitalize">{displayName}</span>
                                    <div className="flex items-center space-x-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        endpointData.status === 'processed' ? 'bg-green-500' :
                                        endpointData.status === 'synced' ? 'bg-yellow-500' :
                                        'bg-gray-300'
                                      }`}></div>
                                      <span className="text-muted-foreground">{displayValue}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Action Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleSyncMonth(month, 2025)}
                                disabled={syncingMonths.has(`2025-${month}`)}
                                className="w-full"
                              >
                                {syncingMonths.has(`2025-${month}`) ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Sync & Process
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Status Legend</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Processed - Data synced and aggregated</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Synced - Raw data available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Not Synced - No data available</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress V2 Tracking Tab */}
        <TabsContent value="progress-v2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Monthly Progress Tracking V2</span>
              </CardTitle>
              <CardDescription>
                Track V2 processing status for each month - shows dots only if ALL endpoints are processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Load Progress Button (lazy load) */}
              <div className="flex justify-between items-center">
                <Button onClick={loadMonthlyProgressV2} disabled={isLoadingV2Progress}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoadingV2Progress ? 'Loading...' : 'Load Progress V2 Data'}
                </Button>
                {Object.keys(monthlyProgressV2).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* 2024 Monthly Progress Grid */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">2024</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2024, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2024;
                      const monthKey = `2024-${month}`;
                      const progress = monthlyProgressV2[monthKey];
                      const allProcessed = progress?.allProcessed || false;
                      const endpointData = progress?.endpoints?.time_registration_shifts || { processedV2Count: 0, isProcessed: false };
                      
                      return (
                        <Card key={monthKey} className={`p-4 hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{monthName} 2024</span>
                              {isCurrentMonth && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Status Summary - Only show dot if ALL endpoints processed */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <div className="flex items-center space-x-1">
                                {allProcessed && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" title="All endpoints processed"></div>
                                )}
                                {!allProcessed && (
                                  <div className="w-2 h-2 rounded-full bg-gray-300" title="Not all endpoints processed"></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Endpoint Status List */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="capitalize">Hours Worked</span>
                                <div className="flex items-center space-x-1">
                                  {allProcessed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  )}
                                  <span className="text-muted-foreground">{endpointData.processedV2Count || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessV2Month(month, 2024)}
                                disabled={processingV2Months.has(monthKey)}
                                className="w-full"
                              >
                                {processingV2Months.has(monthKey) ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Process V2
                              </Button>
                            </div>

                            {/* History Log (Lazy Loaded) */}
                            <div className="pt-2 border-t">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full text-xs"
                                onClick={() => {
                                  const newExpanded = { ...historyExpanded, [monthKey]: !historyExpanded[monthKey] };
                                  setHistoryExpanded(newExpanded);
                                  
                                  // Load history when expanded
                                  if (newExpanded[monthKey] && !historyData[monthKey]) {
                                    loadHistoryV2(2024, month);
                                  }
                                }}
                              >
                                {historyExpanded[monthKey] ? 'Hide' : 'Show'} History
                              </Button>
                              
                              {historyExpanded[monthKey] && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {historyData[monthKey] && historyData[monthKey].length > 0 ? (
                                    <div className="space-y-1">
                                      {historyData[monthKey].map((entry: any, idx: number) => (
                                        <div key={idx} className="p-2 bg-muted rounded">
                                          <div>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</div>
                                          <div>{entry.action || '-'} - {entry.recordsProcessed || 0} records</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-muted rounded">
                                      {historyData[monthKey] ? 'No history available' : 'Loading history...'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* 2025 Monthly Progress Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">2025</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2025, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2025;
                      const monthKey = `2025-${month}`;
                      const progress = monthlyProgressV2[monthKey];
                      const allProcessed = progress?.allProcessed || false;
                      const endpointData = progress?.endpoints?.time_registration_shifts || { processedV2Count: 0, isProcessed: false };
                      
                      return (
                        <Card key={monthKey} className={`p-4 hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{monthName} 2025</span>
                              {isCurrentMonth && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Status Summary - Only show dot if ALL endpoints processed */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <div className="flex items-center space-x-1">
                                {allProcessed && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" title="All endpoints processed"></div>
                                )}
                                {!allProcessed && (
                                  <div className="w-2 h-2 rounded-full bg-gray-300" title="Not all endpoints processed"></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Endpoint Status List */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="capitalize">Hours Worked</span>
                                <div className="flex items-center space-x-1">
                                  {allProcessed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  )}
                                  <span className="text-muted-foreground">{endpointData.processedV2Count || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessV2Month(month, 2025)}
                                disabled={processingV2Months.has(monthKey)}
                                className="w-full"
                              >
                                {processingV2Months.has(monthKey) ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Process V2
                              </Button>
                            </div>

                            {/* History Log (Lazy Loaded) */}
                            <div className="pt-2 border-t">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full text-xs"
                                onClick={() => {
                                  const newExpanded = { ...historyExpanded, [monthKey]: !historyExpanded[monthKey] };
                                  setHistoryExpanded(newExpanded);
                                  
                                  // Load history when expanded
                                  if (newExpanded[monthKey] && !historyData[monthKey]) {
                                    loadHistoryV2(2025, month);
                                  }
                                }}
                              >
                                {historyExpanded[monthKey] ? 'Hide' : 'Show'} History
                              </Button>
                              
                              {historyExpanded[monthKey] && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {historyData[monthKey] && historyData[monthKey].length > 0 ? (
                                    <div className="space-y-1">
                                      {historyData[monthKey].map((entry: any, idx: number) => (
                                        <div key={idx} className="p-2 bg-muted rounded">
                                          <div>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</div>
                                          <div>{entry.action || '-'} - {entry.recordsProcessed || 0} records</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-muted rounded">
                                      {historyData[monthKey] ? 'No history available' : 'Loading history...'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Status Legend V2</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>All endpoints processed - Green dot shown only when ALL endpoints are processed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <span>Not all endpoints processed - No dot shown</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>API Endpoints Management</span>
              </CardTitle>
              <CardDescription>
                Test and sync data from individual Eitje API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Master Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'environments', description: 'Locations and venues', icon: '🏢' },
                    { name: 'teams', description: 'Teams within environments', icon: '👥' },
                    { name: 'users', description: 'Employee information', icon: '👤' },
                    { name: 'shift_types', description: 'Available shift types', icon: '⏰' }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Labor Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Labor Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'time_registration_shifts', description: 'Actual worked shifts', icon: '⏱️', maxDays: 7 },
                    { name: 'planning_shifts', description: 'Planned shifts', icon: '📅', maxDays: 7 }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                            <p className="text-xs text-muted-foreground">Max: {endpoint.maxDays} days</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Revenue Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'revenue_days', description: 'Daily revenue data', icon: '💰', maxDays: 90 }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                            <p className="text-xs text-muted-foreground">Max: {endpoint.maxDays} days</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Test All Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={testAllEndpoints}
                  disabled={isLoading}
                  className="w-full max-w-md"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test All Endpoints
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cronjob Tab */}
        <TabsContent value="cronjob" className="space-y-6">
          <EitjeCronjobConfig />
          <CronSyncHistory />
        </TabsContent>

        {/* Raw Data Tab - REPLACED BY PROGRESS TAB */}
        {/* <TabsContent value="raw-data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Raw Data Storage</span>
              </CardTitle>
              <CardDescription>
                View and manage raw Eitje data stored in database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{dataStats.totalRecords}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">€{dataStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{dataStats.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                  <p className="text-sm">{dataStats.dateRange.start} to {dataStats.dateRange.end}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recent Records</h4>
                <div className="max-h-60 overflow-y-auto border rounded">
                  {rawData.slice(0, 10).map((record, index) => (
                    <div key={record.id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{record.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.date} • {record.quantity} units • €{record.revenue}
                        </p>
                      </div>
                      <Badge variant="outline">{record.category || 'No Category'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cronjob Tab */}
        <TabsContent value="cronjob" className="space-y-6">
          <EitjeCronjobConfig />
          <CronSyncHistory provider="eitje" limit={10} />
        </TabsContent>

        {/* Data Processing Tab - REPLACED BY PROGRESS TAB */}
        {/* <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing</CardTitle>
              <CardDescription>
                Process raw Eitje data into aggregated metrics (like Bork system)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  This will process your raw Eitje data into aggregated metrics, 
                  similar to how the Bork system works. Data will be aggregated by date and location.
                </AlertDescription>
              </Alert>

              <Button onClick={processRawData} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Processing...' : 'Process Raw Data into Aggregated Metrics'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
