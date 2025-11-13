"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, X } from "lucide-react";
import { createClient } from "@/integrations/supabase/client";
import { importPowerBIData } from "@/lib/finance/simple-import";

interface FileInfo {
  name: string;
  file: File;
  type: string;
  recordCount: number;
  location?: string;
  detectedLocation?: {
    id: string;
    name: string;
  } | null;
  locationMatchStatus?: 'matched' | 'not_found' | 'pending' | null;
}

export default function PowerBIImport() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const filesArray = Array.from(selectedFiles);
    const processedFiles: FileInfo[] = [];

    for (const selectedFile of filesArray) {
      try {
        // Parse Excel file
        const workbook = XLSX.read(await selectedFile.arrayBuffer());
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet);
        
        // Detect location from filename (simple approach like just-stock-it)
        let detectedLocation = null;
        let locationMatchStatus: 'matched' | 'not_found' | 'pending' | null = 'pending';
        
        const fileName = selectedFile.name.toLowerCase();
        if (fileName.includes('van kinsbergen') || fileName.includes('kinsbergen')) {
          detectedLocation = { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Van Kinsbergen' };
          locationMatchStatus = 'matched';
        } else if (fileName.includes('bar bea') || fileName.includes('bea')) {
          detectedLocation = { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bar BEA' };
          locationMatchStatus = 'matched';
        } else if (fileName.includes('amour') || fileName.includes('toujours')) {
          detectedLocation = { id: '550e8400-e29b-41d4-a716-446655440003', name: 'L\'Amour Toujours' };
          locationMatchStatus = 'matched';
        } else {
          locationMatchStatus = 'not_found';
        }
        
        processedFiles.push({
          name: selectedFile.name,
          file: selectedFile,
          type: 'powerbi_pnl',
          recordCount: data.length,
          detectedLocation,
          locationMatchStatus
        });
      } catch (error: any) {
        console.error(`File analysis error for ${selectedFile.name}:`, error);
        toast.error(`Failed to analyze ${selectedFile.name}`);
      }
    }

    setFiles(prev => [...prev, ...processedFiles]);
    setIsAnalyzing(false);

    if (processedFiles.length > 0) {
      toast.success(`Successfully analyzed ${processedFiles.length} file(s)`);
    }
  };

  const handleClear = () => {
    setFiles([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast.success("Import cleared");
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    // Check if all files have detected locations
    const filesWithoutLocation = files.filter(f => !f.detectedLocation);
    if (filesWithoutLocation.length > 0) {
      toast.error(`Files without detected location: ${filesWithoutLocation.map(f => f.name).join(', ')}`);
      return;
    }

    setIsUploading(true);
    let totalRecords = 0;

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client not available");

      for (const fileInfo of files) {
        console.log(`Processing file: ${fileInfo.name} for location: ${fileInfo.detectedLocation?.name}`);
        
        // Use the proper import function that deletes existing data first
        const importId = `powerbi-import-${Date.now()}`;
        const result = await importPowerBIData(
          fileInfo.file,
          fileInfo.detectedLocation!.id,
          importId
        );

        if (!result.success) {
          throw new Error(`Import failed for ${fileInfo.name}: ${result.message}`);
        }

        totalRecords += result.processedCount;
        console.log(`Uploaded ${result.processedCount} records from ${fileInfo.name}`);
      }

      toast.success(`Successfully uploaded ${totalRecords} records from ${files.length} file(s)`);
      
      // Trigger aggregation for all affected location/year/month combinations
      console.log('Triggering aggregation for imported data...');
      const affectedPeriods = new Set<string>();
      
      for (const fileInfo of files) {
        const locationId = fileInfo.detectedLocation!.id;
        const year = 2025; // Default year from upload
        const month = 9;   // Default month from upload
        affectedPeriods.add(`${locationId}-${year}-${month}`);
      }
      
      // Run aggregation for each affected period
      for (const period of affectedPeriods) {
        const [locationId, year, month] = period.split('-');
        try {
          const response = await fetch('/api/finance/pnl-aggregate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              locationId,
              year: parseInt(year),
              month: parseInt(month)
            })
          });
          
          if (response.ok) {
            console.log(`Aggregation completed for location ${locationId}, year ${year}, month ${month}`);
          } else {
            console.error(`Aggregation failed for location ${locationId}, year ${year}, month ${month}`);
          }
        } catch (error) {
          console.error(`Error triggering aggregation for ${period}:`, error);
        }
      }
      
      toast.success(`Data uploaded and aggregated successfully!`);
      
      // Clear files after successful upload
      handleClear();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            PowerBI P&L Data Import
          </CardTitle>
          <CardDescription>
            Upload Excel files from PowerBI. The system will automatically detect the file type and location.
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
                disabled={isAnalyzing}
                className="flex-1"
              />
              {files.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClear}
                  disabled={isAnalyzing}
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
                          {fileInfo.detectedLocation && (
                            <p className="text-xs text-green-600 font-medium">
                              ✓ Detected location: {fileInfo.detectedLocation.name}
                            </p>
                          )}
                          {fileInfo.locationMatchStatus === 'not_found' && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ Location not detected from filename
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Process Button */}
          {files.length > 0 && (
            <div className="flex justify-center">
              <Button 
                onClick={handleUpload}
                disabled={isUploading || files.some(f => !f.detectedLocation)}
                className="w-full max-w-md"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process & Upload to Database
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
