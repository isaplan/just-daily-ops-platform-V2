// API CLEAN SLATE - V1: Step 3 - Data Access Test
// Test reading stored raw data from database

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DataAccessLog {
  id: string;
  location_name: string;
  step2_status: 'success' | 'failed';
  reading_status: 'success' | 'failed';
  records_found: number;
  timestamp: string;
  raw_data?: any;
  error_message?: string;
}

export function DataAccessTest() {
  const [selectedLog, setSelectedLog] = useState<DataAccessLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([]);

  // Mock data for demonstration - in real implementation, this would come from database
  const mockAccessLogs: DataAccessLog[] = [
    {
      id: '1',
      location_name: 'Bar Bea',
      step2_status: 'success',
      reading_status: 'success',
      records_found: 202,
      timestamp: new Date().toISOString(),
      raw_data: { sample: 'data from Bar Bea - successfully read from database' }
    },
    {
      id: '2',
      location_name: "L'Amour Toujours",
      step2_status: 'success',
      reading_status: 'success',
      records_found: 36,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      raw_data: { sample: 'data from L\'Amour Toujours - successfully read from database' }
    },
    {
      id: '3',
      location_name: 'Van Kinsbergen',
      step2_status: 'success',
      reading_status: 'failed',
      records_found: 0,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      error_message: 'Database connection timeout'
    }
  ];

  useEffect(() => {
    setAccessLogs(mockAccessLogs);
  }, []);

  const filteredLogs = accessLogs.filter(log => {
    if (filter === 'all') return true;
    return log.reading_status === filter;
  });

  const testDataAccess = useMutation({
    mutationFn: async ({ locationId, locationName }: {
      locationId: string;
      locationName: string;
    }) => {
      console.log(`🔍 Testing data access for ${locationName}...`);
      
      // Query the bork_sales_data table for raw data
      const { data, error } = await supabase
        .from('bork_sales_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('category', 'STEP1_RAW_DATA')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return { data, locationName, recordCount: data?.length || 0 };
    },
    onSuccess: (result) => {
      console.log('✅ Data Access Success:', result);
      
      // Add to access logs
      const newLog: DataAccessLog = {
        id: Date.now().toString(),
        location_name: result.locationName,
        step2_status: 'success',
        reading_status: 'success',
        records_found: result.recordCount,
        timestamp: new Date().toISOString(),
        raw_data: result.data
      };
      
      setAccessLogs(prev => [newLog, ...prev]);
      toast.success(`✅ ${result.locationName} data access successful!`);
    },
    onError: (error) => {
      console.error('❌ Data Access Error:', error);
      
      // Add failed access to logs
      const newLog: DataAccessLog = {
        id: Date.now().toString(),
        location_name: 'Unknown Location',
        step2_status: 'success',
        reading_status: 'failed',
        records_found: 0,
        timestamp: new Date().toISOString(),
        error_message: error.message
      };
      
      setAccessLogs(prev => [newLog, ...prev]);
      toast.error("❌ Data access failed: " + error.message);
    }
  });

  const handleRowClick = (log: DataAccessLog) => {
    setSelectedLog(log);
  };

  const handleDeleteLog = (logId: string) => {
    setAccessLogs(prev => prev.filter(log => log.id !== logId));
    toast.success("Failed data access removed from log");
  };

  return (
    <div className="space-y-6">
      {/* Test Data Access */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Test Data Access</CardTitle>
          <CardDescription>
            Test reading stored raw data from database (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Button 
              onClick={() => testDataAccess.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440002",
                locationName: "Bar Bea"
              })}
              disabled={testDataAccess.isPending}
              className="w-full"
            >
              {testDataAccess.isPending ? "Testing..." : "🔍 Bar Bea"}
            </Button>

            <Button 
              onClick={() => testDataAccess.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440003",
                locationName: "L'Amour Toujours"
              })}
              disabled={testDataAccess.isPending}
              className="w-full"
            >
              {testDataAccess.isPending ? "Testing..." : "🔍 L'Amour Toujours"}
            </Button>

            <Button 
              onClick={() => testDataAccess.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440001",
                locationName: "Van Kinsbergen"
              })}
              disabled={testDataAccess.isPending}
              className="w-full"
            >
              {testDataAccess.isPending ? "Testing..." : "🔍 Van Kinsbergen"}
            </Button>

            <Button 
              onClick={() => {
                testDataAccess.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440002",
                  locationName: "Bar Bea"
                });
                testDataAccess.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440003",
                  locationName: "L'Amour Toujours"
                });
                testDataAccess.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440001",
                  locationName: "Van Kinsbergen"
                });
              }}
              disabled={testDataAccess.isPending}
              className="w-full"
              variant="outline"
            >
              {testDataAccess.isPending ? "Testing All..." : "🔍 Test All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Access Registration Log */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Data Access Registration Log</CardTitle>
          <CardDescription>
            Track data access tests with Step 2 status and reading results (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({accessLogs.length})
            </Button>
            <Button 
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success ({accessLogs.filter(log => log.reading_status === 'success').length})
            </Button>
            <Button 
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              Failed ({accessLogs.filter(log => log.reading_status === 'failed').length})
            </Button>
            {accessLogs.filter(log => log.reading_status === 'failed').length > 0 && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  setAccessLogs(prev => prev.filter(log => log.reading_status !== 'failed'));
                  toast.success("All failed data access removed");
                }}
                className="gap-1"
              >
                <span className="text-white font-bold">×</span>
                Clear All Failed
              </Button>
            )}
            {accessLogs.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setAccessLogs([]);
                  toast.success("All test logs cleared");
                }}
                className="gap-1"
              >
                🗑️ Clear All Tests
              </Button>
            )}
          </div>

          {/* Access Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Step 2 Status</TableHead>
                  <TableHead>Reading Status</TableHead>
                  <TableHead>Records Found</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(log)}
                  >
                    <TableCell className="font-medium">{log.location_name}</TableCell>
                    <TableCell>
                      <Badge variant={log.step2_status === 'success' ? 'default' : 'destructive'}>
                        {log.step2_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.reading_status === 'success' ? 'default' : 'destructive'}>
                        {log.reading_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.records_found}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.reading_status === 'failed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <span className="text-white font-bold">×</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No data access tests found for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Preview Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📄 Data Access Preview - {selectedLog?.location_name}</DialogTitle>
            <DialogDescription>
              Raw data from database access on {selectedLog && new Date(selectedLog.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Step 2 Status:</strong> 
                  <Badge variant={selectedLog.step2_status === 'success' ? 'default' : 'destructive'} className="ml-2">
                    {selectedLog.step2_status}
                  </Badge>
                </div>
                <div>
                  <strong>Reading Status:</strong> 
                  <Badge variant={selectedLog.reading_status === 'success' ? 'default' : 'destructive'} className="ml-2">
                    {selectedLog.reading_status}
                  </Badge>
                </div>
                <div>
                  <strong>Records Found:</strong> {selectedLog.records_found}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
                {selectedLog.error_message && (
                  <div>
                    <strong>Error:</strong> {selectedLog.error_message}
                  </div>
                )}
              </div>
              
              <div>
                <strong>Raw Data from Database:</strong>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedLog.raw_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
