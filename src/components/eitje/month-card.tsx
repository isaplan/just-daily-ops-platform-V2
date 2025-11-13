'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Play
} from 'lucide-react';

interface EndpointStatus {
  endpoint: string;
  displayName: string;
  status: 'not_synced' | 'synced' | 'processed' | 'error';
  recordsCount: number;
  lastSync?: string;
  error?: string;
}

interface MonthCardProps {
  year: number;
  month: number;
  monthName: string;
  onSyncAll: (year: number, month: number) => Promise<void>;
}

const ENDPOINTS: Array<{ key: string; displayName: string; isMasterData: boolean }> = [
  { key: 'environments', displayName: 'Environments', isMasterData: true },
  { key: 'teams', displayName: 'Teams', isMasterData: true },
  { key: 'users', displayName: 'Users', isMasterData: true },
  { key: 'shift_types', displayName: 'Shift Types', isMasterData: true },
  { key: 'time_registration_shifts', displayName: 'Time Shifts', isMasterData: false },
  { key: 'revenue_days', displayName: 'Revenue Days', isMasterData: false },
];

// Cache for endpoint status requests (5 minute TTL)
const statusCache = new Map<string, { data: EndpointStatus[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function MonthCard({ year, month, monthName, onSyncAll }: MonthCardProps) {
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const loadingRef = useRef(false);

  // Load endpoint statuses for this month with caching
  const loadEndpointStatuses = async (forceRefresh = false) => {
    // Prevent concurrent requests
    if (loadingRef.current && !forceRefresh) {
      return;
    }

    const cacheKey = `${year}-${month}`;
    const cached = statusCache.get(cacheKey);
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setEndpointStatuses(cached.data);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const statuses: EndpointStatus[] = [];
      
      for (const endpoint of ENDPOINTS) {
        // Check if raw data exists for this endpoint and month
        const response = await fetch(`/api/eitje/endpoint-status?endpoint=${endpoint.key}&year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
          const hasRawData = data.data.rawDataCount > 0;
          const hasAggregatedData = data.data.aggregatedDataCount > 0;
          
          let status: EndpointStatus['status'] = 'not_synced';
          if (hasAggregatedData) {
            status = 'processed';
          } else if (hasRawData) {
            status = 'synced';
          }
          
          statuses.push({
            endpoint: endpoint.key,
            displayName: endpoint.displayName,
            status,
            recordsCount: data.data.rawDataCount || 0,
            lastSync: data.data.lastSync,
            error: data.data.error
          });
        } else {
          statuses.push({
            endpoint: endpoint.key,
            displayName: endpoint.displayName,
            status: 'error',
            recordsCount: 0,
            error: data.error
          });
        }
      }
      
      // Update cache
      statusCache.set(cacheKey, { data: statuses, timestamp: Date.now() });
      setEndpointStatuses(statuses);
    } catch (error) {
      console.error(`Failed to load statuses for ${year}-${month}:`, error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadEndpointStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await onSyncAll(year, month);
      // Clear cache and reload statuses after sync
      const cacheKey = `${year}-${month}`;
      statusCache.delete(cacheKey);
      setTimeout(async () => {
        await loadEndpointStatuses(true);
      }, 2000);
    } catch (error) {
      console.error(`Sync all failed for ${year}-${month}:`, error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'synced':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Done</Badge>;
      case 'synced':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Raw Data</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Not Synced</Badge>;
    }
  };

  // Check if all endpoints are processed
  const allProcessed = endpointStatuses.length > 0 && endpointStatuses.every(ep => ep.status === 'processed');
  const hasErrors = endpointStatuses.some(ep => ep.status === 'error');

  if (loading) {
    return (
      <Card className="w-full lg:w-6/12 md:w-6/12 sm:w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{monthName} {year}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => loadEndpointStatuses(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Processed: {endpointStatuses.filter(ep => ep.status === 'processed').length}/{endpointStatuses.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span>Total Records: {endpointStatuses.reduce((sum, ep) => sum + ep.recordsCount, 0)}</span>
          </div>
        </div>

        {/* Individual Endpoint Status */}
        <div className="space-y-2">
          {endpointStatuses.map((endpoint) => (
            <div key={endpoint.endpoint} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                {getStatusIcon(endpoint.status)}
                <span className="text-sm font-medium">{endpoint.displayName}</span>
                <span className="text-xs text-gray-500">({endpoint.recordsCount} records)</span>
              </div>
              {getStatusBadge(endpoint.status)}
            </div>
          ))}
        </div>

        {/* Single Sync Button */}
        <div className="pt-2">
          <Button
            onClick={handleSyncAll}
            disabled={syncing || allProcessed}
            className="w-full"
            variant={hasErrors ? "destructive" : allProcessed ? "outline" : "default"}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing All Endpoints...
              </>
            ) : allProcessed ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                All Done
              </>
            ) : hasErrors ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Retry Sync All
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Sync All Endpoints
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
