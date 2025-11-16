/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/bork-api
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  Database, 
  Clock, 
  CheckCircle, 
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  TestTube,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  XCircle,
  Loader2,
  Check
} from "lucide-react";
import { createClient } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { RawDataStorage } from "@/components/finance/RawDataStorage";
import { updateConnectionStatus } from "@/lib/finance/bork/connectionStatusService";
import { CronSyncHistory } from "@/components/finance/CronSyncHistory";
import { BorkCronjobConfig } from "@/components/finance/BorkCronjobConfig";

interface ApiConnection {
  id: string;
  location: string;
  locationId: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
}

interface ConnectionTestResult {
  locationId: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  testedAt?: string;
}

interface ValidationResult {
  locationId: string;
  locationName: string;
  expectedDates: string[];
  actualDates: string[];
  missingDates: string[];
  extraDates: string[];
  totalExpected: number;
  totalActual: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'missing';
  monthlyBreakdown: {
    [month: string]: {
      expected: number;
      actual: number;
      missing: string[];
      completionPercentage: number;
    };
  };
}

interface RevenueMismatch {
  date: string;
  referenceRevenue: number;
  databaseRevenue: number;
  difference: number;
  percentageDiff: number;
  severity: 'exact' | 'minor' | 'major';
}

interface RevenueValidationResult {
  locationId: string;
  locationName: string;
  matchedField: 'incl_vat' | 'excl_vat';
  mismatches: RevenueMismatch[];
  totalDates: number;
  exactMatches: number;
  minorMismatches: number;
  majorMismatches: number;
}



