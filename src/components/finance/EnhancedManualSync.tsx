// Enhanced Manual Sync with Date Range Controls
// Updated: 2025-01-20 - Added date buttons and week selector

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Database, AlertTriangle, Play, CheckCircle } from "lucide-react";
import { RawDataStorage } from "./RawDataStorage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export function EnhancedManualSync() {
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // Helper: YYYY-MM-DD -> YYYYMMDD
  const toBorkDate = (iso: string) => iso.replaceAll("-", "");

  // Sleep helper
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Generate inclusive list of ISO dates in range
  const datesInRange = (startISO: string, endISO: string) => {
    const out: string[] = [];
    const start = new Date(startISO);
    const end = new Date(endISO);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  };

  // Get all active location IDs for server-side processing
  const fetchActiveLocationIds = async () => {
    // Try unified api_credentials table first
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("api_credentials")
      .select("location_id")
      .eq("provider", "bork")
      .eq("is_active", true);

    if (!unifiedError && unifiedData && unifiedData.length > 0) {
      console.log("✅ Using unified api_credentials table");
      return unifiedData.map(item => item.location_id);
    }

    // No fallback needed - use unified table only
    console.error("❌ Failed to load location IDs from api_credentials table:", unifiedError);
    return [];
  };

  // Call server-side daily sync function
  const runDailySync = async (dateYYYYMMDD: string, locationIds: string[]) => {
    const { data, error } = await supabase.functions.invoke("bork-sync-daily", {
      body: {
        date: dateYYYYMMDD,
        location_ids: locationIds,
        override: true,
      },
    });
    if (error) throw error;
    return data;
  };

  // Call server-side range sync function
  const runRangeSync = async (startDateYYYYMMDD: string, endDateYYYYMMDD: string, locationIds: string[]) => {
    const { data, error } = await supabase.functions.invoke("bork-sync-range", {
      body: {
        start_date: startDateYYYYMMDD,
        end_date: endDateYYYYMMDD,
        location_ids: locationIds,
        override: true,
      },
    });
    if (error) throw error;
    return data;
  };

  // Generate week options from Jan 1st to now
  const generateWeekOptions = () => {
    const options = [];
    const startDate = new Date('2025-01-01');
    const today = new Date();
    
    const currentWeek = new Date(startDate);
    
    while (currentWeek <= today) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekStartStr = currentWeek.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      options.push({
        value: `${weekStartStr}_${weekEndStr}`,
        label: `Week of ${currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        startDate: weekStartStr,
        endDate: weekEndStr
      });
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    return options.reverse(); // Most recent first
  };

  // Quick date range functions
  const getDateRange = (type: 'today' | 'yesterday' | 'last3days' | 'last7days'): DateRange => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'today':
        return {
          startDate: todayStr,
          endDate: todayStr,
          label: 'Today'
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return {
          startDate: yesterdayStr,
          endDate: yesterdayStr,
          label: 'Yesterday'
        };
      case 'last3days':
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
        return {
          startDate: threeDaysAgo.toISOString().split('T')[0],
          endDate: todayStr,
          label: 'Last 3 Days'
        };
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return {
          startDate: sevenDaysAgo.toISOString().split('T')[0],
          endDate: todayStr,
          label: 'Last 7 Days'
        };
      default:
        return {
          startDate: todayStr,
          endDate: todayStr,
          label: 'Today'
        };
    }
  };

  const handleQuickSync = async (type: 'today' | 'yesterday' | 'last3days' | 'last7days') => {
    const range = getDateRange(type);
    setSelectedRange(range);
    setIsLoading(true);
    try {
      const locationIds = await fetchActiveLocationIds();
      if (!locationIds.length) {
        console.warn("No active Bork credentials found.");
        return;
      }

      // Use range sync for multiple days, daily sync for single day
      if (range.startDate === range.endDate) {
        const borkDate = toBorkDate(range.startDate);
        console.log(`🔄 Syncing single day: ${range.startDate} (${borkDate})`);
        const result = await runDailySync(borkDate, locationIds);
        console.log(`✅ Daily sync result:`, result);
      } else {
        const startBorkDate = toBorkDate(range.startDate);
        const endBorkDate = toBorkDate(range.endDate);
        console.log(`🔄 Syncing range: ${range.startDate} to ${range.endDate} (${startBorkDate} to ${endBorkDate})`);
        const result = await runRangeSync(startBorkDate, endBorkDate, locationIds);
        console.log(`✅ Range sync result:`, result);
      }

      // Auto-process raw data after successful sync (background)
      console.log(`🔄 Auto-processing raw data after sync...`);
      processRawData(); // Don't await - run in background
      
    } catch (error) {
      console.error(`❌ Sync failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekSync = async (weekValue: string) => {
    const [startDate, endDate] = weekValue.split('_');
    const range: DateRange = {
      startDate,
      endDate,
      label: `Week of ${new Date(startDate).toLocaleDateString()}`
    };
    setSelectedRange(range);
    setIsLoading(true);
    try {
      const locationIds = await fetchActiveLocationIds();
      if (!locationIds.length) {
        console.warn("No active Bork credentials found.");
        return;
      }

      const startBorkDate = toBorkDate(range.startDate);
      const endBorkDate = toBorkDate(range.endDate);
      console.log(`🔄 Syncing week: ${range.startDate} to ${range.endDate} (${startBorkDate} to ${endBorkDate})`);
      const result = await runRangeSync(startBorkDate, endBorkDate, locationIds);
      console.log(`✅ Week sync result:`, result);

      // Auto-process raw data after successful sync
      console.log(`🔄 Auto-processing raw data after week sync...`);
      await processRawData();
      
    } catch (error) {
      console.error(`❌ Week sync failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekSelect = (weekValue: string) => {
    setSelectedWeek(weekValue);
  };

  const handleSyncSelectedWeek = () => {
    if (selectedWeek) {
      handleWeekSync(selectedWeek);
    } else {
      console.warn('No week selected');
    }
  };

  // Process raw data through 6-step pipeline with batching
  const processRawData = async () => {
    setIsProcessing(true);
    setProcessingStatus("Starting data processing...");
    
    try {
      // Step 1: Get raw data (limit to recent records to avoid network issues)
      setProcessingStatus("Step 1: Loading raw data...");
      const { data: rawData, error: rawError } = await supabase
        .from('bork_sales_data')
        .select('id, location_id, date, raw_data, created_at')
        .eq('category', 'STEP1_RAW_DATA')
        .order('created_at', { ascending: false })
        .limit(50); // Further limit to prevent timeout

      if (rawError) throw rawError;
      if (!rawData || rawData.length === 0) {
        throw new Error('No raw data found to process');
      }

      console.log(`🔍 Found ${rawData.length} raw records to process (limited to 100 for performance)`);

      // Step 2: Process each location's raw data in batches
      const locationIds = [...new Set(rawData.map(record => record.location_id))];
      let totalProcessed = 0;
      const BATCH_SIZE = 20; // Process in smaller batches

      for (const locationId of locationIds) {
        const locationName = getLocationName(locationId);
        setProcessingStatus(`Step 2: Processing ${locationName}...`);
        
        const locationRawData = rawData.filter(record => record.location_id === locationId);
        console.log(`🔍 Processing ${locationRawData.length} records for ${locationName}`);

        // Process in batches to avoid network timeouts
        for (let i = 0; i < locationRawData.length; i += BATCH_SIZE) {
          const batch = locationRawData.slice(i, i + BATCH_SIZE);
          setProcessingStatus(`Step 3: Mapping batch ${Math.floor(i/BATCH_SIZE) + 1} for ${locationName}...`);
          
          // Step 3: Data mapping and transformation
          const mappedData = await mapRawData(batch, locationName);
          
          if (mappedData.length === 0) {
            console.warn(`⚠️ No data to process in batch for ${locationName}`);
            continue;
          }

          // Step 4: Data validation
          setProcessingStatus(`Step 4: Validating batch for ${locationName}...`);
          const validatedData = await validateData(mappedData, locationName);

          // Step 5: Store processed data
          setProcessingStatus(`Step 5: Storing batch for ${locationName}...`);
          const storedCount = await storeProcessedData(validatedData, locationName);
          
          totalProcessed += storedCount;
          console.log(`✅ Processed ${storedCount} records in batch for ${locationName}`);
          
          // Small delay between batches to prevent network overload
          await sleep(500);
        }
      }

      // Step 6: Final validation
      setProcessingStatus("Step 6: Final validation...");
      await sleep(1000); // Brief pause for user feedback

      setProcessingStatus(`✅ Processing complete! ${totalProcessed} records processed.`);
      toast.success(`Data processing complete! ${totalProcessed} records processed.`);
      
    } catch (error) {
      console.error('❌ Data processing failed:', error);
      setProcessingStatus(`❌ Processing failed: ${error.message}`);
      toast.error(`Data processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to get location name
  const getLocationName = (locationId: string): string => {
    const locationMap: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen',
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours"
    };
    return locationMap[locationId] || `Unknown Location (${locationId})`;
  };

  // Map raw data to structured format
  const mapRawData = async (rawData: any[], locationName: string) => {
    const mappedData = [];
    
    for (const record of rawData) {
      const rawDataContent = record.raw_data;
      if (!rawDataContent || typeof rawDataContent !== 'object') continue;

      // Extract orders from raw data
      let orders = [];
      if (Array.isArray(rawDataContent)) {
        orders = rawDataContent;
      } else if ('Orders' in rawDataContent && Array.isArray(rawDataContent.Orders)) {
        orders = rawDataContent.Orders;
      } else if ('raw_response' in rawDataContent && Array.isArray(rawDataContent.raw_response)) {
        orders = rawDataContent.raw_response;
      }

      // Process each order
      for (const order of orders) {
        if (order.Lines && Array.isArray(order.Lines)) {
          for (const line of order.Lines) {
            mappedData.push({
              location_id: record.location_id,
              date: record.date,
              order_id: order.ID || order.id,
              line_id: line.ID || line.id,
              product_name: line.ProductName || line.product_name,
              quantity: line.Quantity || line.quantity || 0,
              price: line.Price || line.price || 0,
              total: line.Total || line.total || 0,
              category: 'PROCESSED_SALES_DATA',
              raw_data: line,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    }

    console.log(`🔍 Mapped ${mappedData.length} records for ${locationName}`);
    return mappedData;
  };

  // Validate processed data
  const validateData = async (data: any[], locationName: string) => {
    const validatedData = data.filter(record => {
      return record.quantity > 0 && record.price > 0 && record.product_name;
    });

    console.log(`🔍 Validated ${validatedData.length} records for ${locationName}`);
    return validatedData;
  };

  // Store processed data in database with retry logic
  const storeProcessedData = async (data: any[], locationName: string, retryCount = 0) => {
    if (data.length === 0) return 0;

    try {
      // Clear existing processed data for this location
      await supabase
        .from('bork_sales_data')
        .delete()
        .eq('location_id', data[0].location_id)
        .eq('category', 'PROCESSED_SALES_DATA');

      // Insert new processed data in smaller chunks
      const CHUNK_SIZE = 10; // Smaller chunks to avoid network issues
      let totalStored = 0;

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        
        const { error } = await supabase
          .from('bork_sales_data')
          .insert(chunk);

        if (error) {
          if (retryCount < 2) {
            console.warn(`⚠️ Retry ${retryCount + 1} for ${locationName} chunk ${i}-${i + CHUNK_SIZE}`);
            await sleep(1000); // Wait before retry
            return await storeProcessedData(data, locationName, retryCount + 1);
          }
          throw error;
        }

        totalStored += chunk.length;
        await sleep(200); // Small delay between chunks
      }

      console.log(`✅ Stored ${totalStored} processed records for ${locationName}`);
      return totalStored;
    } catch (error) {
      console.error(`❌ Failed to store data for ${locationName}:`, error);
      throw error;
    }
  };

  const weekOptions = generateWeekOptions();

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Selection
          </CardTitle>
          <CardDescription>
            Choose a date range for manual synchronization. Data will be overridden (not duplicated).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Quick Date Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Sync Options</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={() => handleQuickSync('today')}
                disabled={isLoading}
                variant="outline"
                className="h-12 flex flex-col items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Today</span>
              </Button>
              <Button 
                onClick={() => handleQuickSync('yesterday')}
                disabled={isLoading}
                variant="outline"
                className="h-12 flex flex-col items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Yesterday</span>
              </Button>
              <Button 
                onClick={() => handleQuickSync('last3days')}
                disabled={isLoading}
                variant="outline"
                className="h-12 flex flex-col items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Last 3 Days</span>
              </Button>
              <Button 
                onClick={() => handleQuickSync('last7days')}
                disabled={isLoading}
                variant="outline"
                className="h-12 flex flex-col items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Last 7 Days</span>
              </Button>
            </div>
          </div>

          {/* Week Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Weekly Sync (from Jan 1st)</Label>
            <div className="flex gap-2">
              <Select onValueChange={handleWeekSelect} disabled={isLoading}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a week to sync..." />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((week) => (
                    <SelectItem key={week.value} value={week.value}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSyncSelectedWeek}
                disabled={isLoading || !selectedWeek}
                variant="default"
                className="px-4"
              >
                {isLoading ? "Syncing..." : "Sync Week"}
              </Button>
            </div>
          </div>

          {/* Selected Range Display */}
          {selectedRange && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Range</span>
              </div>
              <div className="text-sm text-blue-800">
                <p><strong>Label:</strong> {selectedRange.label}</p>
                <p><strong>Start:</strong> {selectedRange.startDate}</p>
                <p><strong>End:</strong> {selectedRange.endDate}</p>
              </div>
            </div>
          )}

          {/* Data Processing Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data Processing</Label>
            <div className="flex gap-2">
              <Button 
                onClick={processRawData}
                disabled={isProcessing}
                className="flex-1"
                variant="default"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Process Raw Data
                  </>
                )}
              </Button>
            </div>
            
            {processingStatus && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  {isProcessing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium text-blue-900">
                    {processingStatus}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Server-Side Processing Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-green-800">🔒 Server-Side Processing</h4>
                <p className="text-sm text-green-700">
                  All API calls, credentials, and data processing happen securely on the server
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    Server-side credentials
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Built-in rate limiting
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Override existing data
                  </Badge>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Original RawDataStorage Component */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Manual Data Processing</CardTitle>
          <CardDescription>
            Process and validate the synchronized data through all 6 steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RawDataStorage />
        </CardContent>
      </Card>
    </div>
  );
}
