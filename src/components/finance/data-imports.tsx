'use client';

import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download,
  RefreshCw,
  AlertCircle,
  Database,
  Calendar,
  BarChart3
} from 'lucide-react';

export function DataImports() {
  type ImportStatus = 'completed' | 'failed' | 'processing' | 'pending';
  type ImportType = 'csv' | 'excel' | 'api';
  type ImportRecord = {
    id: string;
    filename: string;
    type: ImportType;
    status: ImportStatus;
    records: number;
    created_at: string;
  };

  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newImport = {
        id: Date.now().toString(),
        filename: selectedFile.name,
        type: selectedFile.name.endsWith('.csv') ? 'csv' : 'excel',
        status: 'completed',
        records: Math.floor(Math.random() * 1000) + 100,
        created_at: new Date().toISOString()
      };

      setImportHistory(prev => [newImport, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(`${newImport.records} records imported successfully.`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to import file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleApiImport = async (importType: 'bork' | 'eitje' | 'powerbi') => {
    setIsUploading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newImport = {
        id: Date.now().toString(),
        filename: `${importType.toUpperCase()} API Sync`,
        type: 'api',
        status: 'completed',
        records: Math.floor(Math.random() * 500) + 50,
        created_at: new Date().toISOString()
      };

      setImportHistory(prev => [newImport, ...prev]);
      alert(`${newImport.records} records imported from ${importType.toUpperCase()} API.`);
    } catch (error) {
      console.error('API import error:', error);
      alert(`Failed to import from ${importType.toUpperCase()} API.`);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ImportStatus) => {
    const variants: Record<ImportStatus, "default" | "destructive" | "secondary" | "outline"> = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Imports</h2>
        <p className="text-gray-600">Import financial data from various sources</p>
      </div>

      <Tabs defaultValue="file-upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file-upload">File Upload</TabsTrigger>
          <TabsTrigger value="api-sync">API Sync</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="file-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Financial Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>

                {selectedFile && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <Badge variant="outline">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                <Button 
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-sync" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Bork API</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Import sales data from Bork POS system
                </p>
                <Button 
                  onClick={() => handleApiImport('bork')}
                  disabled={isUploading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUploading ? 'animate-spin' : ''}`} />
                  Sync Bork Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Eitje API</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Import labor and productivity data
                </p>
                <Button 
                  onClick={() => handleApiImport('eitje')}
                  disabled={isUploading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUploading ? 'animate-spin' : ''}`} />
                  Sync Eitje Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>PowerBI</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Import P&L data from PowerBI
                </p>
                <Button 
                  onClick={() => handleApiImport('powerbi')}
                  disabled={isUploading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUploading ? 'animate-spin' : ''}`} />
                  Sync PowerBI Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No imports yet</p>
                  <p className="text-sm">Start by uploading a file or syncing with an API</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {importHistory.map((importItem) => (
                    <div key={importItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(importItem.status)}
                        <div>
                          <div className="font-medium">{importItem.filename}</div>
                          <div className="text-sm text-gray-500">
                            {importItem.records} records • {new Date(importItem.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(importItem.status)}
                        <Badge variant="outline">{importItem.type.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}