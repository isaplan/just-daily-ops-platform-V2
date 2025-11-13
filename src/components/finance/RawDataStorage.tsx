// API CLEAN SLATE - V1: Step 2 - Raw Data Storage
// Registration of API calls with success/failed filtering and data preview

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Eye, Filter, RefreshCw } from "lucide-react";

interface ApiCallLog {
  id: string;
  location_name: string;
  status: 'success' | 'failed';
  record_count: number;
  timestamp: string;
  raw_data?: Record<string, unknown>;
  error_message?: string;
}

export function RawDataStorage() {
  const [selectedLog, setSelectedLog] = useState<ApiCallLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [callLogs, setCallLogs] = useState<ApiCallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  // Load real data from API route
  const loadRealCallLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const response = await fetch('/api/raw-data');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const logs: ApiCallLog[] = (result.data || []).map((record: any) => ({
        id: record.id,
        location_name: getLocationName(record.location_id),
        status: record.quantity > 0 ? 'success' : 'failed',
        record_count: record.quantity || 0,
        timestamp: record.created_at,
        raw_data: record.raw_data,
        error_message: record.quantity === 0 ? 'No data received' : undefined
      }));
      
      setCallLogs(logs);
    } catch (error) {
      console.error('Load error:', error);
      setHasError(true);
      toast({
        title: "Loading Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Helper function to get location name from ID
  const getLocationName = (locationId: string): string => {
    const locationMap: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours",
      '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen'
    };
    return locationMap[locationId] || `Unknown Location (${locationId})`;
  };

  // Load real data on component mount
  useEffect(() => {
    loadRealCallLogs();
  }, [loadRealCallLogs]);

  const filteredLogs = callLogs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const refreshData = useMutation({
    mutationFn: async () => {
      await loadRealCallLogs();
    },
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Raw data storage has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: `Failed to refresh data: ${error.message}`,
        variant: "destructive"
      });
    }
  });


  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Raw Data Storage
          </CardTitle>
          <CardDescription>
            View and manage raw Bork API data stored in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'failed')}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Records</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
              </select>
          </div>
          
            <div className="flex items-center gap-2">
            <Button 
                onClick={() => refreshData.mutate()}
                disabled={refreshData.isPending || isLoading}
              variant="outline"
              size="sm"
            >
                <RefreshCw className={`h-4 w-4 mr-2 ${(refreshData.isPending || isLoading) ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* API Call Registration Log */}
      <Card>
        <CardHeader>
          <CardTitle>
            API Call Log ({filteredLogs.length} records)
          </CardTitle>
          <CardDescription>
            Recent API calls and their storage status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <p>Loading raw data...</p>
            </div>
          ) : hasError ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-red-600">Failed to load raw data</p>
              <p className="text-sm">Check console for details</p>
              <Button 
                onClick={() => loadRealCallLogs()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No raw data records found</p>
              <p className="text-sm">Complete a manual sync to generate raw data</p>
          </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.location_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.record_count}
                    </TableCell>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                        <Button
                        variant="outline"
                          size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              API Call Details - {selectedLog?.location_name}
            </DialogTitle>
            <DialogDescription>
              Raw data and metadata from this API call
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <Badge variant={selectedLog.status === 'success' ? 'default' : 'destructive'}>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold">Record Count</h4>
                  <p>{selectedLog.record_count}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Timestamp</h4>
                  <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                  <div>
                  <h4 className="font-semibold">Location</h4>
                  <p>{selectedLog.location_name}</p>
                  </div>
              </div>
              
              {selectedLog.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Error Message</h4>
                  <p className="text-red-700">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.raw_data && (
              <div>
                  <h4 className="font-semibold mb-2">Raw Data</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(selectedLog.raw_data, null, 2)}
                </pre>
              </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}