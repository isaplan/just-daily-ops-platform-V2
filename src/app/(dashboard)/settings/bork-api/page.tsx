"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, TestTube, CheckCircle, XCircle, Settings, BarChart3, RefreshCw, Clock, ChevronDown, ChevronUp, Plus, Trash2, Database } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApiConnection {
  id: string;
  location: string;
  locationId: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
}

export default function BorkApiSettingsPage() {
  // Credentials state (no functionality)
  const [connections, setConnections] = useState<ApiConnection[]>([
    {
      id: "1",
      location: "Bar Bea",
      locationId: "550e8400-e29b-41d4-a716-446655440002",
      apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
      baseUrl: "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com",
      isActive: true
    },
    {
      id: "2", 
      location: "Van Kinsbergen",
      locationId: "550e8400-e29b-41d4-a716-446655440001",
      apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
      baseUrl: "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com",
      isActive: true
    },
    {
      id: "3",
      location: "L'Amour Toujours", 
      locationId: "550e8400-e29b-41d4-a716-446655440003",
      apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
      baseUrl: "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com",
      isActive: true
    }
  ]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Daily Data Cronjob state (no functionality)
  const [isCronjobActive, setIsCronjobActive] = useState(false);
  const [isTogglingCronjob, setIsTogglingCronjob] = useState(false);
  const [syncMode, setSyncMode] = useState('incremental');
  const [syncInterval, setSyncInterval] = useState(60);
  const [enabledEndpoints, setEnabledEndpoints] = useState({
    sales: true,
  });
  const [quietHours, setQuietHours] = useState({ start: '02:00', end: '06:00' });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [lastRunDaily, setLastRunDaily] = useState<Date | null>(null);

  // Historical Data Cronjob state (no functionality)
  const [isHistoricalCronjobActive, setIsHistoricalCronjobActive] = useState(false);
  const [isTogglingHistoricalCronjob, setIsTogglingHistoricalCronjob] = useState(false);
  const [enabledHistoricalEndpoints, setEnabledHistoricalEndpoints] = useState({
    sales: true,
  });
  const [isSavingHistoricalConfig, setIsSavingHistoricalConfig] = useState(false);
  const [isTestingHistoricalSync, setIsTestingHistoricalSync] = useState(false);
  const [lastRunHistorical, setLastRunHistorical] = useState<Date | null>(null);
  const [isRunningNowDaily, setIsRunningNowDaily] = useState(false);
  const [isRunningNowHistorical, setIsRunningNowHistorical] = useState(false);

  // Master Data Sync state
  const [isMasterDataCronjobActive, setIsMasterDataCronjobActive] = useState(false);
  const [isTogglingMasterDataCronjob, setIsTogglingMasterDataCronjob] = useState(false);
  const [enabledMasterDataEndpoints, setEnabledMasterDataEndpoints] = useState({
    product_groups: true,
    payment_methods: true,
    cost_centers: true,
    users: true,
  });
  const [masterDataSyncInterval, setMasterDataSyncInterval] = useState(86400); // 24 hours in seconds
  const [isSavingMasterDataConfig, setIsSavingMasterDataConfig] = useState(false);
  const [isTestingMasterDataSync, setIsTestingMasterDataSync] = useState(false);
  const [isRunningNowMasterData, setIsRunningNowMasterData] = useState(false);
  const [lastRunMasterData, setLastRunMasterData] = useState<Date | null>(null);
  const [masterDataSyncResults, setMasterDataSyncResults] = useState<any>(null);

  // Backward Sync state (no functionality)
  const [monthlyProgressV2, setMonthlyProgressV2] = useState<Record<string, any>>({});
  const [isLoadingV2Progress, setIsLoadingV2Progress] = useState(false);
  const [processingV2Months, setProcessingV2Months] = useState<Set<string>>(new Set());

  // Backward Sync handlers
  const handleLoadProgress = async () => {
    setIsLoadingV2Progress(true);
    try {
      // TODO: Implement progress loading from API
      // For now, just show a message
      toast.info("Load Progress V2 Data functionality not yet implemented");
    } catch (error: any) {
      console.error('[Bork API] Error loading progress:', error);
      toast.error(`Failed to load progress: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingV2Progress(false);
    }
  };

  const handleProcessAll = async () => {
    const startYear = 2024;
    const startMonth = 1;
    const today = new Date();
    const endYear = today.getFullYear();
    const endMonth = today.getMonth() + 1; // Current month (1-12)
    
    toast.info(`Starting full backward sync from Jan 1, 2024 to yesterday...`);
    
    // Process all months sequentially
    for (let year = startYear; year <= endYear; year++) {
      const startMonthForYear = year === startYear ? startMonth : 1;
      const endMonthForYear = year === endYear ? endMonth : 12;
      
      for (let month = startMonthForYear; month <= endMonthForYear; month++) {
        await handleProcessV2Month(month, year);
        // Small delay between months to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    toast.success('Full backward sync completed!');
  };

  // Load cron job status on mount
  useEffect(() => {
    const loadCronStatus = async () => {
      try {
        // Load daily data cron status
        const dailyResponse = await fetch('/api/bork/v2/cron?jobType=daily-data');
        if (dailyResponse.ok) {
          const text = await dailyResponse.text();
          if (text) {
            try {
              const dailyData = JSON.parse(text);
              if (dailyData.success && dailyData.data) {
                setIsCronjobActive(dailyData.data.isActive || false);
                setSyncInterval(dailyData.data.syncInterval || 60);
                setEnabledEndpoints(dailyData.data.enabledEndpoints || { sales: true });
                setQuietHours(dailyData.data.quietHours || { start: '02:00', end: '06:00' });
                if (dailyData.data.lastRun) {
                  setLastRunDaily(new Date(dailyData.data.lastRun));
                }
              }
            } catch (parseError) {
              console.warn('[Bork API] Failed to parse daily cron status:', parseError);
            }
          }
        }

        // Load historical data cron status
        const historicalResponse = await fetch('/api/bork/v2/cron?jobType=historical-data');
        if (historicalResponse.ok) {
          const text = await historicalResponse.text();
          if (text) {
            try {
              const historicalData = JSON.parse(text);
              if (historicalData.success && historicalData.data) {
                setIsHistoricalCronjobActive(historicalData.data.isActive || false);
                setEnabledHistoricalEndpoints(historicalData.data.enabledEndpoints || { sales: true });
                if (historicalData.data.lastRun) {
                  setLastRunHistorical(new Date(historicalData.data.lastRun));
                }
              }
            } catch (parseError) {
              console.warn('[Bork API] Failed to parse historical cron status:', parseError);
            }
          }
        }

        // Load master data cron status
        const masterDataResponse = await fetch('/api/bork/v2/cron?jobType=master-data');
        if (masterDataResponse.ok) {
          const text = await masterDataResponse.text();
          if (text) {
            try {
              const masterDataData = JSON.parse(text);
              if (masterDataData.success && masterDataData.data) {
                setIsMasterDataCronjobActive(masterDataData.data.isActive || false);
                setMasterDataSyncInterval(masterDataData.data.syncInterval || 86400);
                setEnabledMasterDataEndpoints(masterDataData.data.enabledMasterEndpoints || {
                  product_groups: true,
                  payment_methods: true,
                  cost_centers: true,
                  users: true,
                });
                if (masterDataData.data.lastRun) {
                  setLastRunMasterData(new Date(masterDataData.data.lastRun));
                }
              }
            } catch (parseError) {
              console.warn('[Bork API] Failed to parse master data cron status:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('[Bork API] Error loading cron status:', error);
      }
    };

    loadCronStatus();
  }, []);

  // Cron job handlers
  const handleSaveCronjobConfig = async () => {
    setIsSavingConfig(true);
    try {
      // First update config
      const updateResponse = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          jobType: 'daily-data',
          config: {
            isActive: isCronjobActive,
            syncInterval,
            enabledEndpoints,
            quietHours,
            schedule: syncInterval >= 60
              ? `0 */${Math.floor(syncInterval / 60)} * * *`
              : `*/${syncInterval} * * * *`,
          },
        }),
      });

      const result = await updateResponse.json();
      if (!updateResponse.ok || !result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      toast.success('Daily data cronjob configuration saved successfully');
    } catch (error: any) {
      console.error('[Bork API] Error saving cron config:', error);
      toast.error(error.message || 'Failed to save cronjob configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleCronjob = async () => {
    setIsTogglingCronjob(true);
    try {
      // If inactive, update config first
      if (!isCronjobActive) {
        await handleSaveCronjobConfig();
      }

      const action = isCronjobActive ? 'stop' : 'start';
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobType: 'daily-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} cronjob`);
      }

      setIsCronjobActive(!isCronjobActive);
      toast.success(`Daily data cronjob ${action === 'start' ? 'started' : 'stopped'} successfully`);
      
      // Reload status to get updated lastRun
      const statusResponse = await fetch('/api/bork/v2/cron?jobType=daily-data');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success && statusData.data?.lastRun) {
          setLastRunDaily(new Date(statusData.data.lastRun));
        }
      }
    } catch (error: any) {
      console.error('[Bork API] Error toggling cronjob:', error);
      toast.error(error.message || 'Failed to toggle cronjob');
    } finally {
      setIsTogglingCronjob(false);
    }
  };

  const handleTestSync = async () => {
    setIsTestingSync(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const activeConnections = connections.filter(c => c.isActive);

      if (activeConnections.length === 0) {
        toast.error('No active connections found');
        return;
      }

      let totalRecords = 0;
      for (const connection of activeConnections) {
        try {
          const response = await fetch('/api/bork/v2/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locationId: connection.locationId,
              startDate: today,
              endDate: today,
              baseUrl: connection.baseUrl,
              apiKey: connection.apiKey,
              locationName: connection.location,
            }),
          });

          const result = await response.json();
          if (result.success) {
            totalRecords += result.recordsSaved || 0;
          }
        } catch (error: any) {
          console.error(`[Bork API] Error testing sync for ${connection.location}:`, error);
        }
      }

      toast.success(`Test sync completed: ${totalRecords} records synced`);
    } catch (error: any) {
      console.error('[Bork API] Error testing sync:', error);
      toast.error(error.message || 'Failed to test sync');
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNowDaily(true);
    try {
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-now',
          jobType: 'daily-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to run cron job');
      }

      toast.success('Cron job executed successfully');
      
      // Reload status
      const statusResponse = await fetch('/api/bork/v2/cron?jobType=daily-data');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success && statusData.data?.lastRun) {
          setLastRunDaily(new Date(statusData.data.lastRun));
        }
      }
    } catch (error: any) {
      console.error('[Bork API] Error running cron job:', error);
      toast.error(error.message || 'Failed to run cron job');
    } finally {
      setIsRunningNowDaily(false);
    }
  };

  // Historical cron handlers
  const handleSaveHistoricalConfig = async () => {
    setIsSavingHistoricalConfig(true);
    try {
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          jobType: 'historical-data',
          config: {
            isActive: isHistoricalCronjobActive,
            enabledEndpoints: enabledHistoricalEndpoints,
            schedule: '0 1 * * *', // Daily at 01:00
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      toast.success('Historical data cronjob configuration saved successfully');
    } catch (error: any) {
      console.error('[Bork API] Error saving historical config:', error);
      toast.error(error.message || 'Failed to save historical cronjob configuration');
    } finally {
      setIsSavingHistoricalConfig(false);
    }
  };

  const handleToggleHistoricalCronjob = async () => {
    setIsTogglingHistoricalCronjob(true);
    try {
      if (!isHistoricalCronjobActive) {
        await handleSaveHistoricalConfig();
      }

      const action = isHistoricalCronjobActive ? 'stop' : 'start';
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobType: 'historical-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} cronjob`);
      }

      setIsHistoricalCronjobActive(!isHistoricalCronjobActive);
      toast.success(`Historical data cronjob ${action === 'start' ? 'started' : 'stopped'} successfully`);
    } catch (error: any) {
      console.error('[Bork API] Error toggling historical cronjob:', error);
      toast.error(error.message || 'Failed to toggle historical cronjob');
    } finally {
      setIsTogglingHistoricalCronjob(false);
    }
  };

  const handleRunNowHistorical = async () => {
    setIsRunningNowHistorical(true);
    try {
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-now',
          jobType: 'historical-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to run cron job');
      }

      toast.success('Historical cron job executed successfully');
      
      // Reload status
      const statusResponse = await fetch('/api/bork/v2/cron?jobType=historical-data');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success && statusData.data?.lastRun) {
          setLastRunHistorical(new Date(statusData.data.lastRun));
        }
      }
    } catch (error: any) {
      console.error('[Bork API] Error running historical cron job:', error);
      toast.error(error.message || 'Failed to run historical cron job');
    } finally {
      setIsRunningNowHistorical(false);
    }
  };

  // Master Data cron handlers
  const handleSaveMasterDataConfig = async () => {
    setIsSavingMasterDataConfig(true);
    try {
      // Convert sync interval to cron schedule (86400 seconds = daily)
      let schedule = '0 2 * * *'; // Default: Daily at 2 AM
      if (masterDataSyncInterval === 86400) {
        schedule = '0 2 * * *'; // Daily
      } else if (masterDataSyncInterval === 604800) {
        schedule = '0 2 * * 0'; // Weekly (Sunday)
      } else if (masterDataSyncInterval === 2592000) {
        schedule = '0 2 1 * *'; // Monthly (1st of month)
      }

      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          jobType: 'master-data',
          config: {
            isActive: isMasterDataCronjobActive,
            syncInterval: masterDataSyncInterval,
            enabledMasterEndpoints: enabledMasterDataEndpoints,
            schedule,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save master data config');
      }

      toast.success('Master data cron configuration saved successfully');
    } catch (error: any) {
      console.error('[Bork API] Error saving master data config:', error);
      toast.error(error.message || 'Failed to save master data config');
    } finally {
      setIsSavingMasterDataConfig(false);
    }
  };

  const handleToggleMasterDataCronjob = async () => {
    setIsTogglingMasterDataCronjob(true);
    try {
      const action = isMasterDataCronjobActive ? 'stop' : 'start';
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobType: 'master-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${action} cronjob`);
      }

      setIsMasterDataCronjobActive(!isMasterDataCronjobActive);
      toast.success(`Master data cronjob ${action === 'start' ? 'started' : 'stopped'} successfully`);
    } catch (error: any) {
      console.error('[Bork API] Error toggling master data cronjob:', error);
      toast.error(error.message || 'Failed to toggle master data cronjob');
    } finally {
      setIsTogglingMasterDataCronjob(false);
    }
  };

  const handleTestMasterDataSync = async () => {
    setIsTestingMasterDataSync(true);
    setMasterDataSyncResults(null);
    try {
      const activeConnections = connections.filter(c => c.isActive);
      if (activeConnections.length === 0) {
        toast.error('No active connections found');
        return;
      }

      const results: any = {};
      let totalRecords = 0;

      for (const connection of activeConnections) {
        results[connection.locationId] = {};
        
        for (const [endpointKey, enabled] of Object.entries(enabledMasterDataEndpoints)) {
          if (!enabled) continue;
          
          const endpointMap: Record<string, string> = {
            product_groups: 'product_groups',
            payment_methods: 'payment_methods',
            cost_centers: 'cost_centers',
            users: 'users',
          };
          
          const endpoint = endpointMap[endpointKey];
          if (!endpoint) continue;

          try {
            const response = await fetch('/api/bork/v2/master-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                locationId: connection.locationId,
                endpoint,
                baseUrl: connection.baseUrl,
                apiKey: connection.apiKey,
              }),
            });

            const result = await response.json();
            if (result.success) {
              results[connection.locationId][endpoint] = {
                success: true,
                recordsSaved: result.recordsSaved || 0,
              };
              totalRecords += result.recordsSaved || 0;
            } else {
              results[connection.locationId][endpoint] = {
                success: false,
                error: result.error || 'Unknown error',
              };
            }
          } catch (error: any) {
            results[connection.locationId][endpoint] = {
              success: false,
              error: error.message || 'Request failed',
            };
          }
        }
      }

      setMasterDataSyncResults(results);
      toast.success(`Test sync completed: ${totalRecords} total records synced`);
    } catch (error: any) {
      console.error('[Bork API] Error testing master data sync:', error);
      toast.error(error.message || 'Failed to test master data sync');
    } finally {
      setIsTestingMasterDataSync(false);
    }
  };

  const handleRunNowMasterData = async () => {
    setIsRunningNowMasterData(true);
    setMasterDataSyncResults(null);
    try {
      const response = await fetch('/api/bork/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-now',
          jobType: 'master-data',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to run master data cron job');
      }

      toast.success('Master data cron job executed successfully');
      
      // Reload status
      const statusResponse = await fetch('/api/bork/v2/cron?jobType=master-data');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success && statusData.data?.lastRun) {
          setLastRunMasterData(new Date(statusData.data.lastRun));
        }
      }

      // Also reload master data status
      const masterDataStatusResponse = await fetch('/api/bork/v2/master-sync');
      if (masterDataStatusResponse.ok) {
        const masterDataStatus = await masterDataStatusResponse.json();
        if (masterDataStatus.success) {
          setMasterDataSyncResults(masterDataStatus.status);
        }
      }
    } catch (error: any) {
      console.error('[Bork API] Error running master data cron job:', error);
      toast.error(error.message || 'Failed to run master data cron job');
    } finally {
      setIsRunningNowMasterData(false);
    }
  };

  const handleProcessV2Month = async (month: number, year: number) => {
    const monthKey = `${year}-${month}`;
    setProcessingV2Months(prev => new Set(prev).add(monthKey));

    try {
      // Calculate date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
      // For current month, only sync up to yesterday
      const today = new Date();
      const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
      let endDate: string;
      
      if (isCurrentMonth) {
        // Yesterday's date
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        endDate = yesterday.toISOString().split('T')[0];
      } else {
        // Last day of the month
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }

      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      toast.info(`Syncing ${monthName}...`);

      // Sync data for all active connections
      let totalRecordsSaved = 0;
      const activeConnections = connections.filter(c => c.isActive);

      for (const connection of activeConnections) {
        try {
          console.log(`[Bork API] Syncing ${connection.location} for ${startDate} to ${endDate}...`);
          
          const response = await fetch('/api/bork/v2/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              locationId: connection.locationId,
              startDate,
              endDate,
              baseUrl: connection.baseUrl,
              apiKey: connection.apiKey,
              locationName: connection.location,
            }),
          });

          const result = await response.json();
          console.log(`[Bork API] Sync result for ${connection.location}:`, result);

          if (result.success) {
            totalRecordsSaved += result.recordsSaved || 0;
            console.log(`[Bork API] ${connection.location}: ${result.recordsSaved || 0} records saved`);
          } else {
            console.error(`[Bork API] ${connection.location} sync failed:`, result.error);
            toast.error(`${connection.location}: ${result.error || 'Sync failed'}`);
          }
        } catch (error: any) {
          console.error(`[Bork API] Error syncing ${connection.location}:`, error);
          toast.error(`${connection.location}: ${error.message || 'Sync error'}`);
        }
      }

      if (totalRecordsSaved > 0) {
        // Aggregate data after syncing
        toast.info(`Aggregating ${monthName} data...`);
        try {
          const aggregateResponse = await fetch('/api/bork/v2/aggregate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
            }),
          });

          const aggregateResult = await aggregateResponse.json();
          
          if (aggregateResult.success) {
            console.log(`[Bork API] Aggregated ${aggregateResult.recordsAggregated || 0} records for ${monthName}`);
            toast.success(`Processing completed: ${totalRecordsSaved} raw + ${aggregateResult.recordsAggregated || 0} aggregated records for ${monthName}`);
          } else {
            console.error(`[Bork API] Aggregation failed for ${monthName}:`, aggregateResult.error);
            toast.warning(`${monthName}: Aggregation failed - ${aggregateResult.error || 'Unknown error'}`);
          }
        } catch (error: any) {
          console.error(`[Bork API] Error aggregating ${monthName}:`, error);
          toast.warning(`${monthName}: Aggregation error - ${error.message || 'Unknown error'}`);
        }
        
        // Check if data was actually stored
        try {
          const checkResponse = await fetch(`/api/bork/v2/check-data?month=${month}&year=${year}`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.success && checkData.data.totalRecords > 0) {
              console.log(`[Bork API] Verified: ${checkData.data.totalRecords} raw records stored in MongoDB`);
              toast.info(`✅ Verified: ${checkData.data.totalRecords} date records stored in database`);
            }
          }
        } catch (error) {
          console.error('[Bork API] Error checking stored data:', error);
        }
      } else {
        toast.warning(`No records synced for ${monthName}. Check if data exists for this period.`);
      }

      // Reload progress after processing
      await handleLoadProgress();
    } catch (error: any) {
      console.error(`[Bork API] Error processing month:`, error);
      toast.error(`Failed to process ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingV2Months(prev => {
        const newSet = new Set(prev);
        newSet.delete(monthKey);
        return newSet;
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      <div className="pt-20 space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Bork API Settings</h2>
        <p className="text-muted-foreground">
          Configure your Bork API connection credentials
        </p>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="daily-data-cron">Daily Data Cron</TabsTrigger>
          <TabsTrigger value="historical-data-cron">Historical Data Cron</TabsTrigger>
          <TabsTrigger value="master-data-sync">Master Sync Data</TabsTrigger>
          <TabsTrigger value="backward-sync">Backward Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>API Connection Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Manage Bork API connections for each location
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {connections.map((connection) => {
                  const isExpanded = expandedCards.has(connection.locationId);
                  
                  return (
                    <div key={connection.id} className="border rounded-lg">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const newExpanded = new Set(expandedCards);
                          if (newExpanded.has(connection.locationId)) {
                            newExpanded.delete(connection.locationId);
                          } else {
                            newExpanded.add(connection.locationId);
                          }
                          setExpandedCards(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{connection.location}</h3>
                            <Badge variant={connection.isActive ? "default" : "secondary"}>
                              {connection.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t">
                          <div className="pt-4 space-y-3">
                            <div className="text-sm text-gray-600 space-y-1 mb-4">
                              <p><strong>Location ID:</strong> {connection.locationId}</p>
                              <p><strong>API Key:</strong> {connection.apiKey || 'Not set'}</p>
                              <p><strong>Base URL:</strong> {connection.baseUrl || 'Not set'}</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`location-${connection.id}`}>Location Name</Label>
                                <Input
                                  id={`location-${connection.id}`}
                                  value={connection.location}
                                  onChange={(e) => {
                                    setConnections(connections.map(c => 
                                      c.id === connection.id ? { ...c, location: e.target.value } : c
                                    ));
                                  }}
                                  placeholder="e.g., Bar Bea"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`locationId-${connection.id}`}>Location ID</Label>
                                <Input
                                  id={`locationId-${connection.id}`}
                                  value={connection.locationId}
                                  onChange={(e) => {
                                    setConnections(connections.map(c => 
                                      c.id === connection.id ? { ...c, locationId: e.target.value } : c
                                    ));
                                  }}
                                  placeholder="e.g., 550e8400-e29b-41d4-a716-446655440002"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`apiKey-${connection.id}`}>API Key</Label>
                                <Input
                                  id={`apiKey-${connection.id}`}
                                  type="password"
                                  value={connection.apiKey}
                                  onChange={(e) => {
                                    setConnections(connections.map(c => 
                                      c.id === connection.id ? { ...c, apiKey: e.target.value } : c
                                    ));
                                  }}
                                  placeholder="Enter API key"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`baseUrl-${connection.id}`}>Base URL</Label>
                                <Input
                                  id={`baseUrl-${connection.id}`}
                                  type="url"
                                  value={connection.baseUrl}
                                  onChange={(e) => {
                                    setConnections(connections.map(c => 
                                      c.id === connection.id ? { ...c, baseUrl: e.target.value } : c
                                    ));
                                  }}
                                  placeholder="https://example.trivecgateway.com"
                                />
                              </div>
                              <div className="space-y-2 flex items-center space-x-2">
                                <Switch
                                  id={`isActive-${connection.id}`}
                                  checked={connection.isActive}
                                  onCheckedChange={(checked) => {
                                    setConnections(connections.map(c => 
                                      c.id === connection.id ? { ...c, isActive: checked } : c
                                    ));
                                  }}
                                />
                                <Label htmlFor={`isActive-${connection.id}`} className="cursor-pointer">
                                  Active
                                </Label>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 pt-2">
                              <Button
                                onClick={() => {
                                  setIsSaving(true);
                                  setTimeout(() => {
                                    setIsSaving(false);
                                    toast.info("Save functionality not yet implemented");
                                  }, 1000);
                                }}
                                disabled={isSaving}
                                className="flex-1"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Connection
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsTesting(true);
                                  setTimeout(() => {
                                    setIsTesting(false);
                                    toast.info("Test connection functionality not yet implemented");
                                  }, 1000);
                                }}
                                disabled={isTesting}
                                className="flex-1"
                              >
                                {isTesting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <TestTube className="h-4 w-4 mr-2" />
                                    Test Connection
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">API Connection Settings</h2>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSettings(false)}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Add New Connection */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Manage Connections</h3>
                    <Button onClick={() => {
                      const newConnection: ApiConnection = {
                        id: String(connections.length + 1),
                        location: "",
                        locationId: "",
                        apiKey: "",
                        baseUrl: "",
                        isActive: true
                      };
                      setConnections([...connections, newConnection]);
                      setEditingConnection(newConnection);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Connection
                    </Button>
                  </div>

                  {/* Connections List */}
                  <div className="space-y-4">
                    {connections.map((connection) => (
                      <div key={connection.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{connection.location}</h4>
                              <Badge variant={connection.isActive ? "default" : "secondary"}>
                                {connection.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Location ID:</strong> {connection.locationId}</p>
                              <p><strong>API Key:</strong> {connection.apiKey ? '••••••••' : 'Not set'}</p>
                              <p><strong>Base URL:</strong> {connection.baseUrl || 'Not set'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingConnection(connection)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setConnections(connections.filter(c => c.id !== connection.id));
                                toast.info("Delete functionality not yet implemented");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Edit Connection Form */}
                  {editingConnection && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold mb-4">
                        {editingConnection.id && connections.find(c => c.id === editingConnection!.id) 
                          ? "Edit Connection" 
                          : "Add New Connection"
                        }
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-location">Location Name</Label>
                          <Input
                            id="edit-location"
                            value={editingConnection.location}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              location: e.target.value
                            })}
                            placeholder="e.g., Bar Bea"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-locationId">Location ID</Label>
                          <Input
                            id="edit-locationId"
                            value={editingConnection.locationId}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              locationId: e.target.value
                            })}
                            placeholder="e.g., 550e8400-e29b-41d4-a716-446655440002"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-apiKey">API Key</Label>
                          <Input
                            id="edit-apiKey"
                            type="password"
                            value={editingConnection.apiKey}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              apiKey: e.target.value
                            })}
                            placeholder="Enter API key"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-baseUrl">Base URL</Label>
                          <Input
                            id="edit-baseUrl"
                            value={editingConnection.baseUrl}
                            onChange={(e) => setEditingConnection({
                              ...editingConnection,
                              baseUrl: e.target.value
                            })}
                            placeholder="https://example.trivecgateway.com"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => {
                          setConnections(connections.map(c => 
                            c.id === editingConnection.id ? editingConnection : c
                          ));
                          setEditingConnection(null);
                          toast.info("Save functionality not yet implemented");
                        }}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setEditingConnection(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily-data-cron">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Daily Data Cron Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure automated sync schedules for daily Bork API data (requires date ranges)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sync Mode</Label>
                  <RadioGroup value={syncMode} onValueChange={setSyncMode} className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="incremental" id="mode-incremental" />
                      <Label htmlFor="mode-incremental" className="cursor-pointer">
                        Incremental
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground">
                    Incremental mode syncs data automatically on a schedule.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Sync Interval (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    How often to sync data (in minutes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Data Endpoints</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which endpoints to sync automatically. These endpoints require date ranges and sync today's data for hourly updates.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="endpoint-sales" 
                        checked={enabledEndpoints.sales}
                        onCheckedChange={(checked) => 
                          setEnabledEndpoints({ ...enabledEndpoints, sales: checked === true })
                        }
                      />
                      <Label htmlFor="endpoint-sales" className="cursor-pointer font-normal">
                        Sales
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quiet Hours</Label>
                  <div className="flex items-center space-x-4">
                    <div className="space-y-1">
                      <Label htmlFor="quiet-start" className="text-xs">Start</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={quietHours.start}
                        onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quiet-end" className="text-xs">End</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={quietHours.end}
                        onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                        className="w-32"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sync will be paused during these hours
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Cron Job Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Current status of automated daily data sync jobs
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={isCronjobActive 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {isCronjobActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      <span className="font-mono">
                        {syncInterval >= 60
                          ? `0 */${Math.floor(syncInterval / 60)} * * *`
                          : `*/${syncInterval} * * * *`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span>
                        {syncInterval >= 60
                          ? `Every ${Math.floor(syncInterval / 60)} hour(s)`
                          : `Every ${syncInterval} minute(s)`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interval:</span>
                      <span>{syncInterval} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Run:</span>
                      <span>
                        {lastRunDaily 
                          ? new Date(lastRunDaily).toLocaleString('en-GB', { 
                              timeZone: 'Europe/Amsterdam',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false
                            }).replace(',', '')
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleToggleCronjob}
                  disabled={isTogglingCronjob}
                  variant={isCronjobActive ? "destructive" : "default"}
                >
                  {isTogglingCronjob ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isCronjobActive ? 'Stopping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      {isCronjobActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Stop Cronjob
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Start Cronjob
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveCronjobConfig}
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestSync}
                  disabled={isTestingSync}
                >
                  {isTestingSync ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Sync Now
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRunNow}
                  disabled={isRunningNowDaily || !isCronjobActive}
                >
                  {isRunningNowDaily ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical-data-cron">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Historical Data Cron Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure automated daily sync for the last 30 days to ensure all changes are captured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Endpoints</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    These endpoints sync the last 30 days of data to catch any missed changes or corrections. They run daily at 01:00.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="historical-endpoint-sales" 
                        checked={enabledHistoricalEndpoints.sales}
                        onCheckedChange={(checked) => 
                          setEnabledHistoricalEndpoints({ ...enabledHistoricalEndpoints, sales: checked === true })
                        }
                      />
                      <Label htmlFor="historical-endpoint-sales" className="cursor-pointer font-normal">
                        Sales
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Cron Job Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Current status of automated historical data sync jobs
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={isHistoricalCronjobActive 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {isHistoricalCronjobActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      <span className="font-mono">0 1 * * *</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span>Daily at 01:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date Range:</span>
                      <span>Last 30 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Run:</span>
                      <span>
                        {lastRunHistorical 
                          ? new Date(lastRunHistorical).toLocaleString('en-GB', { 
                              timeZone: 'Europe/Amsterdam',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false
                            }).replace(',', '')
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleToggleHistoricalCronjob}
                  disabled={isTogglingHistoricalCronjob}
                  variant={isHistoricalCronjobActive ? "destructive" : "default"}
                >
                  {isTogglingHistoricalCronjob ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isHistoricalCronjobActive ? 'Stopping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      {isHistoricalCronjobActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Stop Cronjob
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Start Cronjob
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveHistoricalConfig}
                  disabled={isSavingHistoricalConfig}
                >
                  {isSavingHistoricalConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestSync}
                  disabled={isTestingHistoricalSync}
                >
                  {isTestingHistoricalSync ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Sync Now
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRunNowHistorical}
                  disabled={isRunningNowHistorical || !isHistoricalCronjobActive}
                >
                  {isRunningNowHistorical ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="master-data-sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Master Sync Data Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure automated sync for master data (product groups, payment methods, cost centers, users)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Master Data Endpoints</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which master data endpoints to sync. These contain reference data like product hierarchies, payment methods, and user information.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-product-groups" 
                        checked={enabledMasterDataEndpoints.product_groups}
                        onCheckedChange={(checked) => 
                          setEnabledMasterDataEndpoints({ ...enabledMasterDataEndpoints, product_groups: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-product-groups" className="cursor-pointer font-normal">
                        Product Groups (includes hierarchy with parentGroupId)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-payment-methods" 
                        checked={enabledMasterDataEndpoints.payment_methods}
                        onCheckedChange={(checked) => 
                          setEnabledMasterDataEndpoints({ ...enabledMasterDataEndpoints, payment_methods: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-payment-methods" className="cursor-pointer font-normal">
                        Payment Methods
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-cost-centers" 
                        checked={enabledMasterDataEndpoints.cost_centers}
                        onCheckedChange={(checked) => 
                          setEnabledMasterDataEndpoints({ ...enabledMasterDataEndpoints, cost_centers: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-cost-centers" className="cursor-pointer font-normal">
                        Cost Centers
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-users" 
                        checked={enabledMasterDataEndpoints.users}
                        onCheckedChange={(checked) => 
                          setEnabledMasterDataEndpoints({ ...enabledMasterDataEndpoints, users: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-users" className="cursor-pointer font-normal">
                        Users/Employees
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sync Interval</Label>
                  <Select
                    value={masterDataSyncInterval.toString()}
                    onValueChange={(value) => setMasterDataSyncInterval(Number(value))}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="86400">Daily (24 hours)</SelectItem>
                      <SelectItem value="604800">Weekly (7 days)</SelectItem>
                      <SelectItem value="2592000">Monthly (30 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Master data changes infrequently, so daily sync is usually sufficient
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Cron Job Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Current status of automated master data sync jobs
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={isMasterDataCronjobActive 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {isMasterDataCronjobActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      <span className="font-mono">
                        {masterDataSyncInterval === 86400 ? '0 2 * * *' :
                         masterDataSyncInterval === 604800 ? '0 2 * * 0' :
                         '0 2 1 * *'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span>
                        {masterDataSyncInterval === 86400 ? 'Daily at 02:00' :
                         masterDataSyncInterval === 604800 ? 'Weekly on Sunday at 02:00' :
                         'Monthly on 1st at 02:00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Run:</span>
                      <span>
                        {lastRunMasterData 
                          ? new Date(lastRunMasterData).toLocaleString('en-GB', { 
                              timeZone: 'Europe/Amsterdam',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </span>
                    </div>
                    {masterDataSyncResults && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-semibold mb-2">Last Sync Results:</h5>
                        <div className="space-y-1 text-xs">
                          {Object.entries(masterDataSyncResults).map(([endpoint, data]: [string, any]) => (
                            <div key={endpoint} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{endpoint.replace('_', ' ')}:</span>
                              <span>{data.count || 0} records</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleToggleMasterDataCronjob}
                  disabled={isTogglingMasterDataCronjob}
                  variant={isMasterDataCronjobActive ? "destructive" : "default"}
                >
                  {isTogglingMasterDataCronjob ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isMasterDataCronjobActive ? 'Stopping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      {isMasterDataCronjobActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Stop Cronjob
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Start Cronjob
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveMasterDataConfig}
                  disabled={isSavingMasterDataConfig}
                >
                  {isSavingMasterDataConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestMasterDataSync}
                  disabled={isTestingMasterDataSync}
                >
                  {isTestingMasterDataSync ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Sync Now
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRunNowMasterData}
                  disabled={isRunningNowMasterData || !isMasterDataCronjobActive}
                >
                  {isRunningNowMasterData ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backward-sync">
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
              {/* Load Progress Button */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button onClick={handleLoadProgress} disabled={isLoadingV2Progress}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {isLoadingV2Progress ? 'Loading...' : 'Load Progress V2 Data'}
                  </Button>
                  <Button 
                    onClick={handleProcessAll} 
                    disabled={processingV2Months.size > 0}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Process All (Jan 2024 - Yesterday)
                  </Button>
                </div>
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
                      const endpointData = progress?.endpoints?.sales || { processedV2Count: 0, isProcessed: false };

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
                            {/* Status Summary */}
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

                            {/* Endpoint Status */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="capitalize">Sales Data</span>
                                <div className="flex items-center space-x-1">
                                  {allProcessed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  )}
                                  <span className="text-muted-foreground">{endpointData.processedV2Count || 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Process Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessV2Month(month, 2024)}
                                disabled={processingV2Months.has(monthKey)}
                                className="w-full"
                              >
                                {processingV2Months.has(monthKey) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Process V2
                                  </>
                                )}
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
                      const monthKey = `2025-${month}`;
                      const progress = monthlyProgressV2[monthKey];
                      const allProcessed = progress?.allProcessed || false;
                      const endpointData = progress?.endpoints?.sales || { processedV2Count: 0, isProcessed: false };

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
                            {/* Status Summary */}
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

                            {/* Endpoint Status */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="capitalize">Sales Data</span>
                                <div className="flex items-center space-x-1">
                                  {allProcessed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  )}
                                  <span className="text-muted-foreground">{endpointData.processedV2Count || 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Process Button */}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessV2Month(month, 2025)}
                                disabled={processingV2Months.has(monthKey)}
                                className="w-full"
                              >
                                {processingV2Months.has(monthKey) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Process V2
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

