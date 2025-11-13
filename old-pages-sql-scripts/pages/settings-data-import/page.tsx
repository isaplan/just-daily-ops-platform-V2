/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/settings/data-import
 */

/**
 * Settings Data Import View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UniversalFileUpload } from "@/components/finance/UniversalFileUpload";
import { ImportHistory } from "@/components/finance/ImportHistory";
import { FinanceImportProvider } from "@/contexts/FinanceImportContext";
import { DollarSign, Package, FileText, History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDataImportViewModel } from "@/viewmodels/settings/useDataImportViewModel";

export default function FinanceImports() {
  useDataImportViewModel(); // ViewModel ready for future use
  const [activeTab, setActiveTab] = useState("finance");

  const handleDownloadExample = () => {
    // Link to example file in public folder
    window.open("/example-products.xlsx", "_blank");
  };

  return (
    <FinanceImportProvider>
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Imports</h1>
        <p className="text-muted-foreground">
          Upload financial data, product catalogs, and invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${
            activeTab === 'finance' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setActiveTab("finance")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Finance
              </CardTitle>
            </div>
            <CardDescription>
              Import PowerBI P&L reports and financial data
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${
            activeTab === 'products' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setActiveTab("products")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products Import
              </CardTitle>
            </div>
            <CardDescription>
              Upload supplier product catalogs and pricing
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${
            activeTab === 'invoices' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setActiveTab("invoices")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices
              </CardTitle>
            </div>
            <CardDescription>
              Import supplier invoices for cost tracking
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer hover:border-primary transition-colors ${
            activeTab === 'history' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setActiveTab("history")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Import History
              </CardTitle>
            </div>
            <CardDescription>
              View import history and reprocess previous uploads
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PowerBI Financial Data</CardTitle>
              <CardDescription>
                Import all your PowerBI P&L files here. Supported formats: Excel (.xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UniversalFileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Supplier Product Catalog</CardTitle>
                  <CardDescription>
                    Upload product documents from suppliers who don&apos;t have an active API connection
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadExample}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Example
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Package className="h-4 w-4" />
                <AlertDescription>
                  Upload Excel files containing product codes, names, prices, and units. 
                  Download the example file to see the required structure.
                </AlertDescription>
              </Alert>
              <UniversalFileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Import</CardTitle>
              <CardDescription>
                Upload supplier invoices for automated cost tracking and reconciliation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Upload PDF or Excel invoices. The system will extract product information and costs automatically.
                </AlertDescription>
              </Alert>
              <UniversalFileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>
      </Tabs>
      </div>
    </FinanceImportProvider>
  );
}

