/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/real-sync
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Square, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: string | null;
  config: {
    interval: number;
    batchSize: number;
    retryAttempts: number;
    timeout: number;
    validateData: boolean;
  };
  uptime: number | null;
  nextSyncIn: number | null;
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

export default function RealSyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastManualSync, setLastManualSync] = useState<SyncResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // DEFENSIVE: Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data.status);
      } else {
        console.error('Failed to fetch sync status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  // DEFENSIVE: Start sync
  const startSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval: 15, // 15 minutes
          batchSize: 100,
          retryAttempts: 3,
          timeout: 30000,
          validateData: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchSyncStatus();
        console.log('Sync started successfully');
      } else {
        console.error('Failed to start sync:', data.error);
      }
    } catch (error) {
      console.error('Error starting sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Stop sync
  const stopSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchSyncStatus();
        console.log('Sync stopped successfully');
      } else {
        console.error('Failed to stop sync:', data.error);
      }
    } catch (error) {
      console.error('Error stopping sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Trigger manual sync
  const triggerManualSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: 50,
          retryAttempts: 3,
          timeout: 30000,
          validateData: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastManualSync(data.data);
        await fetchSyncStatus();
        console.log('Manual sync completed:', data.data);
      } else {
        console.error('Manual sync failed:', data.error);
      }
    } catch (error) {
      console.error('Error triggering manual sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Auto-refresh effect
  useEffect(() => {
    fetchSyncStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSyncStatus, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // DEFENSIVE: Format time
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // DEFENSIVE: Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real Data Synchronization</h1>
          <p className="text-muted-foreground">
            Manage real-time data sync with Eitje API using your actual credentials
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <span className="text-sm">Auto-refresh</span>
        </div>
      </div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Sync Status</span>
            {syncStatus?.isRunning ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
              <p className="text-sm">{formatTime(syncStatus?.lastSyncTime || null)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Uptime</p>
              <p className="text-sm">{formatDuration(syncStatus?.uptime || null)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Interval</p>
              <p className="text-sm">{syncStatus?.config?.interval || 0} minutes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Batch Size</p>
              <p className="text-sm">{syncStatus?.config?.batchSize || 0} records</p>
            </div>
          </div>
          
          {syncStatus?.nextSyncIn && syncStatus.nextSyncIn > 0 && (
            <Alert>
              <AlertDescription>
                Next sync in {Math.floor(syncStatus.nextSyncIn / 60)} minutes {syncStatus.nextSyncIn % 60} seconds
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Controls</CardTitle>
          <CardDescription>
            Start, stop, or trigger manual synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button
              onClick={startSync}
              disabled={isLoading || syncStatus?.isRunning}
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Start Sync</span>
            </Button>
            
            <Button
              onClick={stopSync}
              disabled={isLoading || !syncStatus?.isRunning}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>Stop Sync</span>
            </Button>
            
            <Button
              onClick={triggerManualSync}
              disabled={isLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Manual Sync</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Manual Sync Results */}
      {lastManualSync && (
        <Card>
          <CardHeader>
            <CardTitle>Last Manual Sync Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Records Processed</p>
                <p className="text-2xl font-bold">{lastManualSync.recordsProcessed}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Records Added</p>
                <p className="text-2xl font-bold text-green-600">{lastManualSync.recordsAdded}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Records Updated</p>
                <p className="text-2xl font-bold text-blue-600">{lastManualSync.recordsUpdated}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{lastManualSync.errors}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sync Time</p>
                <p className="text-sm">{lastManualSync.syncTime}ms</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={lastManualSync.success ? "default" : "destructive"}>
                  {lastManualSync.success ? "Success" : "Failed"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Info */}
      {syncStatus?.config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Interval</p>
                <p className="text-muted-foreground">{syncStatus.config.interval} minutes</p>
              </div>
              <div>
                <p className="font-medium">Batch Size</p>
                <p className="text-muted-foreground">{syncStatus.config.batchSize} records</p>
              </div>
              <div>
                <p className="font-medium">Retry Attempts</p>
                <p className="text-muted-foreground">{syncStatus.config.retryAttempts}</p>
              </div>
              <div>
                <p className="font-medium">Timeout</p>
                <p className="text-muted-foreground">{syncStatus.config.timeout}ms</p>
              </div>
              <div>
                <p className="font-medium">Data Validation</p>
                <Badge variant={syncStatus.config.validateData ? "default" : "secondary"}>
                  {syncStatus.config.validateData ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

