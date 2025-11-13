// API CLEAN SLATE - V1: Tabbed Interface for Step-by-Step Development
// Each step gets its own tab to prevent UI from breaking functionality

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleApiTest } from "./SimpleApiTest";
import { RawDataStorage } from "./RawDataStorage";
import { DataAccessTest } from "./DataAccessTest";
import { DataMapping } from "./DataMapping";
import { DataValidation } from "./DataValidation";
import { DatabaseStorage } from "./DatabaseStorage";
import { CalculationSheet } from "./CalculationSheet";
import { PaginatedDataDisplay } from "./PaginatedDataDisplay";

export function ApiCleanSlateTabs() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 Bork API Development</CardTitle>
          <CardDescription>
            Step-by-step Bork API development with tabs for each phase
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">6/8 Steps Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>✅ Steps 1-6 Complete</span>
              <span>⏳ Steps 7-8 Pending</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="step1" className="w-full">
            <div className="w-full mt-6 mb-8 bg-muted/50 rounded-lg p-2">
              <TabsList className="flex flex-wrap gap-2 p-3 w-full min-h-fit justify-start">
              <TabsTrigger value="step1" className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                1. Connection
              </TabsTrigger>
              <TabsTrigger value="step2" className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                2. Raw Storage
              </TabsTrigger>
              <TabsTrigger value="step3" className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                3. Data Access
              </TabsTrigger>
              <TabsTrigger value="step4" className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                4. Mapping
              </TabsTrigger>
              <TabsTrigger value="step5" className="flex items-center gap-2">
                <span className="text-gray-400">⏳</span>
                5. Validation
              </TabsTrigger>
              <TabsTrigger value="step6" className="flex items-center gap-2">
                <span className="text-gray-400">⏳</span>
                6. Database Storage
              </TabsTrigger>
              <TabsTrigger value="step7" className="flex items-center gap-2">
                <span className="text-gray-400">⏳</span>
                7. Sales Reconnect
              </TabsTrigger>
              <TabsTrigger value="step8" className="flex items-center gap-2">
                <span className="text-gray-400">⏳</span>
                8. Calculations
              </TabsTrigger>
              </TabsList>
            </div>

            {/* Step 1: API Connection Test */}
            <TabsContent value="step1" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 1: API Connection Test</h3>
                  <p className="text-sm text-gray-600">
                    Test API connectivity to all 3 locations. No data processing, no storage.
                  </p>
                </div>
                <SimpleApiTest />
              </div>
            </TabsContent>

            {/* Step 2: Raw Data Storage */}
            <TabsContent value="step2" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 2: Raw Data Storage</h3>
                  <p className="text-sm text-gray-600">
                    Store raw JSON data from API without any processing or transformation.
                  </p>
                </div>
                <RawDataStorage />
              </div>
            </TabsContent>

            {/* Step 3: Data Access Test */}
            <TabsContent value="step3" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 3: Data Access Test</h3>
                  <p className="text-sm text-gray-600">
                    Test reading and accessing the stored raw data from the database (bork_sales_data table).
                  </p>
                </div>
                <DataAccessTest />
              </div>
            </TabsContent>

            {/* Step 4: Data Mapping/Sanitization */}
            <TabsContent value="step4" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 4: Data Mapping & Sanitization</h3>
                  <p className="text-sm text-gray-600">
                    Map and sanitize raw data into structured format for processing (bork_sales_data table).
                  </p>
                </div>
                <DataMapping />
              </div>
            </TabsContent>

            {/* Step 5: Data Validation */}
            <TabsContent value="step5" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 5: Data Validation</h3>
                  <p className="text-sm text-gray-600">
                    Validate mapped data quality, completeness, and business rules (bork_sales_data table).
                  </p>
                </div>
                <DataValidation />
              </div>
            </TabsContent>

            {/* Step 6: Database Storage */}
            <TabsContent value="step6" className="space-y-4">
              <div className="space-y-4">
                <DatabaseStorage />
              </div>
            </TabsContent>

            {/* Step 7: UI Display */}
            <TabsContent value="step7" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 7: Smart UI Display</h3>
                  <p className="text-sm text-gray-600">
                    Display processed data with smart calculations, pagination, and performance optimization.
                  </p>
                </div>
                <PaginatedDataDisplay />
              </div>
            </TabsContent>

            {/* Step 8: Final Validation */}
            <TabsContent value="step8" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Step 8: Final Validation</h3>
                  <p className="text-sm text-gray-600">
                    Validate all calculations and ensure everything works correctly.
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">
                    🚧 Coming soon - Final validation functionality will be implemented here.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