export default function BorkApiConnectPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("connection-test");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // New state for enhanced functionality
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, ConnectionTestResult>>(new Map());
  const [isTesting, setIsTesting] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  
  // Manual sync state
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedPeriodType, setSelectedPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingLocations, setSyncingLocations] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Map<string, { success: boolean; message: string; data?: Record<string, unknown>; error?: string }>>(new Map());
  const [monthlySyncStatus, setMonthlySyncStatus] = useState<Map<string, { hasData: boolean; recordCount: number }>>(new Map());
  
  // Raw data processing state
  const [isProcessingRawData, setIsProcessingRawData] = useState(false);
  const [rawDataProcessingResults, setRawDataProcessingResults] = useState<Map<string, { success: boolean; message: string; data?: Record<string, unknown>; error?: string }>>(new Map());
  
  // Data validation state
  const [validationData, setValidationData] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [syncingDates, setSyncingDates] = useState<Set<string>>(new Set());
  const [processingDates, setProcessingDates] = useState<Set<string>>(new Set());
  const [completedMonths, setCompletedMonths] = useState<Set<string>>(new Set());
  
  // Revenue validation state
  const [revenueValidationData, setRevenueValidationData] = useState<Map<string, RevenueValidationResult>>(new Map());
  const [isValidatingRevenue, setIsValidatingRevenue] = useState(false);
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

  // Load connection status from database on mount
  useEffect(() => {
    const loadConnectionStatus = async () => {
      const supabase = createClient();
      if (!supabase) return;

      const response = await fetch('/api/locations');
      const result = await response.json();

      if (result.success && result.data) {
        const results = new Map();
        result.data.forEach((loc: { id: string; bork_connection_status: string; bork_connection_tested_at: string; bork_connection_message: string }) => {
          if (loc.bork_connection_status !== 'not_tested') {
            results.set(loc.id, {
              locationId: loc.id,
              success: loc.bork_connection_status === 'success',
              message: loc.bork_connection_message || '',
              testedAt: loc.bork_connection_tested_at
            });
          }
        });
        setTestResults(results);
      }
    };

    if (isClient) {
      loadConnectionStatus();
    }
  }, [isClient, connections]);

  // Load credentials from database
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        console.log('🔄 Loading credentials from API...');
        const response = await fetch('/api/bork/credentials');
        const result = await response.json();
        
        console.log('📊 Credentials API response:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('✅ Using database credentials');
          const locationNames: Record<string, string> = {
            '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
            '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen',
            '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours"
          };
          
          const mappedConnections = result.data.map((cred: { id: string; location_id: string; api_key: string; api_url: string; is_active: boolean }) => ({
            id: cred.id,
            location: locationNames[cred.location_id] || 'Unknown',
            locationId: cred.location_id,
            apiKey: cred.api_key,
            baseUrl: cred.api_url,
            isActive: cred.is_active
          }));
          
          setConnections(mappedConnections);
        } else {
          // Fallback to hardcoded credentials if API fails or no data
          console.log('⚠️ Using fallback credentials - API returned no data');
          setConnections([
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
        }
      } catch (error) {
        console.error('Failed to load credentials, using fallback:', error);
        // Use fallback credentials on error
        setConnections([
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
      }
    };
    
    if (isClient) {
      loadCredentials();
    }
  }, [isClient, toast]);


  // Helper functions
  const toggleCardExpansion = (locationId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedCards(newExpanded);
  };

  const testConnection = async (connection: ApiConnection) => {
    setIsTesting(prev => new Set(prev).add(connection.locationId));
    
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }
      
      const testDate = format(subDays(new Date(), 30), 'yyyyMMdd');
      
      const response = await fetch('/api/bork/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: connection.locationId,
          testDate: testDate,
        })
      });
      
      const data = await response.json();
      const error = !response.ok ? new Error(data.error || 'Test failed') : null;

      if (error) throw error;
      
      const result: ConnectionTestResult = {
        locationId: connection.locationId,
        success: data.success,
        message: data.success 
          ? `✅ ${connection.location} API Connection Successful! ${data.recordCount || 0} records found.`
          : `❌ ${connection.location} API Connection Failed: ${data.errorMessage || 'Unknown error'}`,
        data: data
      };
      
      setTestResults(prev => new Map(prev).set(connection.locationId, result));

      // Update database with test result
      const dbResult = await updateConnectionStatus(
        connection.locationId,
        data.success ? 'success' : 'failed',
        result.message
      );

      if (!dbResult.success) {
        console.warn('Database update failed:', dbResult.error);
        toast({
          title: "Warning",
          description: "Connection test succeeded but status was not saved",
          variant: "destructive"
        });
      }

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `${connection.location} API connection is working`,
        });
      } else {
        throw new Error(data.errorMessage || 'Connection failed');
      }
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const result: ConnectionTestResult = {
        locationId: connection.locationId,
        success: false,
        message: `❌ ${connection.location} API Connection Failed: ${errorMessage}`
      };
      
      setTestResults(prev => new Map(prev).set(connection.locationId, result));

      // Update database with failed test result
      const dbResult = await updateConnectionStatus(
        connection.locationId,
        'failed',
        result.message
      );

      if (!dbResult.success) {
        console.warn('Database update failed:', dbResult.error);
      }

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTesting(prev => {
        const newSet = new Set(prev);
        newSet.delete(connection.locationId);
        return newSet;
      });
    }
  };

  const addConnection = () => {
    const newConnection: ApiConnection = {
      id: Date.now().toString(),
      location: "",
      locationId: "",
      apiKey: "",
      baseUrl: "",
      isActive: true
    };
    setEditingConnection(newConnection);
  };

  const editConnection = (connection: ApiConnection) => {
    setEditingConnection(connection);
  };

  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const saveConnection = () => {
    if (!editingConnection) return;
    
    if (editingConnection.id && connections.find(c => c.id === editingConnection.id)) {
      // Update existing
      setConnections(prev => prev.map(conn => 
        conn.id === editingConnection.id ? editingConnection : conn
      ));
    } else {
      // Add new
      setConnections(prev => [...prev, editingConnection]);
    }
    
    setEditingConnection(null);
  };

  // Generate weekly periods from Jan 1, 2024 to current week
  const generateWeeklyPeriods = () => {
    const periods = [];
    const startDate = new Date(2024, 0, 1); // Jan 1, 2024
    const currentDate = new Date();
    
    // Get current week start (Monday)
    const currentWeekStart = new Date(currentDate);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
    
    const currentPeriod = new Date(startDate);
    
    while (currentPeriod <= currentWeekStart) {
      const periodEnd = new Date(currentPeriod);
      periodEnd.setDate(periodEnd.getDate() + 6); // End of week (Sunday)
      
      const periodKey = `${currentPeriod.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}`;
      const periodLabel = `${currentPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      periods.push({
        key: periodKey,
        label: periodLabel,
        startDate: currentPeriod.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0]
      });
      
      // Move to next week
      currentPeriod.setDate(currentPeriod.getDate() + 7);
    }
    
    return periods.reverse(); // Most recent first
  };

  // Generate monthly periods from Jan 1, 2024 to current month
  const generateMonthlyPeriods = useCallback(() => {
    const periods = [];
    const startDate = new Date(2024, 0, 1); // Jan 1, 2024
    const currentDate = new Date();
    
    const currentPeriod = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    while (currentPeriod <= currentMonth) {
      const periodEnd = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0); // Last day of month
      
      const periodKey = `${currentPeriod.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}`;
      const periodLabel = `${currentPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      
      // Check if this month has data in the database
      const monthStatus = monthlySyncStatus.get(periodKey);
      
      periods.push({
        key: periodKey,
        label: periodLabel,
        startDate: currentPeriod.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
        hasData: monthStatus?.hasData || false,
        recordCount: monthStatus?.recordCount || 0
      });
      
      // Move to next month
      currentPeriod.setMonth(currentPeriod.getMonth() + 1);
    }
    
    return periods.reverse(); // Most recent first
  }, [monthlySyncStatus]);

  // Generate periods based on selected type
  const generatePeriods = () => {
    return selectedPeriodType === 'weekly' ? generateWeeklyPeriods() : generateMonthlyPeriods();
  };

  // Check monthly sync status when switching to monthly view
  useEffect(() => {
    const checkMonthlySyncStatus = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;

        const monthlyStatus = new Map();
        const months = generateMonthlyPeriods();
        
        for (const month of months) {
          const { data, error } = await supabase
            .from('bork_sales_data')
            .select('id')
            .gte('date', month.startDate)
            .lte('date', month.endDate)
            .limit(1);

          if (!error && data && data.length > 0) {
            // Get total count for this month
            const { count } = await supabase
              .from('bork_sales_data')
              .select('*', { count: 'exact', head: true })
              .gte('date', month.startDate)
              .lte('date', month.endDate);

            monthlyStatus.set(month.key, {
              hasData: true,
              recordCount: count || 0
            });
          } else {
            monthlyStatus.set(month.key, {
              hasData: false,
              recordCount: 0
            });
          }
        }
        
        setMonthlySyncStatus(monthlyStatus);
      } catch (error) {
        console.error('Error checking monthly sync status:', error);
      }
    };

    if (selectedPeriodType === 'monthly') {
      checkMonthlySyncStatus();
    }
  }, [selectedPeriodType, generateMonthlyPeriods]);


  const toggleLocationSelection = (locationId: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
    } else {
      newSelected.add(locationId);
    }
    setSelectedLocations(newSelected);
  };

  const startManualSync = async () => {
    if (selectedLocations.size === 0 || !selectedPeriod) {
      alert("Please select at least one location and a period");
      return;
    }

    setIsSyncing(true);
    const results = new Map();

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      const [startDate, endDate] = selectedPeriod.split('_');
      
      // Process locations in parallel with timeout
      const syncPromises = Array.from(selectedLocations).map(async (locationId) => {
        const connection = connections.find(c => c.locationId === locationId);
        if (!connection) return;

        // Add to syncing locations
        setSyncingLocations(prev => new Set(prev).add(locationId));

        try {
          console.log(`Starting sync for ${connection.location}...`);
          
          const response = await fetch('/api/bork/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locationId,
              startDate,
              endDate,
            })
          });
          
          const data = await response.json();
          const error = !response.ok ? new Error(data.error || 'Sync failed') : null;

        if (error) throw error;

          results.set(locationId, {
            success: data.success,
            data: data,
            message: data.success 
              ? `✅ ${connection.location} sync completed successfully - ${data.records_stored || 0} records stored`
              : `❌ ${connection.location} sync failed: ${data.error || 'Unknown error'}`
          });
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Sync error for ${connection.location}:`, error);
          
          results.set(locationId, {
            success: false,
            error: errorMessage,
            message: `❌ ${connection.location} sync failed: ${errorMessage}`
          });
        } finally {
          // Remove from syncing locations
          setSyncingLocations(prev => {
            const next = new Set(prev);
            next.delete(locationId);
            return next;
          });
        }
      });

      // Wait for all syncs to complete
      await Promise.allSettled(syncPromises);
      setSyncResults(results);

    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const retryLocationSync = async (locationId: string) => {
    const connection = connections.find(c => c.locationId === locationId);
    if (!connection) return;

    // Add to syncing locations
    setSyncingLocations(prev => new Set(prev).add(locationId));

    try {
      console.log(`Retrying sync for ${connection.location}...`);
      
      const [startDate, endDate] = selectedPeriod.split('_');
      
      const response = await fetch('/api/bork/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          startDate,
          endDate,
        })
      });
      
      const data = await response.json();
      const error = !response.ok ? new Error(data.error || 'Sync failed') : null;

      if (error) throw error;

      const syncData = data as { success: boolean; processedCount: number; totalRecords: number; apiFailures: number; message: string };
      
      // Update the specific location result
      setSyncResults(prev => {
        const newResults = new Map(prev);
        newResults.set(locationId, {
          success: true,
          data: data,
          message: `✅ ${connection.location} sync completed successfully - ${syncData?.totalRecords || 0} records stored`
        });
        return newResults;
      });

      toast({
        title: "Sync Retry Successful",
        description: `${connection.location} sync completed successfully`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Retry sync error for ${connection.location}:`, error);
      
      // Update the specific location result
      setSyncResults(prev => {
        const newResults = new Map(prev);
        newResults.set(locationId, {
          success: false,
          error: errorMessage,
          message: `❌ ${connection.location} sync failed: ${errorMessage}`
        });
        return newResults;
      });

      toast({
        title: "Sync Retry Failed",
        description: `${connection.location} sync failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      // Remove from syncing locations
      setSyncingLocations(prev => {
        const next = new Set(prev);
        next.delete(locationId);
        return next;
      });
    }
  };

  const resyncLocation = async (locationId: string) => {
    const connection = connections.find(c => c.locationId === locationId);
    if (!connection) return;

    setSyncingLocations(prev => new Set(prev).add(locationId));

    try {
      console.log(`Resyncing ${connection.location}...`);
      
      const [startDate, endDate] = selectedPeriod.split('_');
      
      const response = await fetch('/api/bork/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          startDate,
          endDate,
        })
      });
      
      const data = await response.json();
      const error = !response.ok ? new Error(data.error || 'Sync failed') : null;

      if (error) throw error;

      setSyncResults(prev => new Map(prev).set(locationId, {
        success: data.success,
        data: data,
        message: data.success 
          ? `✅ ${connection.location} resync completed successfully - ${data.totalRecords || 0} records stored`
          : `❌ ${connection.location} resync failed: ${data.error || 'Unknown error'}`
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Resync error for ${connection.location}:`, error);
      
      setSyncResults(prev => new Map(prev).set(locationId, {
        success: false,
        error: errorMessage,
        message: `❌ ${connection.location} resync failed: ${errorMessage}`
      }));
    } finally {
      setSyncingLocations(prev => {
        const next = new Set(prev);
        next.delete(locationId);
        return next;
      });
    }
  };

  const reprocessLocation = async (locationId: string) => {
    const connection = connections.find(c => c.locationId === locationId);
    if (!connection) return;

    setIsProcessingRawData(true);

    try {
      console.log(`Reprocessing ${connection.location}...`);
      
      const response = await fetch('/api/bork/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          process_all: false
        })
      });
      
      const data = await response.json();
      const error = !response.ok ? new Error(data.error || 'Process failed') : null;

      if (error) throw error;

      setRawDataProcessingResults(prev => new Map(prev).set(locationId, {
        success: data.success,
        data: data,
        message: data.success 
          ? `✅ ${connection.location} reprocess completed successfully - ${data.processedCount || 0} records processed`
          : `❌ ${connection.location} reprocess failed: ${data.error || 'Unknown error'}`
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Reprocess error for ${connection.location}:`, error);
      
      setRawDataProcessingResults(prev => new Map(prev).set(locationId, {
        success: false,
        error: errorMessage,
        message: `❌ ${connection.location} reprocess failed: ${errorMessage}`
      }));
    } finally {
      setIsProcessingRawData(false);
    }
  };

  const processRawData = async () => {
    setIsProcessingRawData(true);
    const results = new Map();

    try {
      console.log('Processing all raw data...');
      
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }
      
      const response = await fetch('/api/bork/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_all: true,
        })
      });
      
      const data = await response.json();
      const error = !response.ok ? new Error(data.error || 'Processing failed') : null;

      if (error) throw error;

      // Show results for all active locations with actual per-location processing counts
      for (const connection of connections.filter(c => c.isActive)) {
        // Use actual processed count per location from API response
        const recordsProcessed = data?.processedByLocation?.[connection.locationId] || 0;
        
        results.set(connection.locationId, {
          success: data.success,
          data: data,
          message: data.success 
            ? `✅ ${connection.location} raw data processed successfully - ${recordsProcessed} records processed`
            : `❌ ${connection.location} processing failed: ${data.error || 'Unknown error'}`
        });
      }

      setRawDataProcessingResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error('Raw data processing error:', error);
      
      // Show error for all active locations
      for (const connection of connections.filter(c => c.isActive)) {
        results.set(connection.locationId, {
          success: false,
          error: errorMessage,
          message: `❌ ${connection.location} processing failed: ${errorMessage}`
        });
      }
      
      setRawDataProcessingResults(results);
    } finally {
      setIsProcessingRawData(false);
    }
  };

  // Data validation functions
  const validateAllLocations = useCallback(async () => {
    setIsValidating(true);
    try {
      console.log('[Validation] Starting validation for all locations...');
      
      const response = await fetch('/api/bork/validate');
      const result = await response.json();
      
      if (result.success && result.results) {
        const validationMap = new Map();
        result.results.forEach((validation: ValidationResult) => {
          validationMap.set(validation.locationId, validation);
        });
        setValidationData(validationMap);
        
        toast({
          title: "Validation Complete",
          description: `Validated ${result.results.length} locations`,
        });
      } else {
        throw new Error(result.error || 'Validation failed');
      }
    } catch (error) {
      console.error('[Validation] Error:', error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  // Revenue validation functions
  const validateRevenue = useCallback(async () => {
    setIsValidatingRevenue(true);
    try {
      console.log('[Revenue Validation] Starting revenue validation for all locations...');
      
      const response = await fetch('/api/bork/validate-revenue');
      const result = await response.json();
      
      if (result.success && result.results) {
        const validationMap = new Map();
        result.results.forEach((validation: RevenueValidationResult) => {
          validationMap.set(validation.locationId, validation);
        });
        setRevenueValidationData(validationMap);
        
        toast({
          title: "Revenue Validation Complete",
          description: `Validated ${result.results.length} locations`,
        });
      } else {
        throw new Error(result.error || 'Revenue validation failed');
      }
    } catch (error) {
      console.error('[Revenue Validation] Error:', error);
      toast({
        title: "Revenue Validation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsValidatingRevenue(false);
    }
  }, [toast]);

  const syncMissingDate = async (locationId: string, date: string) => {
    const dateKey = `${locationId}-${date}`;
    setSyncingDates(prev => new Set(prev).add(dateKey));
    
    try {
      console.log(`[Validation] Syncing missing date ${date} for location ${locationId}...`);
      
      // Sync the specific date
      const syncResponse = await fetch('/api/bork/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          startDate: date,
          endDate: date
        })
      });
      
      const syncResult = await syncResponse.json();
      
      if (syncResult.success) {
        // Process the data after successful sync
        const processResponse = await fetch('/api/bork/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId })
        });
        
        const processResult = await processResponse.json();
        
        if (processResult.success) {
          // Refresh validation data
          await validateAllLocations();
          
          toast({
            title: "Sync & Process Complete",
            description: `Successfully synced and processed ${date}`,
          });
        } else {
          throw new Error(processResult.error || 'Processing failed');
        }
      } else {
        throw new Error(syncResult.error || 'Sync failed');
      }
    } catch (error) {
      console.error(`[Validation] Error syncing date ${date}:`, error);
      toast({
        title: "Sync Failed",
        description: `Failed to sync ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncingDates(prev => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
    }
  };

  const syncMonth = async (locationId: string, month: string) => {
    const monthKey = `${locationId}-${month}`;
    setSyncingDates(prev => new Set(prev).add(monthKey));
    
    try {
      console.log(`[Validation] Syncing month ${month} for location ${locationId}...`);
      
      // Calculate start and end dates for the month
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Sync the entire month
      const syncResponse = await fetch('/api/bork/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          startDate: startDateStr,
          endDate: endDateStr
        })
      });
      
      const syncResult = await syncResponse.json();
      
      if (syncResult.success) {
        // Mark month as completed
        setCompletedMonths(prev => new Set(prev).add(monthKey));
        
        toast({
          title: "Month Sync Complete",
          description: `Successfully synced ${month} (${syncResult.totalRecords || 0} records)`,
        });
      } else {
        throw new Error(syncResult.error || 'Month sync failed');
      }
    } catch (error) {
      console.error(`[Validation] Error syncing month ${month}:`, error);
      toast({
        title: "Month Sync Failed",
        description: `Failed to sync ${month}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncingDates(prev => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  };

  const processMonth = async (locationId: string, month: string) => {
    const monthKey = `${locationId}-${month}`;
    setProcessingDates(prev => new Set(prev).add(monthKey));
    
    try {
      console.log(`[Validation] Processing month ${month} for location ${locationId}...`);
      
      // Process the entire month
      const processResponse = await fetch('/api/bork/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId })
      });
      
      const processResult = await processResponse.json();
      
      if (processResult.success) {
        // Mark month as completed
        setCompletedMonths(prev => new Set(prev).add(monthKey));
        
        // Refresh validation data
        await validateAllLocations();
        
        toast({
          title: "Month Process Complete",
          description: `Successfully processed ${month} (${processResult.totalProcessed || 0} records)`,
        });
      } else {
        throw new Error(processResult.error || 'Month processing failed');
      }
    } catch (error) {
      console.error(`[Validation] Error processing month ${month}:`, error);
      toast({
        title: "Month Process Failed",
        description: `Failed to process ${month}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setProcessingDates(prev => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  };

  // Auto-validate on page load
  useEffect(() => {
    if (isClient) {
      validateAllLocations();
    }
  }, [isClient, validateAllLocations]);


  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bork API Connect</h1>
          <p className="text-muted-foreground">Connect and sync data from Bork API</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {!isClient ? (
        <div className="space-y-6">
          <div className="grid w-full grid-cols-4 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all bg-background text-foreground shadow-sm">Connection Test</div>
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all">Manual Sync</div>
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all">Cronjob</div>
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all">Master Sync</div>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  API Connection Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">Bar Bea</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">Van Kinsbergen</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">L&apos;Amour Toujours</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6" defaultValue="connection-test">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="connection-test">Connection Test</TabsTrigger>
            <TabsTrigger value="manual">Manual Sync</TabsTrigger>
            <TabsTrigger value="validation">Data Validation</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Validation</TabsTrigger>
            <TabsTrigger value="cronjob">Cronjob</TabsTrigger>
            <TabsTrigger value="master">Master Sync</TabsTrigger>
          </TabsList>

        {/* Connection Test Tab */}
        <TabsContent value="connection-test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                API Connection Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {connections.map((connection) => {
                  const isExpanded = expandedCards.has(connection.locationId);
                  const testResult = testResults.get(connection.locationId);
                  const isTestingConnection = isTesting.has(connection.locationId);
                  
                  return (
                    <div key={connection.id} className="border rounded-lg">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCardExpansion(connection.locationId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{connection.location}</h3>
                            {testResult && (
                              <div className="flex items-center gap-1">
                                {testResult.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isTestingConnection && (
                              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                            )}
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
                            <div className="text-sm text-gray-600">
                              <p><strong>API Key:</strong> {connection.apiKey}</p>
                              <p><strong>Base URL:</strong> {connection.baseUrl}</p>
                            </div>
                            
                            {testResult && (
                              <div className={`p-3 rounded-md ${
                                testResult.success 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-red-50 border border-red-200'
                              }`}>
                                <p className={`text-sm ${
                                  testResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {testResult.message}
                                </p>
                                {testResult.data && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-gray-600">
                                      View Response Data
                                    </summary>
                                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                      {(() => {
                                        try {
                                          return JSON.stringify(testResult.data, null, 2);
                                        } catch {
                                          return 'Unable to display data';
                                        }
                                      })()}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            )}
                            
                            <Button 
                              onClick={() => testConnection(connection)}
                              disabled={isTestingConnection}
                              className="w-full"
                              variant={testResult?.success ? "default" : "outline"}
                            >
                              {isTestingConnection ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Sync Tab */}
        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Sync</CardTitle>
                <CardDescription>
                  Select locations and time period for manual data synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Select Locations</Label>
                <div className="space-y-2">
                    {connections.filter(conn => conn.isActive).map((connection) => (
                      <div key={connection.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`location-${connection.id}`}
                          checked={selectedLocations.has(connection.locationId)}
                          onChange={() => toggleLocationSelection(connection.locationId)}
                          className="rounded border-gray-300"
                        />
                        <Label 
                          htmlFor={`location-${connection.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Database className="h-4 w-4" />
                          {connection.location}
                          {testResults.get(connection.locationId)?.success && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </Label>
                </div>
                    ))}
                </div>
                </div>

                {/* Period Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Select Period Type</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={selectedPeriodType === 'weekly' ? 'default' : 'outline'}
                      onClick={() => setSelectedPeriodType('weekly')}
                      className="flex-1"
                    >
                      Weekly
                    </Button>
                    <Button
                      variant={selectedPeriodType === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setSelectedPeriodType('monthly')}
                      className="flex-1"
                    >
                      Monthly
                    </Button>
                  </div>
                </div>

                {/* Period Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Select {selectedPeriodType === 'weekly' ? 'Week' : 'Month'}
                  </Label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Choose a {selectedPeriodType === 'weekly' ? 'week' : 'month'}...</option>
                    {generatePeriods().map((period) => (
                      <option key={period.key} value={period.key}>
                        {selectedPeriodType === 'monthly' && 'hasData' in period && period.hasData ? (
                          `✅ ${period.label} (${'recordCount' in period ? period.recordCount : 0} records)`
                        ) : (
                          period.label
                        )}
                      </option>
                    ))}
                  </select>
                  
                  {/* Monthly Status Summary */}
                  {selectedPeriodType === 'monthly' && (
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span>✅ = Completed</span>
                        <span>•</span>
                        <span>Numbers show record count</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sync Button */}
                <Button 
                  className="w-full"
                  onClick={startManualSync}
                  disabled={isSyncing || selectedLocations.size === 0 || !selectedPeriod}
                  size="lg"
                >
                  {isSyncing ? (
                    <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing {syncingLocations.size > 0 ? `(${syncingLocations.size} locations)` : ''}...
                    </>
                  ) : (
                    <>
                    <Play className="h-4 w-4 mr-2" />
                  Start Manual Sync
                    </>
                  )}
                </Button>

                {/* Edge Function Status Info */}
                <div className="text-xs text-muted-foreground text-center">
                  <p>Select locations and date range to manually synchronize Bork API data.</p>
                </div>

                {/* Sync Results */}
                {(syncResults.size > 0 || syncingLocations.size > 0) && (
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Sync Results</Label>
                    <div className="space-y-2">
                      {/* Show syncing locations */}
                      {Array.from(syncingLocations).map((locationId) => {
                        const connection = connections.find(c => c.locationId === locationId);
                        return (
                          <div 
                            key={`syncing-${locationId}`}
                            className="p-3 rounded-md border bg-blue-50 border-blue-200"
                          >
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                              <span className="text-sm font-medium text-blue-800">
                                {connection?.location}
                              </span>
                            </div>
                            <p className="text-sm mt-1 text-blue-700">
                              Syncing data...
                            </p>
                          </div>
                        );
                      })}
                      
                      {/* Show completed results */}
                      {Array.from(syncResults.entries()).map(([locationId, result]) => {
                        const connection = connections.find(c => c.locationId === locationId);
                        return (
                          <div 
                            key={locationId}
                            className={`p-3 rounded-md border ${
                              result.success 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`text-sm font-medium ${
                                result.success ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {connection?.location}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 ${
                              result.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {result.message}
                            </p>
                            <div className="mt-2 flex gap-2">
                              {!result.success ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryLocationSync(locationId)}
                                  disabled={syncingLocations.has(locationId)}
                                  className="text-xs"
                                >
                                  {syncingLocations.has(locationId) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Retrying...
                                    </>
                                  ) : (
                                    'Retry Sync'
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resyncLocation(locationId)}
                                  disabled={syncingLocations.has(locationId)}
                                  className="text-xs"
                                >
                                  {syncingLocations.has(locationId) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Resyncing...
                                    </>
                                  ) : (
                                    'Resync'
                                  )}
                                </Button>
                              )}
                              
                              {result.success && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => reprocessLocation(locationId)}
                                  disabled={isProcessingRawData}
                                  className="text-xs"
                                >
                                  {isProcessingRawData ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    'Reprocess'
                                  )}
                                </Button>
                              )}
                            </div>
                            {result.data && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-gray-600">
                                  View Sync Data
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                  {(() => {
                                    try {
                                      return JSON.stringify(result.data, null, 2);
                                    } catch {
                                      return 'Unable to display data';
                                    }
                                  })()}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Process Raw Data */}
            <Card>
              <CardHeader>
                <CardTitle>Process Raw Data</CardTitle>
                <CardDescription>
                  Convert raw Bork API data into structured sales records
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Raw data has been stored successfully. Click below to process it into structured sales records.
                        </div>
                  
                  <Button 
                    className="w-full"
                    onClick={processRawData}
                    disabled={isProcessingRawData}
                    size="lg"
                  >
                    {isProcessingRawData ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing Raw Data...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Process Raw Data
                      </>
                    )}
                  </Button>
                  
                  {rawDataProcessingResults.size > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Processing Results</Label>
                      <div className="space-y-2">
                        {Array.from(rawDataProcessingResults.entries()).map(([locationId, result]) => {
                          const connection = connections.find(c => c.locationId === locationId);
                          return (
                            <div 
                              key={locationId}
                              className={`p-3 rounded-md border ${
                                result.success 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {result.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-sm font-medium ${
                                  result.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {connection?.location}
                                </span>
                      </div>
                              <p className={`text-sm mt-1 ${
                                result.success ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {result.message}
                              </p>
                  </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Validate Revenue Button */}
                  {rawDataProcessingResults.size > 0 && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTab('revenue');
                          validateRevenue();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Database className="h-4 w-4" />
                        Validate Revenue
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Click to validate revenue accuracy against reference data
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle>Active Locations Status</CardTitle>
                <CardDescription>
                  Current sync status for all configured locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                  {connections.filter(conn => conn.isActive).map((connection) => {
                    const testResult = testResults.get(connection.locationId);
                    const syncResult = syncResults.get(connection.locationId);
                    
                    return (
                      <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-2">
                            {testResult?.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                            <Database className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <h4 className="font-medium">{connection.location}</h4>
                            <p className="text-sm text-muted-foreground">
                              {testResult?.success 
                                ? `Connected ${testResult.testedAt ? '• ' + formatDistanceToNow(new Date(testResult.testedAt), { addSuffix: true }) : ''}` 
                                : 'Connection not tested'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {syncResult ? (
                            <div className="flex items-center gap-2">
                              {syncResult.success ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Synced
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                          )}
                        </div>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                      </div>
                  </div>
                    );
                  })}
          </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {connections.filter(conn => conn.isActive && testResults.get(conn.locationId)?.success).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Connected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {connections.filter(conn => conn.isActive).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Locations</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {syncResults.size}
                      </div>
                      <div className="text-sm text-muted-foreground">Last Sync</div>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Raw Data Storage */}
          <RawDataStorage />
        </TabsContent>

        {/* Data Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Validation
              </CardTitle>
              <CardDescription>
                Compare reference data from Bork DataLab against database records to identify missing dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={validateAllLocations}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isValidating ? 'Validating...' : 'Refresh Validation'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Auto-validates on page load • Manual refresh available
                </div>
              </div>

              {/* Validation Results */}
              {validationData.size > 0 && (
                <div className="space-y-4">
                  {Array.from(validationData.entries()).map(([locationId, validation]) => {
                    const connection = connections.find(c => c.locationId === locationId);
                    const statusIcon = validation.status === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : validation.status === 'partial' ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    );

                    const statusText = validation.status === 'complete' ? 'Complete' : 
                                      validation.status === 'partial' ? 'Partial' : 'Missing';

                    return (
                      <div key={locationId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {statusIcon}
                            <div>
                              <h3 className="font-semibold">{connection?.location || 'Unknown Location'}</h3>
                              <div className="text-sm text-muted-foreground">
                                Status: {statusText} ({validation.completionPercentage}%)
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div>Expected: {validation.totalExpected} days</div>
                            <div>Actual: {validation.totalActual} days</div>
                            <div className="font-medium">
                              Missing: {validation.missingDates.length} days
                            </div>
                          </div>
                        </div>

                        {/* Missing Dates Section */}
                        {validation.missingDates.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Missing Dates ({validation.missingDates.length})</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const element = document.getElementById(`missing-dates-${locationId}`);
                                  if (element) {
                                    element.classList.toggle('hidden');
                                  }
                                }}
                              >
                                Toggle Details
                              </Button>
                            </div>
                            <div id={`missing-dates-${locationId}`} className="hidden">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {validation.missingDates.map((date: string) => {
                                  const dateKey = `${locationId}-${date}`;
                                  const isSyncing = syncingDates.has(dateKey);
                                  
                                  return (
                                    <div key={date} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                      <span className="text-sm font-mono">{date}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => syncMissingDate(locationId, date)}
                                        disabled={isSyncing}
                                        className="ml-2"
                                      >
                                        {isSyncing ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          'Sync & Process'
                                        )}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Monthly Breakdown Section */}
                        {validation.monthlyBreakdown && Object.keys(validation.monthlyBreakdown).length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Monthly Breakdown</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const element = document.getElementById(`monthly-breakdown-${locationId}`);
                                  if (element) {
                                    element.classList.toggle('hidden');
                                  }
                                }}
                              >
                                Toggle Details
                              </Button>
                            </div>
                            <div id={`monthly-breakdown-${locationId}`} className="hidden">
                              <div className="space-y-2">
                                {Object.entries(validation.monthlyBreakdown)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([month, data]) => {
                                    const monthData = data as { expected: number; actual: number; missing: string[]; completionPercentage: number };
                                    const monthStatus = monthData.completionPercentage === 100 ? 'complete' : 
                                                      monthData.completionPercentage >= 50 ? 'partial' : 'missing';
                                    const monthIcon = monthStatus === 'complete' ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : monthStatus === 'partial' ? (
                                      <Clock className="h-4 w-4 text-yellow-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    );

                                    const monthKey = `${locationId}-${month}`;
                                    const isSyncingMonth = syncingDates.has(monthKey);
                                    const isProcessingMonth = processingDates.has(monthKey);
                                    const isCompletedMonth = completedMonths.has(monthKey);

                                    return (
                                      <div key={month} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                                        <div className="flex items-center gap-3">
                                          {isCompletedMonth ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                          ) : (
                                            monthIcon
                                          )}
                                          <div>
                                            <div className="font-medium flex items-center gap-2">
                                              {month}
                                              {isCompletedMonth && (
                                                <Badge variant="secondary" className="text-xs">
                                                  <Check className="h-3 w-3 mr-1" />
                                                  Completed
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {monthData.actual}/{monthData.expected} days ({monthData.completionPercentage}%)
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-right text-sm">
                                            {monthData.missing.length > 0 && (
                                              <div className="text-red-600">
                                                Missing: {monthData.missing.length} days
                                              </div>
                                            )}
                                            {monthData.missing.length === 0 && (
                                              <div className="text-green-600">
                                                Complete
                                              </div>
                                            )}
                                          </div>
                                          {monthData.missing.length > 0 && (
                                            <div className="flex gap-1">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => syncMonth(locationId, month)}
                                                disabled={isSyncingMonth || isProcessingMonth}
                                                className="text-xs"
                                              >
                                                {isSyncingMonth ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isCompletedMonth ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  'Sync'
                                                )}
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => processMonth(locationId, month)}
                                                disabled={isSyncingMonth || isProcessingMonth}
                                                className="text-xs"
                                              >
                                                {isProcessingMonth ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isCompletedMonth ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  'Process'
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Extra Dates Section */}
                        {validation.extraDates.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-sm mb-2">Extra Dates ({validation.extraDates.length})</h4>
                            <div className="text-sm text-muted-foreground">
                              Dates in database but not in reference data: {validation.extraDates.slice(0, 5).join(', ')}
                              {validation.extraDates.length > 5 && ` and ${validation.extraDates.length - 5} more...`}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No validation data */}
              {validationData.size === 0 && !isValidating && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No validation data available</p>
                  <p className="text-sm">Click &quot;Refresh Validation&quot; to start</p>
                </div>
              )}

              {/* Loading state */}
              {isValidating && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Validating data against reference files...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Validation Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Revenue Validation
              </CardTitle>
              <CardDescription>
                Compare processed revenue against Bork DataLab reference data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={validateRevenue}
                  disabled={isValidatingRevenue}
                  className="flex items-center gap-2"
                >
                  {isValidatingRevenue ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isValidatingRevenue ? 'Validating...' : 'Validate Revenue'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Run this after processing data to verify revenue accuracy
                </div>
              </div>

              {/* Revenue Validation Results */}
              {revenueValidationData.size > 0 && (
                <div className="space-y-4">
                  {Array.from(revenueValidationData.entries()).map(([locationId, validation]) => {
                    const connection = connections.find(c => c.locationId === locationId);
                    const exactPercentage = validation.totalDates > 0 ? Math.round((validation.exactMatches / validation.totalDates) * 100) : 0;
                    const minorPercentage = validation.totalDates > 0 ? Math.round((validation.minorMismatches / validation.totalDates) * 100) : 0;
                    const majorPercentage = validation.totalDates > 0 ? Math.round((validation.majorMismatches / validation.totalDates) * 100) : 0;

                    return (
                      <div key={locationId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <h3 className="font-semibold">{connection?.location || 'Unknown Location'}</h3>
                              <div className="text-sm text-muted-foreground">
                                Matched using: {validation.matchedField === 'incl_vat' ? 'Incl. VAT' : 'Excl. VAT'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div>Total dates: {validation.totalDates}</div>
                            <div className="flex gap-4">
                              <span className="text-green-600">✅ {exactPercentage}% Exact</span>
                              <span className="text-yellow-600">⚠️ {minorPercentage}% Minor (&lt;2.5%)</span>
                              <span className="text-red-600">❌ {majorPercentage}% Major (&gt;2.5%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Mismatches Section */}
                        {validation.mismatches.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Revenue Mismatches ({validation.mismatches.length})</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const element = document.getElementById(`revenue-mismatches-${locationId}`);
                                  if (element) {
                                    element.classList.toggle('hidden');
                                  }
                                }}
                              >
                                Toggle Details
                              </Button>
                            </div>
                            <div id={`revenue-mismatches-${locationId}`} className="hidden">
                              {/* Major Mismatches */}
                              {validation.majorMismatches > 0 && (
                                <div className="mb-4">
                                  <h5 className="font-medium text-sm text-red-600 mb-2">
                                    Major Mismatches (&gt;2.5%) - {validation.majorMismatches}
                                  </h5>
                                  <div className="space-y-1">
                                    {validation.mismatches
                                      .filter(m => m.severity === 'major')
                                      .slice(0, 10)
                                      .map((mismatch) => (
                                        <div key={mismatch.date} className="flex items-center justify-between p-2 border rounded bg-red-50">
                                          <span className="text-sm font-mono">{mismatch.date}</span>
                                          <div className="text-sm">
                                            <span>€{mismatch.databaseRevenue.toFixed(2)} (DB) vs €{mismatch.referenceRevenue.toFixed(2)} (Ref)</span>
                                            <Badge variant="destructive" className="ml-2">
                                              {mismatch.percentageDiff > 0 ? '+' : ''}{mismatch.percentageDiff.toFixed(1)}%
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    {validation.majorMismatches > 10 && (
                                      <div className="text-sm text-muted-foreground">
                                        ... and {validation.majorMismatches - 10} more major mismatches
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Minor Mismatches */}
                              {validation.minorMismatches > 0 && (
                                <div>
                                  <h5 className="font-medium text-sm text-yellow-600 mb-2">
                                    Minor Mismatches (0-2.5%) - {validation.minorMismatches}
                                  </h5>
                                  <div className="space-y-1">
                                    {validation.mismatches
                                      .filter(m => m.severity === 'minor')
                                      .slice(0, 10)
                                      .map((mismatch) => (
                                        <div key={mismatch.date} className="flex items-center justify-between p-2 border rounded bg-yellow-50">
                                          <span className="text-sm font-mono">{mismatch.date}</span>
                                          <div className="text-sm">
                                            <span>€{mismatch.databaseRevenue.toFixed(2)} (DB) vs €{mismatch.referenceRevenue.toFixed(2)} (Ref)</span>
                                            <Badge variant="secondary" className="ml-2">
                                              {mismatch.percentageDiff > 0 ? '+' : ''}{mismatch.percentageDiff.toFixed(1)}%
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    {validation.minorMismatches > 10 && (
                                      <div className="text-sm text-muted-foreground">
                                        ... and {validation.minorMismatches - 10} more minor mismatches
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No revenue validation data */}
              {revenueValidationData.size === 0 && !isValidatingRevenue && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No revenue validation data available</p>
                  <p className="text-sm">Click &quot;Validate Revenue&quot; to start</p>
                </div>
              )}

              {/* Loading state */}
              {isValidatingRevenue && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Validating revenue against reference data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cronjob Tab */}
        <TabsContent value="cronjob" className="space-y-6">
          <BorkCronjobConfig />
          <CronSyncHistory />
        </TabsContent>

        {/* Master Sync Tab */}
        <TabsContent value="master" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Master Data Sync</CardTitle>
              <CardDescription>
                Synchronize master data across all locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Data Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">45</h3>
                  <p className="text-sm text-muted-foreground">Product Groups</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">8</h3>
                  <p className="text-sm text-muted-foreground">Payment Methods</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">12</h3>
                  <p className="text-sm text-muted-foreground">Cost Centers</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">25</h3>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
              </div>

              {/* Master Data Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Last Updated</h4>
                  <p className="text-sm text-muted-foreground">
                    Jan 20, 2024 at 8:00 AM
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All
                  </Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                </div>
              </div>

              {/* Master Data Tables */}
              <div className="space-y-4">
                <h4 className="font-medium">Master Data Tables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Product Groups</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Food, Beverages, Desserts, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Payment Methods</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cash, Card, Mobile, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Cost Centers</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Kitchen, Service, Management, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Users</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Staff members and roles
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

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
                <Button onClick={addConnection}>
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
                          <p><strong>API Key:</strong> {connection.apiKey}</p>
                          <p><strong>Base URL:</strong> {connection.baseUrl}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => editConnection(connection)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteConnection(connection.id)}
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
                    {editingConnection.id && connections.find(c => c.id === editingConnection.id) 
                      ? "Edit Connection" 
                      : "Add New Connection"
                    }
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location Name</Label>
                      <Input
                        id="location"
                        value={editingConnection.location}
                        onChange={(e) => setEditingConnection({
                          ...editingConnection,
                          location: e.target.value
                        })}
                        placeholder="e.g., Bar Bea"
                      />
                    </div>
                    <div>
                      <Label htmlFor="locationId">Location ID</Label>
                      <Input
                        id="locationId"
                        value={editingConnection.locationId}
                        onChange={(e) => setEditingConnection({
                          ...editingConnection,
                          locationId: e.target.value
                        })}
                        placeholder="e.g., 550e8400-e29b-41d4-a716-446655440002"
                      />
                    </div>
                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        value={editingConnection.apiKey}
                        onChange={(e) => setEditingConnection({
                          ...editingConnection,
                          apiKey: e.target.value
                        })}
                        placeholder="Enter API key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="baseUrl">Base URL</Label>
                      <Input
                        id="baseUrl"
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
                    <Button onClick={saveConnection}>
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
    </div>
  );
}
