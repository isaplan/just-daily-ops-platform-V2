// API CLEAN SLATE - V1: Step 5 - Data Validation
// Validate mapped data quality, completeness, and business rules

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ValidationLog {
  id: string;
  location_name: string;
  validation_status: 'success' | 'failed' | 'warning';
  records_validated: number;
  validation_score: number; // 0-100
  timestamp: string;
  validation_details?: any;
  error_message?: string;
}

interface ValidationResult {
  completeness: number;
  quality: number;
  consistency: number;
  integrity: number;
  business_rules: number;
  overall_score: number;
  issues: string[];
  recommendations: string[];
}

export function DataValidation() {
  const [selectedLog, setSelectedLog] = useState<ValidationLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>(() => {
    // Try to restore from localStorage to survive HMR
    try {
      const saved = localStorage.getItem('dataValidationLogs');
      if (saved) {
        console.log('🔍 CURSOR-DEV: Restoring validation logs from localStorage');
        return JSON.parse(saved);
      }
    } catch (error) {
      console.log('🔍 CURSOR-DEV: No saved validation logs found');
    }
    return [];
  });
  const [forceRender, setForceRender] = useState(0);

  // Save to localStorage whenever validationLogs changes
  useEffect(() => {
    if (validationLogs.length > 0) {
      console.log('🔍 CURSOR-DEV: Saving validation logs to localStorage');
      localStorage.setItem('dataValidationLogs', JSON.stringify(validationLogs));
    }
  }, [validationLogs]);

  const filteredLogs = validationLogs.filter(log => {
    if (filter === 'all') return true;
    return log.validation_status === filter;
  });

  // Debug: Log current state
  console.log('🔍 CURSOR-DEV: Current validationLogs state:', validationLogs);
  console.log('🔍 CURSOR-DEV: Filtered logs:', filteredLogs);

  const testDataValidation = useMutation({
    mutationFn: async ({ locationId, locationName }: {
      locationId: string;
      locationName: string;
    }) => {
      console.log(`🔄 Testing data validation for ${locationName}...`);
      console.log(`🔍 CURSOR-DEV: Validation started for ${locationName}`);
      
      // Query the bork_sales_data table for mapped data to validate
      console.log(`🔍 Looking for mapped data for location: ${locationId}`);
      
      const { data, error } = await supabase
        .from('bork_sales_data')
        .select('*')
        .eq('location_id', locationId)
        .eq('category', 'STEP1_RAW_DATA')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log(`🔍 Mapped data query result:`, { data, error, count: data?.length || 0 });
      
      if (error) throw error;
      
      if (data?.length === 0) {
        console.log(`❌ CURSOR-DEV: No mapped data found for ${locationName} (${locationId})`);
        console.log(`❌ CURSOR-DEV: This means Step 4 (Data Mapping) must be completed first`);
        throw new Error(`No mapped data found for ${locationName}. Step 4 (Data Mapping) must be completed first.`);
      }

      // Perform validation checks
      const validationResult = await performValidation(data, locationName);
      
      return { 
        data: validationResult, 
        locationName, 
        recordCount: data.length,
        validationScore: validationResult.overall_score,
        manualUpdate: false
      };
    },
    onSuccess: (result) => {
      console.log('✅ Data Validation Success:', result);
      console.log('🔍 CURSOR-DEV: Result details:', {
        locationName: result.locationName,
        recordCount: result.recordCount,
        validationScore: result.validationScore,
        data: result.data
      });
      
      // Only add to logs if this is NOT a manual update (to avoid duplicates)
      if (!result.manualUpdate) {
        const newLog: ValidationLog = {
          id: Date.now().toString(),
          location_name: result.locationName,
          validation_status: result.validationScore >= 80 ? 'success' : result.validationScore >= 60 ? 'warning' : 'failed',
          records_validated: result.recordCount || 0,
          validation_score: result.validationScore || 0,
          timestamp: new Date().toISOString(),
          validation_details: result.data
        };
        
        console.log('🔍 CURSOR-DEV: Creating validation log entry:', newLog);
        setValidationLogs(prev => {
          const updated = [newLog, ...prev];
          console.log('🔍 CURSOR-DEV: Updated validation logs:', updated);
          console.log('🔍 CURSOR-DEV: Previous state length:', prev.length);
          console.log('🔍 CURSOR-DEV: New state length:', updated.length);
          return updated;
        });
        
        // Force re-render
        setForceRender(prev => prev + 1);
        console.log('🔍 CURSOR-DEV: Force render triggered');
      }
      
      toast.success(`✅ ${result.locationName} data validation completed! Score: ${result.validationScore}%`);
    },
    onError: (error) => {
      console.error('❌ Data Validation Error:', error);
      
      // Add failed validation to logs
      const newLog: ValidationLog = {
        id: Date.now().toString(),
        location_name: 'Unknown Location',
        validation_status: 'failed',
        records_validated: 0,
        validation_score: 0,
        timestamp: new Date().toISOString(),
        error_message: error.message
      };
      
      setValidationLogs(prev => [newLog, ...prev]);
      toast.error("❌ Data validation failed: " + error.message);
    }
  });

  // Validation logic
  const performValidation = async (data: any[], locationName: string): Promise<ValidationResult> => {
    console.log(`🔍 CURSOR-DEV: Performing validation for ${locationName} with ${data.length} records`);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Completeness Check (25 points)
    let completenessScore = 0;
    const requiredFields = ['location_id', 'date', 'product_name', 'quantity', 'price', 'revenue'];
    
    data.forEach((record, index) => {
      const missingFields = requiredFields.filter(field => !record[field] && record[field] !== 0);
      if (missingFields.length === 0) {
        completenessScore += 1;
      } else {
        issues.push(`Record ${index + 1}: Missing fields: ${missingFields.join(', ')}`);
      }
    });
    
    const completeness = (completenessScore / data.length) * 25;
    
    // 2. Quality Check (25 points)
    let qualityScore = 0;
    data.forEach((record, index) => {
      let recordQuality = 0;
      
      // Check numeric values are positive
      if (record.quantity > 0) recordQuality += 0.5;
      if (record.price >= 0) recordQuality += 0.5;
      if (record.revenue >= 0) recordQuality += 0.5;
      
      // Check date is valid
      if (record.date && new Date(record.date).getTime() > 0) recordQuality += 0.5;
      
      qualityScore += recordQuality;
      
      if (recordQuality < 1) {
        issues.push(`Record ${index + 1}: Quality issues detected`);
      }
    });
    
    const quality = (qualityScore / data.length) * 25;
    
    // 3. Consistency Check (25 points)
    let consistencyScore = 0;
    const uniqueProducts = new Set(data.map(r => r.product_name));
    const uniqueDates = new Set(data.map(r => r.date));
    
    // Check for duplicate records with detailed analysis
    const recordKeys = data.map(r => `${r.date}-${r.product_name}`);
    const uniqueKeys = new Set(recordKeys);
    const duplicateCount = recordKeys.length - uniqueKeys.size;
    
    if (duplicateCount === 0) {
      consistencyScore += 25;
    } else {
      // Find which records are duplicates
      const keyCounts = new Map();
      recordKeys.forEach(key => {
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      });
      
      const duplicateKeys = Array.from(keyCounts.entries())
        .filter(([key, count]) => count > 1)
        .map(([key, count]) => ({ key, count }));
      
      issues.push(`📊 DUPLICATE ANALYSIS: ${duplicateCount} duplicate records found across ${duplicateKeys.length} unique keys`);
      duplicateKeys.forEach(({ key, count }) => {
        issues.push(`  - Key "${key}": ${count} occurrences`);
      });
    }
    
    const consistency = consistencyScore;
    
    // 4. Integrity Check (25 points)
    let integrityScore = 0;
    
    // Check foreign key relationships
    const validLocationIds = ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001'];
    const validLocationCount = data.filter(r => validLocationIds.includes(r.location_id)).length;
    
    if (validLocationCount === data.length) {
      integrityScore += 25;
    } else {
      issues.push(`Invalid location IDs: ${data.length - validLocationCount} records`);
    }
    
    const integrity = integrityScore;
    
    // 5. Business Rules Check (25 points)
    let businessRulesScore = 0;
    
    data.forEach((record, index) => {
      let recordBusinessScore = 0;
      
      // Revenue should equal quantity * price (approximately)
      const expectedRevenue = record.quantity * record.price;
      const revenueDiff = Math.abs(record.revenue - expectedRevenue);
      const revenueTolerance = expectedRevenue * 0.1; // 10% tolerance
      
      if (revenueDiff <= revenueTolerance) {
        recordBusinessScore += 1;
      } else {
        issues.push(`Record ${index + 1}: Revenue calculation mismatch (expected: ${expectedRevenue}, actual: ${record.revenue})`);
      }
      
      businessRulesScore += recordBusinessScore;
    });
    
    const businessRules = (businessRulesScore / data.length) * 25;
    
    // Calculate overall score
    const overallScore = Math.round(completeness + quality + consistency + integrity + businessRules);
    
    // Add duplicate summary to recommendations
    if (duplicateCount > 0) {
      recommendations.push(`🔍 Found ${duplicateCount} duplicate records that will be flagged for exclusion in Step 6`);
      recommendations.push(`📋 Duplicate records will be skipped during database storage to prevent data conflicts`);
    }
    
    // Generate recommendations
    if (overallScore < 80) {
      recommendations.push("Review data quality and completeness");
    }
    if (completeness < 20) {
      recommendations.push("Ensure all required fields are populated");
    }
    if (quality < 20) {
      recommendations.push("Verify numeric values and date formats");
    }
    if (consistency < 20) {
      recommendations.push("Check for duplicate records");
    }
    if (integrity < 20) {
      recommendations.push("Validate location ID references");
    }
    if (businessRules < 20) {
      recommendations.push("Verify business rule calculations");
    }
    
    return {
      completeness,
      quality,
      consistency,
      integrity,
      business_rules: businessRules,
      overall_score: overallScore,
      issues,
      recommendations
    };
  };

  const handleRowClick = (log: ValidationLog) => {
    setSelectedLog(log);
  };

  const handleDeleteLog = (logId: string) => {
    setValidationLogs(prev => prev.filter(log => log.id !== logId));
    toast.success("Failed validation removed from log");
  };

  return (
    <div className="space-y-6">
      {/* Test Data Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Test Data Validation
            <Badge variant="outline">Step 5</Badge>
          </CardTitle>
          <CardDescription>
            Validate mapped data quality, completeness, and business rules (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Button 
              onClick={() => testDataValidation.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440002",
                locationName: "Bar Bea"
              })}
              disabled={testDataValidation.isPending}
              className="w-full"
            >
              {testDataValidation.isPending ? "Testing..." : "🔍 Bar Bea"}
            </Button>

            <Button 
              onClick={() => testDataValidation.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440003",
                locationName: "L'Amour Toujours"
              })}
              disabled={testDataValidation.isPending}
              className="w-full"
            >
              {testDataValidation.isPending ? "Testing..." : "🔍 L'Amour Toujours"}
            </Button>

            <Button 
              onClick={async () => {
                console.log('🔍 CURSOR-DEV: Van Kinsbergen validation button clicked');
                try {
                  const result = await testDataValidation.mutateAsync({
                    locationId: "550e8400-e29b-41d4-a716-446655440001",
                    locationName: "Van Kinsbergen"
                  });
                  console.log('🔍 CURSOR-DEV: Van Kinsbergen validation completed:', result);
                  
                  // Manual state update to ensure UI reflects the change
                  const newLog: ValidationLog = {
                    id: Date.now().toString(),
                    location_name: 'Van Kinsbergen',
                    validation_status: result.validationScore >= 80 ? 'success' : result.validationScore >= 60 ? 'warning' : 'failed',
                    records_validated: result.recordCount || 0,
                    validation_score: result.validationScore || 0,
                    timestamp: new Date().toISOString(),
                    validation_details: result.data
                  };
                  
                  setValidationLogs(prev => {
                    const updated = [newLog, ...prev];
                    console.log('🔍 CURSOR-DEV: Manual state update for Van Kinsbergen validation:', updated);
                    return updated;
                  });
                  
                  setForceRender(prev => prev + 1);
                  console.log('🔍 CURSOR-DEV: Manual force render triggered');
                  
                  // Mark the result as manual to prevent duplicate in success handler
                  result.manualUpdate = true;
                } catch (error) {
                  console.error('🔍 CURSOR-DEV: Van Kinsbergen validation failed:', error);
                }
              }}
              disabled={testDataValidation.isPending}
              className="w-full"
            >
              {testDataValidation.isPending ? "Testing..." : "🔍 Van Kinsbergen"}
            </Button>

            <Button 
              onClick={() => {
                console.log('🔍 CURSOR-DEV: Test All validation button clicked');
                testDataValidation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440002",
                  locationName: "Bar Bea"
                });
                testDataValidation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440003",
                  locationName: "L'Amour Toujours"
                });
                testDataValidation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440001",
                  locationName: "Van Kinsbergen"
                });
              }}
              disabled={testDataValidation.isPending}
              className="w-full"
              variant="outline"
            >
              {testDataValidation.isPending ? "Testing All..." : "🔍 Test All"}
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug: Check Mapped Data</h4>
            <p className="text-sm text-blue-700 mb-2">
              If you're getting 0 records validated, check if Step 4 (Data Mapping) was completed successfully.
            </p>
            <Button 
              onClick={async () => {
                console.log('🔍 Checking all mapped data in database...');
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
                
                console.log('🔍 All mapped data found:', { data, error, count: data?.length || 0 });
                
                // Check specifically for Van Kinsbergen
                const vanKinsbergenId = '550e8400-e29b-41d4-a716-446655440001';
                const vanKinsbergenData = data?.filter(record => record.location_id === vanKinsbergenId);
                console.log('🔍 Van Kinsbergen mapped data:', { vanKinsbergenData, count: vanKinsbergenData?.length || 0 });
                
                toast.info(`Found ${data?.length || 0} total mapped data records (${vanKinsbergenData?.length || 0} for Van Kinsbergen) in database (${dbName})`);
              }}
              variant="outline"
              size="sm"
            >
              🔍 Check Mapped Data in DB
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Validation Registration Log */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Data Validation Registration Log</CardTitle>
          <CardDescription>
            Track data validation tests with quality scores and validation results (bork_sales_data table)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({validationLogs.length})
            </Button>
            <Button 
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success ({validationLogs.filter(log => log.validation_status === 'success').length})
            </Button>
            <Button 
              variant={filter === 'warning' ? 'default' : 'outline'}
              onClick={() => setFilter('warning')}
            >
              Warning ({validationLogs.filter(log => log.validation_status === 'warning').length})
            </Button>
            <Button 
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              Failed ({validationLogs.filter(log => log.validation_status === 'failed').length})
            </Button>
            <Button 
              onClick={() => {
                console.log('🔍 CURSOR-DEV: Refresh button clicked');
                console.log('🔍 CURSOR-DEV: Current validationLogs:', validationLogs);
                toast.info(`Current validation logs: ${validationLogs.length} entries`);
              }}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              🔄 Refresh
            </Button>
            {validationLogs.filter(log => log.validation_status === 'failed').length > 0 && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  setValidationLogs(prev => prev.filter(log => log.validation_status !== 'failed'));
                  toast.success("All failed validations removed");
                }}
                className="gap-1"
              >
                <span className="text-white font-bold">×</span>
                Clear All Failed
              </Button>
            )}
            {validationLogs.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setValidationLogs([]);
                  localStorage.removeItem('dataValidationLogs');
                  toast.success("All validation logs cleared");
                }}
                className="gap-1"
              >
                🗑️ Clear All Tests
              </Button>
            )}
          </div>

          {/* Validation Logs Table */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data validation tests found for the selected filter.
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Validation Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Records</TableHead>
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
                        <Badge 
                          variant={log.validation_status === 'success' ? 'default' : 
                                  log.validation_status === 'warning' ? 'secondary' : 'destructive'}
                        >
                          {log.validation_status === 'success' ? '✅ Success' :
                           log.validation_status === 'warning' ? '⚠️ Warning' : '❌ Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{log.validation_score}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                log.validation_score >= 80 ? 'bg-green-500' :
                                log.validation_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${log.validation_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{log.records_validated}</TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        {log.validation_status === 'failed' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}
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
          )}
        </CardContent>
      </Card>

      {/* Validation Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>📄 Data Validation Details - {selectedLog?.location_name}</DialogTitle>
            <DialogDescription>
              Detailed validation results and recommendations
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Validation Status:</strong> 
                  <Badge 
                    variant={selectedLog.validation_status === 'success' ? 'default' : 
                            selectedLog.validation_status === 'warning' ? 'secondary' : 'destructive'}
                    className="ml-2"
                  >
                    {selectedLog.validation_status === 'success' ? '✅ Success' :
                     selectedLog.validation_status === 'warning' ? '⚠️ Warning' : '❌ Failed'}
                  </Badge>
                </div>
                <div>
                  <strong>Validation Score:</strong> {selectedLog.validation_score}%
                </div>
                <div>
                  <strong>Records Validated:</strong> {selectedLog.records_validated}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>

              {selectedLog.validation_details && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Validation Breakdown:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Completeness: {selectedLog.validation_details.completeness?.toFixed(1) || 0}%</div>
                      <div>Quality: {selectedLog.validation_details.quality?.toFixed(1) || 0}%</div>
                      <div>Consistency: {selectedLog.validation_details.consistency?.toFixed(1) || 0}%</div>
                      <div>Integrity: {selectedLog.validation_details.integrity?.toFixed(1) || 0}%</div>
                      <div>Business Rules: {selectedLog.validation_details.businessRules?.toFixed(1) || 0}%</div>
                      <div className="font-bold">Overall: {selectedLog.validation_score}%</div>
                    </div>
                  </div>

                  {selectedLog.validation_details.issues && selectedLog.validation_details.issues.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">Issues Found:</h4>
                      <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                        {selectedLog.validation_details.issues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedLog.validation_details.recommendations && selectedLog.validation_details.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-blue-600">Recommendations:</h4>
                      <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
                        {selectedLog.validation_details.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Error:</h4>
                  <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
