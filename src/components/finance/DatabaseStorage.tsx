import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StorageResult {
  id: string;
  location_name: string;
  status: 'success' | 'failed';
  timestamp: string;
  records_processed: number;
  records_stored: number;
  duplicates_excluded: number;
  error_message?: string;
}

export function DatabaseStorage() {
  const [storageLogs, setStorageLogs] = useState<StorageResult[]>(() => {
    try {
      const saved = localStorage.getItem('databaseStorageLogs');
      if (saved) {
        console.log('🔍 CURSOR-DEV: Restoring database storage logs from localStorage');
        return JSON.parse(saved);
      }
    } catch (error) {
      console.log('🔍 CURSOR-DEV: No saved database storage logs found');
    }
    return [];
  });
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    if (storageLogs.length > 0) {
      console.log('🔍 CURSOR-DEV: Saving database storage logs to localStorage');
      localStorage.setItem('databaseStorageLogs', JSON.stringify(storageLogs));
    }
  }, [storageLogs]);

  const getLocationName = (locationId: string): string => {
    const locationMap: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours",
      '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen'
    };
    return locationMap[locationId] || 'Unknown Location';
  };

  const storeData = useMutation({
    mutationFn: async ({ locationId, locationName }: { locationId: string; locationName: string; }) => {
      console.log(`💾 Starting database storage for ${locationName}...`);

      // Fetch raw data from bork_sales_data (Step 2 output) and apply mapping logic
      const { data: rawData, error } = await supabase
        .from('bork_sales_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('category', 'STEP1_RAW_DATA') // Look for Step 2 raw data
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!rawData || rawData.length === 0) {
        throw new Error(`No raw data found for ${locationName}. Complete Step 2 (Raw Data Storage) first.`);
      }

      console.log(`🔍 Found ${rawData.length} raw records for ${locationName}`);

      // Apply data mapping logic (Step 4 functionality)
      const mappedData = rawData.map(record => {
        const rawDataContent = record.raw_data;
        console.log(`🔍 CURSOR-DEV: Processing raw data for ${locationName}:`, rawDataContent);
        
        if (!rawDataContent || typeof rawDataContent !== 'object') {
          console.log(`❌ CURSOR-DEV: Invalid raw data structure for ${locationName}`);
          return null; // Skip records without proper data structure
        }

        // Check if it's an array (direct API response) or object with Orders or raw_response
        let orders = [];
        if (Array.isArray(rawDataContent)) {
          orders = rawDataContent;
        } else if ('Orders' in rawDataContent && Array.isArray((rawDataContent as { Orders?: unknown[] }).Orders)) {
          orders = (rawDataContent as { Orders: unknown[] }).Orders;
        } else if ('raw_response' in rawDataContent && Array.isArray((rawDataContent as { raw_response?: unknown[] }).raw_response)) {
          orders = (rawDataContent as { raw_response: unknown[] }).raw_response;
          console.log(`🔍 CURSOR-DEV: Found raw_response array with ${orders.length} items for ${locationName}`);
        } else {
          console.log(`❌ CURSOR-DEV: No Orders or raw_response array found in raw data for ${locationName}`);
          console.log(`🔍 CURSOR-DEV: Available keys:`, Object.keys(rawDataContent));
          return null;
        }

        console.log(`🔍 CURSOR-DEV: Found ${orders.length} orders for ${locationName}`);
        console.log(`🔍 CURSOR-DEV: First order structure:`, orders[0]);
        console.log(`🔍 CURSOR-DEV: First order keys:`, orders[0] ? Object.keys(orders[0]) : 'No orders');
        
        // Check if any orders have Lines or Orders
        const ordersWithLines = orders.filter(order => order.Lines && Array.isArray(order.Lines));
        const ordersWithNestedOrders = orders.filter(order => order.Orders && Array.isArray(order.Orders));
        console.log(`🔍 CURSOR-DEV: Orders with Lines: ${ordersWithLines.length}, Orders with nested Orders: ${ordersWithNestedOrders.length}`);

        // Extract and map the data from orders
        const mappedRecords: Array<{
          location_id: string;
          date: string;
          product_name: string;
          category: string;
          quantity: number;
          price: number;
          revenue: number;
          raw_data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
          created_at: string;
        }> = [];

        orders.forEach((order: { Lines?: unknown[]; Orders?: unknown[] }, index: number) => {
          console.log(`🔍 CURSOR-DEV: Processing order ${index} for ${locationName}:`, order);
          
          // Check if this order has Lines directly
          if (order.Lines && Array.isArray(order.Lines)) {
            console.log(`🔍 CURSOR-DEV: Found ${order.Lines.length} lines in order ${index} for ${locationName}`);
            order.Lines.forEach((line: { ProductName?: string; Qty?: number; Price?: number; TotalInc?: number }, lineIndex: number) => {
              console.log(`🔍 CURSOR-DEV: Processing line ${lineIndex} for ${locationName}:`, line);
              mappedRecords.push({
                location_id: record.location_id,
                date: record.date,
                product_name: line.ProductName || 'Unknown Product',
                category: 'STEP6_STORED_DATA',
                quantity: line.Qty || 0,
                price: line.Price || 0,
                revenue: line.TotalInc || 0,
                raw_data: rawDataContent,
                created_at: new Date().toISOString()
              });
            });
          }
          // Check if this order has nested Orders with Lines
          else if (order.Orders && Array.isArray(order.Orders)) {
            console.log(`🔍 CURSOR-DEV: Found ${order.Orders.length} nested orders in order ${index} for ${locationName}`);
            order.Orders.forEach((nestedOrder: { Lines?: unknown[] }, nestedIndex: number) => {
              if (nestedOrder.Lines && Array.isArray(nestedOrder.Lines)) {
                console.log(`🔍 CURSOR-DEV: Found ${nestedOrder.Lines.length} lines in nested order ${nestedIndex} for ${locationName}`);
                nestedOrder.Lines.forEach((line: { ProductName?: string; Qty?: number; Price?: number; TotalInc?: number }, lineIndex: number) => {
                  console.log(`🔍 CURSOR-DEV: Processing nested line ${lineIndex} for ${locationName}:`, line);
                  mappedRecords.push({
                    location_id: record.location_id,
                    date: record.date,
                    product_name: line.ProductName || 'Unknown Product',
                    category: 'STEP6_STORED_DATA',
                    quantity: line.Qty || 0,
                    price: line.Price || 0,
                    revenue: line.TotalInc || 0,
                    raw_data: rawDataContent,
                    created_at: new Date().toISOString()
                  });
                });
              }
            });
          }
          else {
            console.log(`🔍 CURSOR-DEV: No Lines or Orders found in order ${index} for ${locationName}`);
            console.log(`🔍 CURSOR-DEV: Order keys:`, Object.keys(order));
          }
        });

        console.log(`🔍 CURSOR-DEV: Mapped ${mappedRecords.length} records from ${orders.length} orders for ${locationName}`);
        return mappedRecords;
      }).flat().filter(Boolean); // Remove null entries

      console.log(`🔍 Mapped ${mappedData.length} records from raw data`);

      // Apply duplicate filtering logic (same as Step 5)
      const recordKeys = mappedData.map(r => `${r.date}-${r.product_name}`);
      const uniqueKeys = new Set(recordKeys);
      const duplicateCount = recordKeys.length - uniqueKeys.size;

      console.log(`🔍 Duplicate analysis: ${duplicateCount} duplicates found in ${mappedData.length} records`);

      // Filter out duplicates - keep only first occurrence of each key
      const seenKeys = new Set();
      const uniqueRecords = mappedData.filter(record => {
        const key = `${record.date}-${record.product_name}`;
        if (seenKeys.has(key)) {
          return false; // Skip duplicate
        }
        seenKeys.add(key);
        return true;
      });

      console.log(`🔍 After duplicate filtering: ${uniqueRecords.length} unique records to store`);

      // Store unique records to database in batches to avoid timeout
      console.log(`🔍 CURSOR-DEV: Attempting to insert ${uniqueRecords.length} records to bork_sales_data in batches`);
      console.log(`🔍 CURSOR-DEV: Sample record structure:`, uniqueRecords[0]);
      
      const BATCH_SIZE = 5; // Process 5 records at a time to avoid timeout
      const batches = [];
      for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
        batches.push(uniqueRecords.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`🔍 CURSOR-DEV: Processing ${batches.length} batches of up to ${BATCH_SIZE} records each`);
      
      let totalStored = 0;
      const allStoredData = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔍 CURSOR-DEV: Processing batch ${i + 1}/${batches.length} with ${batch.length} records`);
        
        let batchData, batchError;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Retry logic for failed batches
        while (retryCount < maxRetries) {
          try {
            // Add timeout wrapper for database operations
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database operation timeout')), 10000)
            );
            
            const dbPromise = supabase
              .from('bork_sales_data')
              .insert(batch)
              .select();
            
            const result = await Promise.race([dbPromise, timeoutPromise]);
            
            batchData = result.data;
            batchError = result.error;
            
            if (!batchError) {
              break; // Success, exit retry loop
            }
            
            console.warn(`⚠️ CURSOR-DEV: Batch ${i + 1} attempt ${retryCount + 1} failed:`, batchError.message);
            retryCount++;
            
            if (retryCount < maxRetries) {
              console.log(`🔄 CURSOR-DEV: Retrying batch ${i + 1} in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.warn(`⚠️ CURSOR-DEV: Batch ${i + 1} attempt ${retryCount + 1} exception:`, error);
            retryCount++;
            
            if (retryCount < maxRetries) {
              console.log(`🔄 CURSOR-DEV: Retrying batch ${i + 1} in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        if (batchError) {
          console.error(`❌ CURSOR-DEV: Batch ${i + 1} failed after ${maxRetries} attempts:`, batchError);
          console.error(`❌ CURSOR-DEV: Error details:`, {
            code: batchError.code,
            message: batchError.message,
            details: batchError.details,
            hint: batchError.hint
          });
          throw batchError;
        }
        
        totalStored += batchData?.length || 0;
        allStoredData.push(...(batchData || []));
        console.log(`✅ Batch ${i + 1}/${batches.length} completed: ${batchData?.length || 0} records stored`);
        
        // Longer delay between batches to avoid overwhelming the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1000ms
        }
      }

      console.log(`✅ Successfully stored ${totalStored} unique records to database across ${batches.length} batches`);

      return {
        locationName,
        recordsProcessed: mappedData.length,
        recordsStored: totalStored,
        duplicatesExcluded: duplicateCount,
        storedData: allStoredData
      };
    },
    onSuccess: (result) => {
      console.log('✅ Database Storage Success:', result);
      const newLog: StorageResult = {
        id: Date.now().toString(),
        location_name: result.locationName,
        status: 'success',
        timestamp: new Date().toISOString(),
        records_processed: result.recordsProcessed,
        records_stored: result.recordsStored,
        duplicates_excluded: result.duplicatesExcluded,
      };
      setStorageLogs(prev => [newLog, ...prev]);
      toast.success(`💾 ${result.locationName} storage completed: ${result.recordsStored} records stored, ${result.duplicatesExcluded} duplicates excluded`);
    },
    onError: (error) => {
      console.error('❌ Database Storage Error:', error);
      const newLog: StorageResult = {
        id: Date.now().toString(),
        location_name: 'Unknown Location',
        status: 'failed',
        timestamp: new Date().toISOString(),
        records_processed: 0,
        records_stored: 0,
        duplicates_excluded: 0,
        error_message: error.message
      };
      setStorageLogs(prev => [newLog, ...prev]);
      toast.error("❌ Database storage failed: " + error.message);
    }
  });

  const filteredLogs = storageLogs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>💾 Database Storage</CardTitle>
        <CardDescription>
          Store validated data to database with duplicate filtering (bork_sales_data table).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Button
            onClick={() => storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440002", locationName: "Bar Bea" })}
            disabled={storeData.isPending}
            className="w-full"
          >
            {storeData.isPending ? "Storing..." : "💾 Bar Bea"}
          </Button>
          <Button
            onClick={() => storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440003", locationName: "L'Amour Toujours" })}
            disabled={storeData.isPending}
            className="w-full"
          >
            {storeData.isPending ? "Storing..." : "💾 L'Amour Toujours"}
          </Button>
          <Button
            onClick={() => storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440001", locationName: "Van Kinsbergen" })}
            disabled={storeData.isPending}
            className="w-full"
          >
            {storeData.isPending ? "Storing..." : "💾 Van Kinsbergen"}
          </Button>
          <Button
            onClick={() => {
              storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440002", locationName: "Bar Bea" });
              storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440003", locationName: "L'Amour Toujours" });
              storeData.mutate({ locationId: "550e8400-e29b-41d4-a716-446655440001", locationName: "Van Kinsbergen" });
            }}
            disabled={storeData.isPending}
            className="w-full"
            variant="outline"
          >
            {storeData.isPending ? "Storing All..." : "💾 Store All"}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug: Check Step 2 Raw Data</h4>
          <p className="text-sm text-blue-700 mb-2">
            Verify that Step 2 (Raw Data Storage) has created the data that Step 6 needs to map and store.
          </p>
          <Button
            onClick={async () => {
              console.log('🔍 Checking stored data in database...');
              const dbName = 'Just Stock It (Production)';
              console.log('🔍 Database project:', dbName);

              const { data, error } = await supabase
                .from('bork_sales_data')
                .select('*')
                .eq('category', 'STEP1_RAW_DATA')
                .order('created_at', { ascending: false });

              console.log('🔍 Stored data found:', { data, error, count: data?.length || 0 });
              toast.info(`Found ${data?.length || 0} stored records in database (${dbName})`);
            }}
            variant="outline"
            size="sm"
          >
            🔍 Check Step 2 Data
          </Button>
        </div>
      </CardContent>

      <Card>
        <CardHeader>
          <CardTitle>📋 Database Storage Log</CardTitle>
          <CardDescription>
            Track database storage results with duplicate exclusion counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({storageLogs.length})
            </Button>
            <Button
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success ({storageLogs.filter(log => log.status === 'success').length})
            </Button>
            <Button
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              Failed ({storageLogs.filter(log => log.status === 'failed').length})
            </Button>
            <Button
              onClick={() => {
                console.log('🔍 CURSOR-DEV: Refresh storage logs clicked');
                toast.info(`Current storage logs: ${storageLogs.length} entries`);
              }}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              🔄 Refresh
            </Button>
            {storageLogs.filter(log => log.status === 'failed').length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setStorageLogs(prev => prev.filter(log => log.status !== 'failed'));
                  toast.success("All failed storage logs removed");
                }}
                className="gap-1"
              >
                <span className="text-white font-bold">×</span>
                Clear All Failed
              </Button>
            )}
            {storageLogs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStorageLogs([]);
                  localStorage.removeItem('databaseStorageLogs');
                  toast.success("All storage logs cleared");
                }}
                className="gap-1"
              >
                🗑️ Clear All Tests
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Stored</TableHead>
                    <TableHead>Duplicates Excluded</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.location_name}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.records_processed}</TableCell>
                        <TableCell className="font-semibold text-green-600">{log.records_stored}</TableCell>
                        <TableCell className="font-semibold text-orange-600">{log.duplicates_excluded}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No database storage tests found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </Card>
  );
}
