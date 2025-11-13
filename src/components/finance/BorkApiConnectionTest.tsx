// API CLEAN SLATE - V1: Fresh Bork API Connection Test UI
// Step 1: Simple UI to test API connectivity only

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function BorkApiConnectionTest() {
  const [testDate, setTestDate] = useState("20250918"); // Default test date
  const [connectionResult, setConnectionResult] = useState<any>(null);

  const connectionMutation = useMutation({
    mutationFn: async ({ locationId, apiKey, baseUrl, testDate }: {
      locationId: string;
      apiKey: string;
      baseUrl: string;
      testDate: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('bork-api-test', {
        body: { locationId, apiKey, baseUrl, testDate }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setConnectionResult(data);
      if (data.success) {
        toast.success("✅ API Connection Successful!");
      } else {
        toast.error("❌ API Connection Failed");
      }
    },
    onError: (error) => {
      toast.error("❌ Connection Test Error: " + error.message);
    }
  });

  const testConnection = (locationId: string, apiKey: string, baseUrl: string) => {
    connectionMutation.mutate({
      locationId,
      apiKey,
      baseUrl,
      testDate
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔌 Bork API Connection Test</CardTitle>
          <CardDescription>
            Step 1: Test Bork API connectivity only. No data processing, no storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testDate">Test Date (YYYYMMDD)</Label>
              <Input
                id="testDate"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                placeholder="20250918"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Bar Bea</h3>
              <p className="text-sm text-gray-600 mb-2">
                API Key: 1f518c6dce0a466d8d0f7c95b0717de4<br/>
                Base URL: https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com
              </p>
              <Button 
                onClick={() => testConnection(
                  "550e8400-e29b-41d4-a716-446655440002",
                  "1f518c6dce0a466d8d0f7c95b0717de4",
                  "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com"
                )}
                disabled={connectionMutation.isPending}
                className="w-full"
              >
                {connectionMutation.isPending ? "Testing..." : "🧪 Test Bar Bea Connection"}
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">L'Amour Toujours</h3>
              <p className="text-sm text-gray-600 mb-2">
                API Key: 1f518c6dce0a466d8d0f7c95b0717de4<br/>
                Base URL: https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com
              </p>
              <Button 
                onClick={() => testConnection(
                  "550e8400-e29b-41d4-a716-446655440003",
                  "1f518c6dce0a466d8d0f7c95b0717de4",
                  "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com"
                )}
                disabled={connectionMutation.isPending}
                className="w-full"
              >
                {connectionMutation.isPending ? "Testing..." : "🧪 Test L'Amour Connection"}
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Van Kinsbergen</h3>
              <p className="text-sm text-gray-600 mb-2">
                API Key: 1f518c6dce0a466d8d0f7c95b0717de4<br/>
                Base URL: https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com
              </p>
              <Button 
                onClick={() => testConnection(
                  "550e8400-e29b-41d4-a716-446655440001",
                  "1f518c6dce0a466d8d0f7c95b0717de4",
                  "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com"
                )}
                disabled={connectionMutation.isPending}
                className="w-full"
              >
                {connectionMutation.isPending ? "Testing..." : "🧪 Test Kinsbergen Connection"}
              </Button>
            </div>
          </div>

          {connectionResult && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2">Connection Test Result:</h3>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify(connectionResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
