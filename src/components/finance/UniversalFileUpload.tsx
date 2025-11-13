import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

// Service Layer
import { useFinanceImport } from "@/contexts/FinanceImportContext";
import { FinanceImportService } from "@/services/FinanceImportService";
import { LocationService } from "@/services/LocationService";

// V2 Parser
import { saveMappingCache, loadMappingCache, clearAllOldVersionCaches } from "@/lib/finance/universal/mappingCache";
import { type AnalysisResult, type FieldMapping, type ImportType } from "@/lib/finance/universal/types";
import { processBorkSalesV2 } from "@/lib/finance/bork/orchestratorV2";
// import { processEitjeLaborV2, processEitjeProductivityV2 } from "@/lib/finance/eitje/orchestratorV2"; // COMMENTED OUT - Use API integration
import { processPowerBIPnLV2 } from "@/lib/finance/powerbi/orchestratorV2";

interface FileInfo {
  type: ImportType;
  location?: string;
  dateRange?: string;
  recordCount?: number;
  hasMultipleLocations?: boolean;
  name: string;
  file: File;
  workbook?: XLSX.WorkBook;
  analysisResult?: AnalysisResult;
  mapping?: FieldMapping;
  detectedLocation?: DetectedLocation | null;
  locationMatchStatus?: LocationMatchStatus;
}

interface DetectedLocation {
  id: string;
  name: string;
  address?: string;
}

type LocationMatchStatus = 'matched' | 'not_found' | 'pending' | null;

