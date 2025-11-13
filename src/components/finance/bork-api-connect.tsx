'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Calendar,
  Database,
  AlertCircle
} from 'lucide-react';

export function BorkApiConnect() {
  const [syncStatus, setSyncStatus] = useState({
    isConnected: false,
    lastSync: null,
    syncInProgress: false,
    error: null
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('550e8400-e29b-41d4-a716-446655440001');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handleSync = async (syncType: 'daily' | 'range' | 'master') => {
    setSyncStatus(prev => ({ ...prev, syncInProgress: true, error: null }));

    try {
      const response = await fetch('/api/bork-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation,
          dateRange: syncType === 'daily' ? dateRange.end : dateRange,
          syncType
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSyncStatus(prev => ({
          ...prev,
          isConnected: true,
          lastSync: new Date().toISOString(),
          syncInProgress: false,
          error: null
        }));
        alert(`${syncType} sync completed successfully.`);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error: any) {
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        error: error.message
      }));
      alert(`Sync failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {syncStatus.isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span>Bork API Connection</span>
            <Badge variant={syncStatus.isConnected ? "default" : "destructive"}>
              {syncStatus.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Status: {syncStatus.isConnected ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Last Sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Location: {selectedLocation || 'None'}</span>
            </div>
          </div>

          {syncStatus.error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{syncStatus.error}</span>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={() => handleSync('daily')}
              disabled={syncStatus.syncInProgress}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Sync Today
            </Button>
            <Button 
              onClick={() => handleSync('master')}
              disabled={syncStatus.syncInProgress}
              variant="outline"
            >
              <Database className="h-4 w-4 mr-2" />
              Sync Master Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}