// API CLEAN SLATE - V1: Step 4 - Data Mapping/Sanitization
// Map and sanitize raw data into structured format

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DataMappingLog {
  id: string;
  location_name: string;
  step3_status: 'success' | 'failed';
  mapping_status: 'success' | 'failed';
  records_mapped: number;
  timestamp: string;
  mapped_data?: any;
  error_message?: string;
}

export function DataMapping() {
  const [selectedLog, setSelectedLog] = useState<DataMappingLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [mappingLogs, setMappingLogs] = useState<DataMappingLog[]>(() => {
    // Try to restore from localStorage to survive HMR
    try {
      const saved = localStorage.getItem('dataMappingLogs');
      if (saved) {
        console.log('🔍 CURSOR-DEV: Restoring mapping logs from localStorage');
        return JSON.parse(saved);
      }
    } catch (error) {
      console.log('🔍 CURSOR-DEV: No saved logs found');
    }
    return [];
  });
  const [forceRender, setForceRender] = useState(0);

  // Mock data for demonstration - in real implementation, this would come from database
  const mockMappingLogs: DataMappingLog[] = [
    {
      id: '1',
      location_name: 'Bar Bea',
      step3_status: 'success',
      mapping_status: 'success',
      records_mapped: 202,
      timestamp: new Date().toISOString(),
      mapped_data: { sample: 'mapped data from Bar Bea - successfully transformed' }
    },
    {
      id: '2',
      location_name: "L'Amour Toujours",
      step3_status: 'success',
      mapping_status: 'success',
      records_mapped: 36,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      mapped_data: { sample: 'mapped data from L\'Amour Toujours - successfully transformed' }
    },
    {
      id: '3',
      location_name: 'Van Kinsbergen',
      step3_status: 'success',
      mapping_status: 'failed',
      records_mapped: 0,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      error_message: 'Data transformation failed - invalid format'
    }
  ];

  // Save to localStorage whenever mappingLogs changes
  useEffect(() => {
    if (mappingLogs.length > 0) {
      console.log('🔍 CURSOR-DEV: Saving mapping logs to localStorage');
      localStorage.setItem('dataMappingLogs', JSON.stringify(mappingLogs));
    }
  }, [mappingLogs]);

  const filteredLogs = mappingLogs.filter(log => {
    if (filter === 'all') return true;
    return log.mapping_status === filter;
  });

  // Debug: Log current state
  console.log('🔍 CURSOR-DEV: Current mappingLogs state:', mappingLogs);
  console.log('🔍 CURSOR-DEV: Filtered logs:', filteredLogs);

  const testDataMapping = useMutation({
    mutationFn: async ({ locationId, locationName }: {
      locationId: string;
      locationName: string;
    }) => {
      console.log(`🔄 Testing data mapping for ${locationName}...`);
      console.log(`🔍 CURSOR-DEV: Mutation started for ${locationName}`);
      
      // Query the bork_sales_data table for raw data to transform
      console.log(`🔍 Looking for raw data for location: ${locationId}`);
      
      const { data, error } = await supabase
        .from('bork_sales_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('category', 'STEP1_RAW_DATA')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log(`🔍 Raw data query result:`, { data, error, count: data?.length || 0 });
      
      if (error) throw error;
      
      // Enhanced debugging for Van Kinsbergen
      if (data?.length === 0) {
        console.log(`❌ CURSOR-DEV: No raw data found for Van Kinsbergen (${locationId})`);
        console.log(`❌ CURSOR-DEV: This means Step 2 (Raw Storage) failed or wasn't completed`);
        console.log(`❌ CURSOR-DEV: Check if Step 2 was successful for this location`);
        
        // Let's check what data actually exists for this location
        console.log(`🔍 CURSOR-DEV: Checking all data for location ${locationId}...`);
        const { data: allData, error: allError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('location_id', locationId)
          .order('created_at', { ascending: false });
        
        console.log(`🔍 CURSOR-DEV: All data for location ${locationId}:`, { allData, allError, count: allData?.length || 0 });
        
        if (allData && allData.length > 0) {
          console.log(`🔍 CURSOR-DEV: Found ${allData.length} records, but none with category 'STEP1_RAW_DATA'`);
          console.log(`🔍 CURSOR-DEV: Categories found:`, allData.map(r => r.category));
        }
        
        throw new Error(`No raw data found for ${locationName}. Step 2 (Raw Storage) must be completed first.`);
      }
      
      // Simulate data mapping/transformation
      const mappedData = data?.map(record => ({
        id: record.id,
        location_id: record.location_id,
        date: record.date,
        product_name: (record.raw_data as any)?.raw_response?.[0]?.Orders?.[0]?.Lines?.[0]?.ProductName || 'Unknown Product',
        category: (record.raw_data as any)?.raw_response?.[0]?.Orders?.[0]?.Lines?.[0]?.Category || 'Unknown Category',
        quantity: (record.raw_data as any)?.raw_response?.[0]?.Orders?.[0]?.Lines?.[0]?.Qty || 0,
        price: (record.raw_data as any)?.raw_response?.[0]?.Orders?.[0]?.Lines?.[0]?.Price || 0,
        revenue: (record.raw_data as any)?.raw_response?.[0]?.Orders?.[0]?.Lines?.[0]?.TotalInc || 0,
        mapped_at: new Date().toISOString()
      }));

      return { data: mappedData, locationName, recordCount: mappedData?.length || 0, manualUpdate: false };
    },
    onSuccess: (result) => {
      console.log('✅ Data Mapping Success:', result);
      console.log('🔍 CURSOR-DEV: Result details:', {
        locationName: result.locationName,
        recordCount: result.recordCount,
        dataLength: result.data?.length,
        data: result.data
      });
      
      // Only add to logs if this is NOT a manual update (to avoid duplicates)
      if (!result.manualUpdate) {
        const newLog: DataMappingLog = {
          id: Date.now().toString(),
          location_name: result.locationName,
          step3_status: 'success',
          mapping_status: 'success',
          records_mapped: result.recordCount || 0,
          timestamp: new Date().toISOString(),
          mapped_data: result.data
        };
        
        console.log('🔍 CURSOR-DEV: Creating log entry:', newLog);
        setMappingLogs(prev => {
          const updated = [newLog, ...prev];
          console.log('🔍 CURSOR-DEV: Updated mapping logs:', updated);
          console.log('🔍 CURSOR-DEV: Previous state length:', prev.length);
          console.log('🔍 CURSOR-DEV: New state length:', updated.length);
          return updated;
        });
        
        // Force re-render
        setForceRender(prev => prev + 1);
        console.log('🔍 CURSOR-DEV: Force render triggered');
      }
      
      toast.success(`✅ ${result.locationName} data mapping successful!`);
    },
    onError: (error) => {
      console.error('❌ Data Mapping Error:', error);
      
      // Add failed mapping to logs
      const newLog: DataMappingLog = {
        id: Date.now().toString(),
        location_name: 'Unknown Location',
        step3_status: 'success',
        mapping_status: 'failed',
        records_mapped: 0,
        timestamp: new Date().toISOString(),
        error_message: error.message
      };
      
      setMappingLogs(prev => [newLog, ...prev]);
      toast.error("❌ Data mapping failed: " + error.message);
    }
  });

  const handleRowClick = (log: DataMappingLog) => {
    setSelectedLog(log);
  };

  const handleDeleteLog = (logId: string) => {
    setMappingLogs(prev => prev.filter(log => log.id !== logId));
    toast.success("Failed data mapping removed from log");
  };

  return (
    <div className="space-y-6">
      {/* Test Data Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Test Data Mapping</CardTitle>
          <CardDescription>
            Test mapping and sanitizing raw data into structured format (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Button 
              onClick={() => testDataMapping.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440002",
                locationName: "Bar Bea"
              })}
              disabled={testDataMapping.isPending}
              className="w-full"
            >
              {testDataMapping.isPending ? "Testing..." : "🔄 Bar Bea"}
            </Button>

            <Button 
              onClick={() => testDataMapping.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440003",
                locationName: "L'Amour Toujours"
              })}
              disabled={testDataMapping.isPending}
              className="w-full"
            >
              {testDataMapping.isPending ? "Testing..." : "🔄 L'Amour Toujours"}
            </Button>

            <Button 
              onClick={async () => {
                console.log('🔍 CURSOR-DEV: Van Kinsbergen button clicked');
                try {
                  const result = await testDataMapping.mutateAsync({
                    locationId: "550e8400-e29b-41d4-a716-446655440001",
                    locationName: "Van Kinsbergen"
                  });
                  console.log('🔍 CURSOR-DEV: Van Kinsbergen mutation completed:', result);
                  
                  // Manual state update to ensure UI reflects the change
                  const newLog: DataMappingLog = {
                    id: Date.now().toString(),
                    location_name: 'Van Kinsbergen',
                    step3_status: 'success',
                    mapping_status: 'success',
                    records_mapped: result.recordCount || 0,
                    timestamp: new Date().toISOString(),
                    mapped_data: result.data
                  };
                  
                  setMappingLogs(prev => {
                    const updated = [newLog, ...prev];
                    console.log('🔍 CURSOR-DEV: Manual state update for Van Kinsbergen:', updated);
                    return updated;
                  });
                  
                  setForceRender(prev => prev + 1);
                  console.log('🔍 CURSOR-DEV: Manual force render triggered');
                  
                  // Mark the result as manual to prevent duplicate in success handler
                  result.manualUpdate = true;
                } catch (error) {
                  console.error('🔍 CURSOR-DEV: Van Kinsbergen mutation failed:', error);
                }
              }}
              disabled={testDataMapping.isPending}
              className="w-full"
            >
              {testDataMapping.isPending ? "Testing..." : "🔄 Van Kinsbergen"}
            </Button>

            <Button 
              onClick={() => {
                console.log('🔍 CURSOR-DEV: Test All button clicked');
                testDataMapping.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440002",
                  locationName: "Bar Bea"
                });
                testDataMapping.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440003",
                  locationName: "L'Amour Toujours"
                });
                testDataMapping.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440001",
                  locationName: "Van Kinsbergen"
                });
              }}
              disabled={testDataMapping.isPending}
              className="w-full"
              variant="outline"
            >
              {testDataMapping.isPending ? "Testing All..." : "🔄 Test All"}
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🔍 Debug: Check Raw Data</h4>
            <p className="text-sm text-yellow-700 mb-2">
              If you're getting 0 records mapped, check if Step 2 (Raw Storage) was completed successfully.
            </p>
            <Button 
              onClick={async () => {
                console.log('🔍 Checking all raw data in database...');
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                console.log('🔍 Connected to database:', supabaseUrl);
                const projectId = supabaseUrl?.split('//')[1]?.split('.')[0];
                const dbName = projectId === 'cajxmwyiwrhzryvawjkm' ? 'Just Stock It (Production)' : `Project ${projectId}`;
                console.log('🔍 Database project:', dbName);
                
                const { data, error } = await supabase
                  .from('bork_sales_data')
                  .select('*')
                  .eq('category', 'STEP1_RAW_DATA')
                  .order('created_at', { ascending: false });
                
                console.log('🔍 All raw data found:', { data, error, count: data?.length || 0 });
                
                // Check specifically for Van Kinsbergen
                const vanKinsbergenId = '550e8400-e29b-41d4-a716-446655440001';
                const vanKinsbergenData = data?.filter(record => record.location_id === vanKinsbergenId);
                console.log('🔍 Van Kinsbergen raw data:', { vanKinsbergenData, count: vanKinsbergenData?.length || 0 });
                
                // Also check ALL data for Van Kinsbergen (not just STEP1_RAW_DATA)
                const { data: allVanKinsbergenData, error: allVanKinsbergenError } = await supabase
                  .from('bork_sales_data')
                  .select('*')
                  .eq('location_id', vanKinsbergenId)
                  .order('created_at', { ascending: false });
                
                console.log('🔍 All Van Kinsbergen data (any category):', { allVanKinsbergenData, allVanKinsbergenError, count: allVanKinsbergenData?.length || 0 });
                if (allVanKinsbergenData && allVanKinsbergenData.length > 0) {
                  console.log('🔍 Van Kinsbergen categories found:', allVanKinsbergenData.map(r => r.category));
                }
                
                toast.info(`Found ${data?.length || 0} total raw data records (${vanKinsbergenData?.length || 0} for Van Kinsbergen) in database (${dbName})`);
              }}
              variant="outline"
              size="sm"
            >
              🔍 Check Raw Data in DB
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Mapping Registration Log */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Data Mapping Registration Log</CardTitle>
          <CardDescription>
            Track data mapping tests with Step 3 status and mapping results (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({mappingLogs.length})
            </Button>
            <Button 
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success ({mappingLogs.filter(log => log.mapping_status === 'success').length})
            </Button>
            <Button 
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              Failed ({mappingLogs.filter(log => log.mapping_status === 'failed').length})
            </Button>
            <Button 
              onClick={() => {
                console.log('🔍 CURSOR-DEV: Refresh button clicked');
                console.log('🔍 CURSOR-DEV: Current mappingLogs:', mappingLogs);
                toast.info(`Current logs: ${mappingLogs.length} entries`);
              }}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              🔄 Refresh
            </Button>
            {mappingLogs.filter(log => log.mapping_status === 'failed').length > 0 && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  setMappingLogs(prev => prev.filter(log => log.mapping_status !== 'failed'));
                  toast.success("All failed data mapping removed");
                }}
                className="gap-1"
              >
                <span className="text-white font-bold">×</span>
                Clear All Failed
              </Button>
            )}
            {mappingLogs.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setMappingLogs([]);
                  toast.success("All test logs cleared");
                }}
                className="gap-1"
              >
                🗑️ Clear All Tests
              </Button>
            )}
          </div>

          {/* Mapping Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Step 3 Status</TableHead>
                  <TableHead>Mapping Status</TableHead>
                  <TableHead>Records Mapped</TableHead>
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
                      <Badge variant={log.step3_status === 'success' ? 'default' : 'destructive'}>
                        {log.step3_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.mapping_status === 'success' ? 'default' : 'destructive'}>
                        {log.mapping_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.records_mapped}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.mapping_status === 'failed' && (
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
              No data mapping tests found for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Preview Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📄 Data Mapping Preview - {selectedLog?.location_name}</DialogTitle>
            <DialogDescription>
              Mapped data from transformation on {selectedLog && new Date(selectedLog.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Step 3 Status:</strong> 
                  <Badge variant={selectedLog.step3_status === 'success' ? 'default' : 'destructive'} className="ml-2">
                    {selectedLog.step3_status}
                  </Badge>
                </div>
                <div>
                  <strong>Mapping Status:</strong> 
                  <Badge variant={selectedLog.mapping_status === 'success' ? 'default' : 'destructive'} className="ml-2">
                    {selectedLog.mapping_status}
                  </Badge>
                </div>
                <div>
                  <strong>Records Mapped:</strong> {selectedLog.records_mapped}
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
                <strong>Mapped Data from Database:</strong>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedLog.mapped_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