export function UniversalFileUpload() {
  // Clear old v2 caches on component mount
  useState(() => {
    clearAllOldVersionCaches();
  });
  
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { importState, setImportState, saveImportSnapshot, logImportError } = useFinanceImport();

  // Load locations on mount
  useState(() => {
    LocationService.getAll()
      .then(data => setLocations(data || []))
      .catch(err => console.error('Failed to load locations:', err));
  });

  const handleClear = () => {
    setFiles([]);
    setImportState({ 
      uploadProgress: 0, 
      currentImportId: null, 
      currentImportType: null 
    });
    
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    toast({
      title: "Import cleared",
      description: "All import data and cache have been cleared.",
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, locationId: string) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, detectedLocation: locations.find(l => l.id === locationId) } : f
    ));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const filesArray = Array.from(selectedFiles);
    const processedFiles: FileInfo[] = [];

    for (const selectedFile of filesArray) {
      try {
        const { workbook, importType, analysis, extractedLocation } = 
          await FinanceImportService.analyzeFile(selectedFile);
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet);

        let detectedLocation: DetectedLocation | null = null;
        let locationMatchStatus: LocationMatchStatus = 'pending';
        let hasMultipleLocations = false;

        // Handle multi-location Eitje files
        if (importType === 'eitje_productivity' || importType === 'eitje_labor') {
          detectedLocation = { 
            id: 'multi-location', 
            name: 'All HNG Locations (per-row)'
          };
          locationMatchStatus = 'matched';
          hasMultipleLocations = true;
        } else if (extractedLocation) {
          const matched = await LocationService.matchLocationFuzzy(extractedLocation.name);
          
          if (matched) {
            detectedLocation = { 
              ...matched, 
              address: extractedLocation.address 
            };
            locationMatchStatus = 'matched';
          } else {
            locationMatchStatus = 'not_found';
          }
        } else {
          locationMatchStatus = 'not_found';
        }

        processedFiles.push({
          name: selectedFile.name,
          file: selectedFile,
          type: importType,
          recordCount: data.length,
          location: extractedLocation?.name,
          hasMultipleLocations,
          workbook,
          analysisResult: analysis,
          mapping: analysis.proposedMapping,
          detectedLocation,
          locationMatchStatus
        });

      } catch (error: any) {
        console.error(`File analysis error for ${selectedFile.name}:`, error);
        toast({
          title: `Failed to analyze ${selectedFile.name}`,
          description: error.message,
          variant: "destructive",
        });
      }
    }

    setFiles(prev => [...prev, ...processedFiles]);
    setIsAnalyzing(false);

    if (processedFiles.length > 0) {
      toast({
        title: "Files analyzed",
        description: `Successfully analyzed ${processedFiles.length} file(s)`,
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("No files selected");

      const results = [];
      let totalProcessed = 0;

      for (const fileInfo of files) {
        const finalLocationId = fileInfo.detectedLocation?.id === 'multi-location' 
          ? null 
          : fileInfo.detectedLocation?.id;
        
        if (!finalLocationId && fileInfo.detectedLocation?.id !== 'multi-location') {
          throw new Error(`Location required for ${fileInfo.name}`);
        }

        setImportState({ uploadProgress: 30 });

        // Step 1: Create import record to get proper UUID
        const { data: importRecord, error: importError } = await supabase
          .from('data_imports')
          .insert([{
            import_type: fileInfo.type,
            location_id: finalLocationId,
            file_name: fileInfo.name,
            status: 'processing',
            total_records: fileInfo.recordCount || 0
          }])
          .select('id')
          .single();

        if (importError || !importRecord) {
          throw new Error(`Failed to create import record: ${importError?.message}`);
        }

        const importId = importRecord.id;
        setImportState({ uploadProgress: 50, currentImportId: importId });

        // Step 2: Process the file with the proper UUID
        const result = await processFile(
          fileInfo.workbook!,
          fileInfo.type,
          finalLocationId,
          importId,
          fileInfo.mapping!
        );

        // Step 3: Update import record with results
        await supabase
          .from('data_imports')
          .update({
            status: 'completed',
            processed_records: result.processedCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', importId);

        totalProcessed += result.processedCount;
        results.push({ ...result, fileName: fileInfo.name, importId });

        // Save mapping cache
        if (fileInfo.analysisResult && finalLocationId && fileInfo.mapping && Object.keys(fileInfo.mapping).length > 0) {
          saveMappingCache(finalLocationId, fileInfo.type, fileInfo.analysisResult.headers, fileInfo.mapping);
        }

        saveImportSnapshot(importId, fileInfo.type, result.processedCount);
      }

      return { results, totalProcessed };
    },
    onSuccess: ({ results, totalProcessed }) => {
      toast({
        title: "Import successful",
        description: `Processed ${totalProcessed} rows across ${results.length} file(s)`,
      });
      
      setFiles([]);
      setImportState({ uploadProgress: 0, currentImportId: null, currentImportType: null });
      
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      queryClient.invalidateQueries({ queryKey: ["data-imports"] });
    },
    onError: (error: any) => {
      logImportError('bulk-import', error.message);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processFile = async (
    workbook: XLSX.WorkBook,
    type: ImportType,
    locationId: string,
    importId: string,
    mapping: FieldMapping
  ): Promise<{ processedCount: number; skippedCount?: number }> => {
    console.log(`[V2] Processing ${type}`);
    
    switch(type) {
      case 'powerbi_pnl':
        return await processPowerBIPnLV2(workbook, importId, locationId, mapping);
      case 'bork_sales':
        return await processBorkSalesV2(workbook, importId, locationId, mapping);
      case 'eitje_labor':
      case 'eitje_productivity':
        throw new Error(`${type} is no longer supported via file import. Use API sync instead from Settings > API Connections.`);
      default:
        throw new Error(`Unknown import type: ${type}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Financial Data
          </CardTitle>
          <CardDescription>
            Upload Excel files from Bork, Eitje, or PowerBI. The system will automatically detect the file type and location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Files (multiple)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFileChange}
                disabled={isAnalyzing || uploadMutation.isPending}
                className="flex-1"
              />
              {files.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClear}
                  disabled={isAnalyzing || uploadMutation.isPending}
                  title="Clear all files"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({files.length})</Label>
              {files.map((fileInfo, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <p className="font-medium text-sm">{fileInfo.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fileInfo.type.replace('_', ' ').toUpperCase()} • {fileInfo.recordCount} records
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          disabled={uploadMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {fileInfo.locationMatchStatus === 'matched' && fileInfo.detectedLocation && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            Location: <strong>{fileInfo.detectedLocation.name}</strong>
                            {fileInfo.hasMultipleLocations && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (auto-assigned per row)
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {fileInfo.locationMatchStatus === 'not_found' && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="text-sm">
                                {fileInfo.location 
                                  ? `"${fileInfo.location}" not found. Select location:` 
                                  : 'Select location:'}
                              </p>
                              <Select 
                                value={fileInfo.detectedLocation?.id || ""} 
                                onValueChange={(value) => handleLocationChange(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations?.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={
              files.length === 0 || 
              isAnalyzing || 
              uploadMutation.isPending ||
              files.some(f => !f.detectedLocation)
            }
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {files.length} file(s)...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
