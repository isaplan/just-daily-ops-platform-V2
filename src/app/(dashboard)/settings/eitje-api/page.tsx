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
import { Loader2, Save, TestTube, CheckCircle, XCircle, Settings, BarChart3, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEitjeApiViewModel } from "@/viewmodels/settings/useEitjeApiViewModel";
import type { MonthlyProgressV2 } from "@/models/settings/eitje-api.model";
import { EITJE_DATE_LIMITS } from "@/lib/eitje/v2-types";

export default function EitjeApiSettingsPage() {
  const {
    credentials,
    setCredentials,
    credentialId,
    connectionStatus,
    isLoadingCredentials,
    credentialsError,
    processingV2Months,
    saveCredentials,
    testConnection,
    loadMonthlyProgressV2,
    processMonth,
    isSaving,
    isTesting,
  } = useEitjeApiViewModel();

  // Progress V2 state (local UI state)
  const [monthlyProgressV2, setMonthlyProgressV2] = useState<Record<string, MonthlyProgressV2>>({});
  const [isLoadingV2Progress, setIsLoadingV2Progress] = useState(false);

  // Daily Data Cronjob state
  const [isCronjobActive, setIsCronjobActive] = useState(false);
  const [isTogglingCronjob, setIsTogglingCronjob] = useState(false);
  const [syncMode, setSyncMode] = useState('incremental');
  const [syncInterval, setSyncInterval] = useState(60);
  const [enabledEndpoints, setEnabledEndpoints] = useState({
    hours: true,
    revenue: true,
    planning: false,
  });
  const [quietHours, setQuietHours] = useState({ start: '02:00', end: '06:00' });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [lastRunDaily, setLastRunDaily] = useState<Date | null>(null);

  // Master Data Cronjob state
  const [isMasterCronjobActive, setIsMasterCronjobActive] = useState(false);
  const [isTogglingMasterCronjob, setIsTogglingMasterCronjob] = useState(false);
  const [enabledMasterEndpoints, setEnabledMasterEndpoints] = useState({
    environments: true,
    teams: true,
    users: true,
    shiftTypes: true,
  });
  const [isSavingMasterConfig, setIsSavingMasterConfig] = useState(false);
  const [isTestingMasterSync, setIsTestingMasterSync] = useState(false);
  const [lastRunMaster, setLastRunMaster] = useState<Date | null>(null);
  const [isRunningNowDaily, setIsRunningNowDaily] = useState(false);
  const [isRunningNowMaster, setIsRunningNowMaster] = useState(false);

  // Historical Data Cronjob state
  const [isHistoricalCronjobActive, setIsHistoricalCronjobActive] = useState(false);
  const [isTogglingHistoricalCronjob, setIsTogglingHistoricalCronjob] = useState(false);
  const [enabledHistoricalEndpoints, setEnabledHistoricalEndpoints] = useState({
    hours: true,
    revenue: true,
    planning: false,
  });
  const [isSavingHistoricalConfig, setIsSavingHistoricalConfig] = useState(false);
  const [isTestingHistoricalSync, setIsTestingHistoricalSync] = useState(false);
  const [lastRunHistorical, setLastRunHistorical] = useState<Date | null>(null);
  const [isRunningNowHistorical, setIsRunningNowHistorical] = useState(false);

  // Load cron job status on mount
  useEffect(() => {
    const loadCronStatus = async () => {
      try {
        // Load daily data cron status
        const dailyResponse = await fetch('/api/eitje/v2/cron?jobType=daily-data');
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          if (dailyData.success && dailyData.data) {
            setIsCronjobActive(dailyData.data.isActive || false);
            setSyncInterval(dailyData.data.syncInterval || 60);
            setEnabledEndpoints(dailyData.data.enabledEndpoints || { hours: true, revenue: true, planning: false });
            setQuietHours(dailyData.data.quietHours || { start: '02:00', end: '06:00' });
            if (dailyData.data.lastRun) {
              setLastRunDaily(new Date(dailyData.data.lastRun));
            }
          }
        }

        // Load master data cron status
        const masterResponse = await fetch('/api/eitje/v2/cron?jobType=master-data');
        if (masterResponse.ok) {
          const masterData = await masterResponse.json();
          if (masterData.success && masterData.data) {
            setIsMasterCronjobActive(masterData.data.isActive || false);
            setEnabledMasterEndpoints(masterData.data.enabledMasterEndpoints || { environments: true, teams: true, users: true, shiftTypes: true });
            if (masterData.data.lastRun) {
              setLastRunMaster(new Date(masterData.data.lastRun));
            }
          }
        }

        // Load historical data cron status
        const historicalResponse = await fetch('/api/eitje/v2/cron?jobType=historical-data');
        if (historicalResponse.ok) {
          const historicalData = await historicalResponse.json();
          if (historicalData.success && historicalData.data) {
            setIsHistoricalCronjobActive(historicalData.data.isActive || false);
            setEnabledHistoricalEndpoints(historicalData.data.enabledEndpoints || { hours: true, revenue: true, planning: false });
            if (historicalData.data.lastRun) {
              setLastRunHistorical(new Date(historicalData.data.lastRun));
            }
          }
        }
      } catch (error) {
        console.error('[Eitje API Settings] Error loading cron status:', error);
      }
    };

    loadCronStatus();
  }, []);

  // Load progress data
  const handleLoadProgress = async () => {
    setIsLoadingV2Progress(true);
    try {
      const progressData = await loadMonthlyProgressV2();
      setMonthlyProgressV2(progressData);
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setIsLoadingV2Progress(false);
    }
  };

  // Handle process month
  const handleProcessV2Month = async (month: number, year: number) => {
    try {
      await processMonth(month, year);
      // Reload progress after processing
      await handleLoadProgress();
    } catch (error) {
      // Error already handled in ViewModel
    }
  };

  // Handle save daily data cronjob configuration
  const handleSaveCronjobConfig = async () => {
    setIsSavingConfig(true);
    console.log('[Daily Data Cron] Saving configuration:', {
      syncMode,
      syncInterval,
      enabledEndpoints,
      quietHours,
      isActive: isCronjobActive,
    });

    try {
      // Convert sync interval to cron expression
      const cronExpression = syncInterval >= 60 
        ? `0 */${Math.floor(syncInterval / 60)} * * *` 
        : `*/${syncInterval} * * * *`;

      const response = await fetch('/api/eitje/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          jobType: 'daily-data',
          config: {
            isActive: isCronjobActive,
            schedule: cronExpression,
            syncInterval,
            enabledEndpoints,
            quietHours,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }
      
      console.log('[Daily Data Cron] Configuration saved successfully');
      toast.success('Daily data cronjob configuration saved successfully');
    } catch (error: any) {
      console.error('[Daily Data Cron] Error saving configuration:', error);
      toast.error(error.message || 'Failed to save daily data cronjob configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle test sync
  const handleTestSync = async () => {
    setIsTestingSync(true);
    console.log('[Daily Data Cron] Testing sync...');

    try {
      // Check if credentials exist first
      if (!credentialId && !credentials.apiUsername) {
        toast.error('Please save Eitje API credentials first before testing sync');
        console.warn('[Daily Data Cron] No credentials available for test sync');
        return;
      }

      // Get today's date for test sync (to include partial data from today for hourly updates)
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      console.log('[Daily Data Cron] Test sync date range:', { startDate, endDate });

      // Map enabled endpoints to API endpoint names
      const endpointMap: Record<string, string> = {
        hours: 'time_registration_shifts',
        revenue: 'revenue_days',
        planning: 'planning_shifts',
      };

      const masterEndpointMap: Record<string, string> = {
        environments: 'environments',
        teams: 'teams',
        users: 'users',
        shiftTypes: 'shift_types',
      };

      // Get enabled data endpoints (require dates)
      const enabledEndpointKeys = Object.entries(enabledEndpoints)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      if (enabledEndpointKeys.length === 0) {
        toast.error('Please enable at least one endpoint before testing sync');
        return;
      }

      console.log('[Daily Data Cron] Enabled data endpoints:', enabledEndpointKeys);

      // Sync each enabled endpoint
      const results: Array<{ endpoint: string; success: boolean; recordsSaved: number; error?: string }> = [];

      // Sync data endpoints (require date range)
      for (const endpointKey of enabledEndpointKeys) {
        const apiEndpoint = endpointMap[endpointKey];
        if (!apiEndpoint) {
          console.warn(`[Daily Data Cron] Unknown endpoint key: ${endpointKey}`);
          continue;
        }

        console.log(`[Daily Data Cron] Syncing endpoint: ${apiEndpoint}`);

        try {
      const response = await fetch('/api/eitje/v2/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
              endpoint: apiEndpoint,
        }),
      });

      const result = await response.json();
          console.log(`[Daily Data Cron] Sync result for ${apiEndpoint}:`, result);

      // Handle 404 response - check if it's "no credentials" vs "endpoint not found"
      if (!response.ok) {
        if (response.status === 404 && result.error?.includes('No active Eitje credentials')) {
          toast.error('No active Eitje credentials found. Please save your credentials in the Credentials tab first.');
              results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: result.error });
              continue;
        } else if (response.status === 404) {
              results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: 'Endpoint not found' });
              continue;
        }
            results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: result.error || `HTTP ${response.status}` });
            continue;
      }

      if (result.success) {
            results.push({ endpoint: apiEndpoint, success: true, recordsSaved: result.recordsSaved || 0 });
      } else {
            const errorMsg = result.error || 'Sync failed';
            results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: errorMsg });
          }
        } catch (error: any) {
          console.error(`[Daily Data Cron] Error syncing ${apiEndpoint}:`, error);
          results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: error.message || 'Unknown error' });
        }
      }

      // Show summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalRecords = results.reduce((sum, r) => sum + r.recordsSaved, 0);

      if (failed.length === 0) {
        toast.success(`Test sync successful: ${totalRecords} records synced across ${successful.length} endpoint(s)`);
      } else if (successful.length > 0) {
        toast.warning(`Partial success: ${totalRecords} records synced from ${successful.length} endpoint(s), ${failed.length} failed`);
      } else {
        toast.error(`Test sync failed for all endpoints. Check console for details.`);
      }

      console.log('[Daily Data Cron] Test sync summary:', { results, totalRecords });

    } catch (error: any) {
      console.error('[Daily Data Cron] Error testing sync:', error);
      const errorMsg = error.message || 'Failed to test sync';
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        toast.error('Sync endpoint not available. Please ensure the API route is configured.');
        } else {
          toast.error(errorMsg);
        }
    } finally {
      setIsTestingSync(false);
    }
  };

  // Handle save master data cronjob configuration
  const handleSaveMasterCronjobConfig = async (): Promise<void> => {
    setIsSavingMasterConfig(true);
    console.log('[Master Data Cron] Saving configuration:', {
      enabledMasterEndpoints,
      isActive: isMasterCronjobActive,
    });

    try {
      const response = await fetch('/api/eitje/v2/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          jobType: 'master-data',
          config: {
            isActive: isMasterCronjobActive,
            schedule: '0 0 * * *', // Daily at 00:00 (24:00)
            enabledMasterEndpoints,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }
      
      console.log('[Master Data Cron] Configuration saved successfully');
      toast.success('Master data cronjob configuration saved successfully');
    } catch (error: any) {
      console.error('[Master Data Cron] Error saving configuration:', error);
      toast.error(error.message || 'Failed to save master data cronjob configuration');
    } finally {
      setIsSavingMasterConfig(false);
    }
  };

  // Handle test master data sync
  const handleTestMasterSync = async (): Promise<void> => {
    setIsTestingMasterSync(true);
    console.log('[Master Data Cron] Testing sync...');

    try {
      // Check if credentials exist first
      if (!credentialId && !credentials.apiUsername) {
        toast.error('Please save Eitje API credentials first before testing sync');
        console.warn('[Master Data Cron] No credentials available for test sync');
        return;
      }

      // Map enabled master endpoints to API endpoint names
      const masterEndpointMap: Record<string, string> = {
        environments: 'environments',
        teams: 'teams',
        users: 'users',
        shiftTypes: 'shift_types',
      };

      // Get enabled master endpoints (no dates required)
      const enabledMasterEndpointKeys = Object.entries(enabledMasterEndpoints)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      if (enabledMasterEndpointKeys.length === 0) {
        toast.error('Please enable at least one master endpoint before testing sync');
        return;
      }

      console.log('[Master Data Cron] Enabled master endpoints:', enabledMasterEndpointKeys);

      // Sync each enabled master endpoint
      const results: Array<{ endpoint: string; success: boolean; recordsSaved: number; error?: string }> = [];

      for (const endpointKey of enabledMasterEndpointKeys) {
        const apiEndpoint = masterEndpointMap[endpointKey];
        if (!apiEndpoint) {
          console.warn(`[Master Data Cron] Unknown master endpoint key: ${endpointKey}`);
          continue;
        }

        console.log(`[Master Data Cron] Syncing master endpoint: ${apiEndpoint}`);

        try {
          const response = await fetch('/api/eitje/v2/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint: apiEndpoint,
              // Master endpoints don't require dates
            }),
          });

          const result = await response.json();
          console.log(`[Master Data Cron] Sync result for ${apiEndpoint}:`, result);

          // Handle 404 response - check if it's "no credentials" vs "endpoint not found"
          if (!response.ok) {
            if (response.status === 404 && result.error?.includes('No active Eitje credentials')) {
              toast.error('No active Eitje credentials found. Please save your credentials in the Credentials tab first.');
              results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: result.error });
              continue;
            } else if (response.status === 404) {
              results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: 'Endpoint not found' });
              continue;
            }
            results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: result.error || `HTTP ${response.status}` });
            continue;
          }

          if (result.success) {
            results.push({ endpoint: apiEndpoint, success: true, recordsSaved: result.recordsSaved || 0 });
          } else {
            const errorMsg = result.error || 'Sync failed';
            results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: errorMsg });
          }
        } catch (error: any) {
          console.error(`[Master Data Cron] Error syncing ${apiEndpoint}:`, error);
          results.push({ endpoint: apiEndpoint, success: false, recordsSaved: 0, error: error.message || 'Unknown error' });
        }
      }

      // Show summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalRecords = results.reduce((sum, r) => sum + r.recordsSaved, 0);

      if (failed.length === 0) {
        toast.success(`Test sync successful: ${totalRecords} records synced across ${successful.length} endpoint(s)`);
      } else if (successful.length > 0) {
        toast.warning(`Partial success: ${totalRecords} records synced from ${successful.length} endpoint(s), ${failed.length} failed`);
      } else {
        toast.error(`Test sync failed for all endpoints. Check console for details.`);
      }

      console.log('[Master Data Cron] Test sync summary:', { results, totalRecords });

    } catch (error: any) {
      console.error('[Master Data Cron] Error testing sync:', error);
      const errorMsg = error.message || 'Failed to test sync';
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        toast.error('Sync endpoint not available. Please ensure the API route is configured.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsTestingMasterSync(false);
    }
  };

  if (isLoadingCredentials) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      <div className="pt-20 space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Eitje API Settings</h2>
        <p className="text-muted-foreground">
          Configure your Eitje API connection credentials
        </p>
      </div>

      {/* MongoDB Connection Warning */}
      {credentialsError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">MongoDB Connection Issue</p>
              <p className="text-sm text-yellow-700 mt-1">
                {credentialsError.message || 'Unable to load saved credentials. You can still enter and save new credentials.'}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="daily-data-cron">Daily Data Cron</TabsTrigger>
          <TabsTrigger value="historical-data-cron">Historical Data Cron</TabsTrigger>
          <TabsTrigger value="master-data-cron">Master Data Cron</TabsTrigger>
          <TabsTrigger value="backward-sync">Backward Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>API Credentials</span>
              </CardTitle>
              <CardDescription>
                Enter your Eitje API credentials to connect to the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={credentials.baseUrl}
                    onChange={(e) =>
                      setCredentials({ ...credentials, baseUrl: e.target.value })
                    }
                    placeholder="https://open-api.eitje.app/open_api"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partnerUsername">Partner Username</Label>
                  <Input
                    id="partnerUsername"
                    type="text"
                    value={credentials.partnerUsername}
                    onChange={(e) =>
                      setCredentials({ ...credentials, partnerUsername: e.target.value })
                    }
                    placeholder="Partner username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partnerPassword">Partner Password</Label>
                  <Input
                    id="partnerPassword"
                    type="password"
                    value={credentials.partnerPassword}
                    onChange={(e) =>
                      setCredentials({ ...credentials, partnerPassword: e.target.value })
                    }
                    placeholder="Partner password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiUsername">API Username</Label>
                  <Input
                    id="apiUsername"
                    type="text"
                    value={credentials.apiUsername}
                    onChange={(e) =>
                      setCredentials({ ...credentials, apiUsername: e.target.value })
                    }
                    placeholder="API username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiPassword">API Password</Label>
                  <Input
                    id="apiPassword"
                    type="password"
                    value={credentials.apiPassword}
                    onChange={(e) =>
                      setCredentials({ ...credentials, apiPassword: e.target.value })
                    }
                    placeholder="API password"
                  />
                </div>

                <div className="space-y-2 flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={credentials.isActive}
                    onCheckedChange={(checked) =>
                      setCredentials({ ...credentials, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>

              {connectionStatus !== "unknown" && (
                <Alert>
                  <AlertDescription className="flex items-center space-x-2">
                    {connectionStatus === "connected" ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Connection successful</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Connection failed</span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button onClick={() => saveCredentials(credentials)} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Credentials
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => testConnection(credentials)}
                  disabled={isTesting}
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
                <Button onClick={handleLoadProgress} disabled={isLoadingV2Progress}>
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
                                <span className="capitalize">Hours Worked</span>
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
                                <span className="capitalize">Hours Worked</span>
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

        <TabsContent value="daily-data-cron">
          <Card>
            <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                <span>Daily Data Cron Configuration</span>
                  </CardTitle>
                  <CardDescription>
                Configure automated sync schedules for daily Eitje API data (requires date ranges)
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
                  <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    min={5}
                    step={5}
                    placeholder="60"
                  />
                  <p className="text-sm text-muted-foreground">
                    How often to sync data when in incremental mode (minimum: 5 minutes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Data Endpoints</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    These endpoints require date ranges and sync data for specific periods
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="endpoint-hours" 
                        checked={enabledEndpoints.hours}
                        onCheckedChange={(checked) => 
                          setEnabledEndpoints({ ...enabledEndpoints, hours: checked === true })
                        }
                      />
                      <Label htmlFor="endpoint-hours" className="cursor-pointer font-normal">
                        Time Registration Shifts (Hours)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="endpoint-revenue" 
                        checked={enabledEndpoints.revenue}
                        onCheckedChange={(checked) => 
                          setEnabledEndpoints({ ...enabledEndpoints, revenue: checked === true })
                        }
                      />
                      <Label htmlFor="endpoint-revenue" className="cursor-pointer font-normal">
                        Revenue Days
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="endpoint-planning" 
                        checked={enabledEndpoints.planning}
                        onCheckedChange={(checked) => 
                          setEnabledEndpoints({ ...enabledEndpoints, planning: checked === true })
                        }
                      />
                      <Label htmlFor="endpoint-planning" className="cursor-pointer font-normal">
                        Planning Shifts
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quiet Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quietStart">Start Time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={quietHours.start}
                        onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quietEnd">End Time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={quietHours.end}
                        onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sync will pause during these hours to avoid peak API usage
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Cron Job Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Current status of automated sync jobs
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
                        {syncInterval < 60 
                          ? `Every ${syncInterval} minute${syncInterval !== 1 ? 's' : ''}`
                          : syncInterval === 60
                          ? 'Every hour'
                          : `Every ${Math.floor(syncInterval / 60)} hour${Math.floor(syncInterval / 60) !== 1 ? 's' : ''}`
                        }
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
                  onClick={async () => {
                    setIsTogglingCronjob(true);
                    try {
                      // First save config if not saved yet
                      if (!isCronjobActive) {
                        // Save config before starting
                        const cronExpression = syncInterval >= 60 
                          ? `0 */${Math.floor(syncInterval / 60)} * * *` 
                          : `*/${syncInterval} * * * *`;

                        await fetch('/api/eitje/v2/cron', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'update',
                            jobType: 'daily-data',
                            config: {
                              isActive: true,
                              schedule: cronExpression,
                              syncInterval,
                              enabledEndpoints,
                              quietHours,
                            },
                          }),
                        });
                      }

                      // Start or stop the job
                      const response = await fetch('/api/eitje/v2/cron', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: isCronjobActive ? 'stop' : 'start',
                          jobType: 'daily-data',
                        }),
                      });

                      const result = await response.json();
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to toggle cronjob');
                      }

                      setIsCronjobActive(!isCronjobActive);
                      toast.success(isCronjobActive ? 'Cronjob stopped' : 'Cronjob started');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=daily-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data) {
                          if (statusData.data.lastRun) {
                            setLastRunDaily(new Date(statusData.data.lastRun));
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error('[Daily Data Cron] Error toggling cronjob:', error);
                      toast.error(error.message || 'Failed to toggle cronjob');
                    } finally {
                      setIsTogglingCronjob(false);
                    }
                  }}
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
                <Button onClick={handleSaveCronjobConfig} disabled={isSavingConfig}>
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
                <Button variant="outline" onClick={handleTestSync} disabled={isTestingSync}>
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
                  onClick={async () => {
                    setIsRunningNowDaily(true);
                    try {
                      const response = await fetch('/api/eitje/v2/cron', {
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

                      toast.success('Daily data cron job executed successfully');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=daily-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data?.lastRun) {
                          setLastRunDaily(new Date(statusData.data.lastRun));
                        }
                      }
                    } catch (error: any) {
                      console.error('[Daily Data Cron] Error running now:', error);
                      toast.error(error.message || 'Failed to run cron job');
                    } finally {
                      setIsRunningNowDaily(false);
                    }
                  }}
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
                        id="historical-endpoint-hours" 
                        checked={enabledHistoricalEndpoints.hours}
                        onCheckedChange={(checked) => 
                          setEnabledHistoricalEndpoints({ ...enabledHistoricalEndpoints, hours: checked === true })
                        }
                      />
                      <Label htmlFor="historical-endpoint-hours" className="cursor-pointer font-normal">
                        Hours (Time Registration Shifts)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="historical-endpoint-revenue" 
                        checked={enabledHistoricalEndpoints.revenue}
                        onCheckedChange={(checked) => 
                          setEnabledHistoricalEndpoints({ ...enabledHistoricalEndpoints, revenue: checked === true })
                        }
                      />
                      <Label htmlFor="historical-endpoint-revenue" className="cursor-pointer font-normal">
                        Revenue Days
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="historical-endpoint-planning" 
                        checked={enabledHistoricalEndpoints.planning}
                        onCheckedChange={(checked) => 
                          setEnabledHistoricalEndpoints({ ...enabledHistoricalEndpoints, planning: checked === true })
                        }
                      />
                      <Label htmlFor="historical-endpoint-planning" className="cursor-pointer font-normal">
                        Planning Shifts
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
                  onClick={async () => {
                    setIsTogglingHistoricalCronjob(true);
                    try {
                      // First save config if not saved yet
                      if (!isHistoricalCronjobActive) {
                        await fetch('/api/eitje/v2/cron', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'update',
                            jobType: 'historical-data',
                            config: {
                              isActive: true,
                              schedule: '0 1 * * *', // Daily at 01:00
                              enabledEndpoints: enabledHistoricalEndpoints,
                            },
                          }),
                        });
                      }

                      // Start or stop the job
                      const response = await fetch('/api/eitje/v2/cron', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: isHistoricalCronjobActive ? 'stop' : 'start',
                          jobType: 'historical-data',
                        }),
                      });

                      const result = await response.json();
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to toggle cronjob');
                      }

                      setIsHistoricalCronjobActive(!isHistoricalCronjobActive);
                      toast.success(isHistoricalCronjobActive ? 'Historical data cronjob stopped' : 'Historical data cronjob started');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=historical-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data) {
                          if (statusData.data.lastRun) {
                            setLastRunHistorical(new Date(statusData.data.lastRun));
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error('[Historical Data Cron] Error toggling cronjob:', error);
                      toast.error(error.message || 'Failed to toggle historical data cronjob');
                    } finally {
                      setIsTogglingHistoricalCronjob(false);
                    }
                  }}
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
                  onClick={async () => {
                    setIsSavingHistoricalConfig(true);
                    try {
                      const response = await fetch('/api/eitje/v2/cron', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'update',
                          jobType: 'historical-data',
                          config: {
                            isActive: isHistoricalCronjobActive,
                            schedule: '0 1 * * *', // Daily at 01:00
                            enabledEndpoints: enabledHistoricalEndpoints,
                          },
                        }),
                      });

                      const result = await response.json();
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to save configuration');
                      }
                      
                      toast.success('Historical data cronjob configuration saved successfully');
                    } catch (error: any) {
                      console.error('[Historical Data Cron] Error saving configuration:', error);
                      toast.error(error.message || 'Failed to save historical data cronjob configuration');
                    } finally {
                      setIsSavingHistoricalConfig(false);
                    }
                  }}
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
                  onClick={async () => {
                    setIsTestingHistoricalSync(true);
                    try {
                      if (!credentials) {
                        toast.error('Please save Eitje API credentials first before testing sync');
                        return;
                      }

                      // Get last 30 days date range
                      const today = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(today.getDate() - 30);
                      const overallStartDate = thirtyDaysAgo.toISOString().split('T')[0];
                      const overallEndDate = today.toISOString().split('T')[0];

                      // Helper function to split date range into chunks
                      const splitDateRange = (startDate: string, endDate: string, maxDays: number): Array<{ startDate: string; endDate: string }> => {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (totalDays <= maxDays) {
                          return [{ startDate, endDate }];
                        }

                        const chunks: Array<{ startDate: string; endDate: string }> = [];
                        let currentStart = new Date(start);
                        
                        while (currentStart < end) {
                          const currentEnd = new Date(currentStart);
                          currentEnd.setDate(currentEnd.getDate() + maxDays - 1);
                          
                          if (currentEnd > end) {
                            currentEnd.setTime(end.getTime());
                          }
                          
                          chunks.push({
                            startDate: currentStart.toISOString().split('T')[0],
                            endDate: currentEnd.toISOString().split('T')[0],
                          });
                          
                          currentStart = new Date(currentEnd);
                          currentStart.setDate(currentStart.getDate() + 1);
                        }
                        
                        return chunks;
                      };

                      const endpointMap: Record<string, string> = {
                        hours: 'time_registration_shifts',
                        revenue: 'revenue_days',
                        planning: 'planning_shifts',
                      };

                      const enabledEndpointKeys = Object.entries(enabledHistoricalEndpoints)
                        .filter(([_, enabled]) => enabled)
                        .map(([key, _]) => key);

                      const results: Array<{ endpoint: string; success: boolean; recordsSaved: number; error?: string }> = [];

                      for (const endpointKey of enabledEndpointKeys) {
                        const apiEndpoint = endpointMap[endpointKey];
                        if (!apiEndpoint) continue;

                        const maxDays = (EITJE_DATE_LIMITS as any)[apiEndpoint] || 7;
                        const dateChunks = splitDateRange(overallStartDate, overallEndDate, maxDays);
                        
                        let endpointTotalRecords = 0;
                        let endpointSuccess = true;
                        let endpointError: string | undefined;

                        for (const chunk of dateChunks) {
                          try {
                            const response = await fetch('/api/eitje/v2/sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                startDate: chunk.startDate,
                                endDate: chunk.endDate,
                                endpoint: apiEndpoint,
                              }),
                            });

                            const result = await response.json();
                            if (response.ok && result.success) {
                              endpointTotalRecords += result.recordsSaved || 0;
                            } else {
                              endpointSuccess = false;
                              endpointError = result.error || 'Sync failed';
                            }
                          } catch (error: any) {
                            endpointSuccess = false;
                            endpointError = error.message;
                          }
                        }

                        results.push({ 
                          endpoint: apiEndpoint, 
                          success: endpointSuccess, 
                          recordsSaved: endpointTotalRecords,
                          error: endpointError
                        });
                      }

                      const totalRecords = results.reduce((sum, r) => sum + r.recordsSaved, 0);
                      const successCount = results.filter(r => r.success).length;
                      
                      if (successCount === results.length) {
                        toast.success(`Historical sync test completed: ${totalRecords} records synced across ${results.length} endpoint(s)`);
                      } else {
                        toast.warning(`Historical sync test completed with errors: ${successCount}/${results.length} successful, ${totalRecords} records synced`);
                      }
                    } catch (error: any) {
                      console.error('[Historical Data Cron] Error testing sync:', error);
                      toast.error(error.message || 'Failed to test historical sync');
                    } finally {
                      setIsTestingHistoricalSync(false);
                    }
                  }}
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
                  onClick={async () => {
                    setIsRunningNowHistorical(true);
                    try {
                      const response = await fetch('/api/eitje/v2/cron', {
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

                      toast.success('Historical data cron job executed successfully');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=historical-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data?.lastRun) {
                          setLastRunHistorical(new Date(statusData.data.lastRun));
                        }
                      }
                    } catch (error: any) {
                      console.error('[Historical Data Cron] Error running now:', error);
                      toast.error(error.message || 'Failed to run cron job');
                    } finally {
                      setIsRunningNowHistorical(false);
                    }
                  }}
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

        <TabsContent value="master-data-cron">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Master Data Cron Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure automated daily sync for master data endpoints (environments, teams, users, shift types)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Master Data Endpoints</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    These endpoints don't require date ranges and sync all available data. They run daily at 00:00 (24:00).
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-environments" 
                        checked={enabledMasterEndpoints.environments}
                        onCheckedChange={(checked) => 
                          setEnabledMasterEndpoints({ ...enabledMasterEndpoints, environments: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-environments" className="cursor-pointer font-normal">
                        Environments (Locations)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-teams" 
                        checked={enabledMasterEndpoints.teams}
                        onCheckedChange={(checked) => 
                          setEnabledMasterEndpoints({ ...enabledMasterEndpoints, teams: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-teams" className="cursor-pointer font-normal">
                        Teams
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-users" 
                        checked={enabledMasterEndpoints.users}
                        onCheckedChange={(checked) => 
                          setEnabledMasterEndpoints({ ...enabledMasterEndpoints, users: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-users" className="cursor-pointer font-normal">
                        Users (Employees)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="master-endpoint-shift-types" 
                        checked={enabledMasterEndpoints.shiftTypes}
                        onCheckedChange={(checked) => 
                          setEnabledMasterEndpoints({ ...enabledMasterEndpoints, shiftTypes: checked === true })
                        }
                      />
                      <Label htmlFor="master-endpoint-shift-types" className="cursor-pointer font-normal">
                        Shift Types
                      </Label>
                    </div>
                  </div>
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
                      className={isMasterCronjobActive 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {isMasterCronjobActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      <span className="font-mono">0 0 * * *</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency:</span>
                      <span>Daily at 00:00 (24:00)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Run:</span>
                      <span>
                        {lastRunMaster 
                          ? new Date(lastRunMaster).toLocaleString('en-GB', { 
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
                  onClick={async () => {
                    setIsTogglingMasterCronjob(true);
                    try {
                      // First save config if not saved yet
                      if (!isMasterCronjobActive) {
                        await fetch('/api/eitje/v2/cron', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'update',
                            jobType: 'master-data',
                            config: {
                              isActive: true,
                              schedule: '0 0 * * *', // Daily at 00:00 (24:00)
                              enabledMasterEndpoints,
                            },
                          }),
                        });
                      }

                      // Start or stop the job
                      const response = await fetch('/api/eitje/v2/cron', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: isMasterCronjobActive ? 'stop' : 'start',
                          jobType: 'master-data',
                        }),
                      });

                      const result = await response.json();
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to toggle cronjob');
                      }

                      setIsMasterCronjobActive(!isMasterCronjobActive);
                      toast.success(isMasterCronjobActive ? 'Master data cronjob stopped' : 'Master data cronjob started');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=master-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data) {
                          if (statusData.data.lastRun) {
                            setLastRunMaster(new Date(statusData.data.lastRun));
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error('[Master Data Cron] Error toggling cronjob:', error);
                      toast.error(error.message || 'Failed to toggle master data cronjob');
                    } finally {
                      setIsTogglingMasterCronjob(false);
                    }
                  }}
                  disabled={isTogglingMasterCronjob}
                  variant={isMasterCronjobActive ? "destructive" : "default"}
                >
                  {isTogglingMasterCronjob ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isMasterCronjobActive ? 'Stopping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      {isMasterCronjobActive ? (
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
                <Button onClick={handleSaveMasterCronjobConfig} disabled={isSavingMasterConfig}>
                  {isSavingMasterConfig ? (
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
                <Button variant="outline" onClick={handleTestMasterSync} disabled={isTestingMasterSync}>
                  {isTestingMasterSync ? (
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
                  onClick={async () => {
                    setIsRunningNowMaster(true);
                    try {
                      const response = await fetch('/api/eitje/v2/cron', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'run-now',
                          jobType: 'master-data',
                        }),
                      });

                      const result = await response.json();
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to run cron job');
                      }

                      toast.success('Master data cron job executed successfully');
                      
                      // Reload status to get updated lastRun
                      const statusResponse = await fetch('/api/eitje/v2/cron?jobType=master-data');
                      if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.data?.lastRun) {
                          setLastRunMaster(new Date(statusData.data.lastRun));
                        }
                      }
                    } catch (error: any) {
                      console.error('[Master Data Cron] Error running now:', error);
                      toast.error(error.message || 'Failed to run cron job');
                    } finally {
                      setIsRunningNowMaster(false);
                    }
                  }}
                  disabled={isRunningNowMaster || !isMasterCronjobActive}
                >
                  {isRunningNowMaster ? (
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
      </Tabs>
    </div>
  );
}
