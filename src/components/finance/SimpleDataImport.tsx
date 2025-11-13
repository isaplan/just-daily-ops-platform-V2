'use client';

import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { importPowerBIData, importBorkSalesData, type SimpleImportResult } from '@/lib/finance/simple-import';
import * as XLSX from 'xlsx';

// Location detection function
async function detectLocationFromFile(
  file: File, 
  _importType: 'powerbi_pnl' | 'bork_sales'
): Promise<{ id: string; name: string } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
    
    // Look for location indicators in the first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i] || [];
      const rowText = row.join(' ').toLowerCase();
      
      // Look for common location indicators
      if (rowText.includes('locatie') || rowText.includes('vestiging') || rowText.includes('filiaal')) {
        // Try to extract location name from the row
        for (const cell of row) {
          if (cell && typeof cell === 'string' && cell.trim().length > 2) {
            const locationName = cell.trim();
            // Try to find matching location in database
            const { data: locations } = await supabase
              .from('locations')
              .select('id, name')
              .ilike('name', `%${locationName}%`);
            
            if (locations && locations.length > 0) {
              return locations[0];
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log('Location detection error:', error);
    return null;
  }
}

interface ImportState {
  file: File | null;
  locationId: string;
  importType: 'powerbi_pnl' | 'bork_sales';
  isProcessing: boolean;
  progress: number;
  result: SimpleImportResult | null;
  detectedLocation: { id: string; name: string } | null;
  showLocationSelect: boolean;
}

export function SimpleDataImport() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ImportState>({
    file: null,
    locationId: '',
    importType: 'powerbi_pnl',
    isProcessing: false,
    progress: 0,
    result: null,
    detectedLocation: null,
    showLocationSelect: false
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setState(prev => ({ ...prev, file, result: null, detectedLocation: null, showLocationSelect: false }));
      
      // Try to detect location from file
      try {
        const detectedLocation = await detectLocationFromFile(file, state.importType);
        if (detectedLocation) {
          setState(prev => ({ 
            ...prev, 
            detectedLocation,
            locationId: detectedLocation.id,
            showLocationSelect: false
          }));
        } else {
          setState(prev => ({ 
            ...prev, 
            showLocationSelect: true,
            locationId: ''
          }));
        }
      } catch {
        console.log('Location detection failed, showing manual selection');
        setState(prev => ({ 
          ...prev, 
          showLocationSelect: true,
          locationId: ''
        }));
      }
    }
  };

  const handleImport = async () => {
    if (!state.file || !state.locationId) {
      toast.error('Please select a file and location');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, progress: 0 }));

    try {
      console.log('Starting import process...');
      
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('data_imports')
        .insert([{
          import_type: state.importType,
          location_id: state.locationId,
          file_name: state.file.name,
          status: 'processing',
          total_records: 0
        }])
        .select('id')
        .single();

      if (importError || !importRecord) {
        throw new Error(`Failed to create import record: ${importError?.message}`);
      }

      console.log('Import record created:', importRecord.id);
      setState(prev => ({ ...prev, progress: 20 }));

      // Process the file
      let result: SimpleImportResult;
      console.log('Processing file with type:', state.importType);
      
      if (state.importType === 'powerbi_pnl') {
        result = await importPowerBIData(state.file, state.locationId, importRecord.id);
      } else {
        result = await importBorkSalesData(state.file, state.locationId, importRecord.id);
      }

      console.log('Import result:', result);
      setState(prev => ({ ...prev, progress: 80 }));

      // Update import record
      const { error: updateError } = await supabase
        .from('data_imports')
        .update({
          status: result.success ? 'completed' : 'failed',
          processed_records: result.processedCount,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', importRecord.id);

      if (updateError) {
        console.error('Failed to update import record:', updateError);
      }

      setState(prev => ({ 
        ...prev, 
        progress: 100, 
        result,
        isProcessing: false 
      }));

      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['data-imports'] });
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Import error:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        result: {
          success: false,
          processedCount: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          message: 'Import failed'
        }
      }));
      toast.error('Import failed');
    }
  };

  const resetForm = () => {
    setState({
      file: null,
      locationId: '',
      importType: 'powerbi_pnl',
      isProcessing: false,
      progress: 0,
      result: null,
      detectedLocation: null,
      showLocationSelect: false
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Simple Data Import</h2>
        <p className="text-gray-600">Straightforward data import without complexity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Financial Data</CardTitle>
          <CardDescription>
            Upload PowerBI P&L or Bork Sales data files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="import-type">Import Type</Label>
            <Select 
              value={state.importType} 
              onValueChange={(value: 'powerbi_pnl' | 'bork_sales') => 
                setState(prev => ({ ...prev, importType: value, result: null }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="powerbi_pnl">PowerBI P&L Data</SelectItem>
                <SelectItem value="bork_sales">Bork Sales Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Selection - Only show if not auto-detected */}
          {state.showLocationSelect && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={state.locationId} 
                onValueChange={(value) => 
                  setState(prev => ({ ...prev, locationId: value, result: null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show detected location */}
          {state.detectedLocation && (
            <div className="p-3 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Auto-detected location: {state.detectedLocation.name}
                </span>
              </div>
            </div>
          )}

          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={state.isProcessing}
            />
            <p className="text-sm text-gray-500">
              {state.importType === 'powerbi_pnl' 
                ? 'Expected columns: Jaar, Maand, GL Account, Category, Subcategory, Bedrag'
                : 'Expected columns: Datum, Product, Category, Quantity, Price, Revenue'
              }
            </p>
          </div>

          {/* File Preview */}
          {state.file && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{state.file.name}</span>
                <Badge variant="outline">
                  {(state.file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            </div>
          )}

          {/* Progress */}
          {state.isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
              <Progress value={state.progress} className="w-full" />
            </div>
          )}

          {/* Result */}
          {state.result && (
            <Alert className={state.result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center space-x-2">
                {state.result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="font-medium">{state.result.message}</div>
                  {state.result.processedCount > 0 && (
                    <div className="text-sm text-gray-600">
                      Processed {state.result.processedCount} records
                    </div>
                  )}
                  {state.result.errors.length > 0 && (
                    <div className="text-sm text-red-600 mt-2">
                      <div className="font-medium">Errors:</div>
                      <ul className="list-disc list-inside">
                        {state.result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <Button 
              onClick={handleImport}
              disabled={!state.file || !state.locationId || state.isProcessing}
              className="flex items-center space-x-2"
            >
              {state.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{state.isProcessing ? 'Processing...' : 'Import Data'}</span>
            </Button>
            
            {state.result && (
              <Button variant="outline" onClick={resetForm}>
                Import Another File
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
