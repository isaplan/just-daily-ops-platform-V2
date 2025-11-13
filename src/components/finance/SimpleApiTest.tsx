// API CLEAN SLATE - V1: Simple API Test using existing function
// Step 1: Test API connectivity using bork-api-test function

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SimpleApiTest() {
  const [testResults, setTestResults] = useState<any>({});

  const testMutation = useMutation({
    mutationFn: async ({ locationId, apiKey, baseUrl, locationName }: {
      locationId: string;
      apiKey: string;
      baseUrl: string;
      locationName: string;
    }) => {
      console.log(`🧪 Testing API connection for ${locationName}...`);
      
      const { data, error } = await supabase.functions.invoke('bork-api-test', {
        body: {
          locationId,
          apiKey,
          baseUrl,
          testDate: "20250918"
        }
      });

      if (error) throw error;
      return { ...data, locationName };
    },
    onSuccess: (data) => {
      console.log('✅ API Test Success:', data);
      setTestResults(prev => ({
        ...prev,
        [data.locationName]: data
      }));
      toast.success(`✅ ${data.locationName} API Connection Successful!`);
    },
    onError: (error) => {
      console.error('❌ API Test Error:', error);
      toast.error("❌ API Connection Failed: " + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔌 Simple API Test</CardTitle>
          <CardDescription>
            Test API connection using existing bork-api-test function
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Button
              onClick={() => testMutation.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440002",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com",
                locationName: "Bar Bea"
              })}
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? "Testing..." : "🧪 Bar Bea"}
            </Button>

            <Button
              onClick={() => testMutation.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440003",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com",
                locationName: "L'Amour Toujours"
              })}
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? "Testing..." : "🧪 L'Amour Toujours"}
            </Button>

            <Button
              onClick={() => testMutation.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440001",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com",
                locationName: "Van Kinsbergen"
              })}
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? "Testing..." : "🧪 Van Kinsbergen"}
            </Button>

            <Button
              onClick={() => {
                testMutation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440002",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com",
                  locationName: "Bar Bea"
                });
                testMutation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440003",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com",
                  locationName: "L'Amour Toujours"
                });
                testMutation.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440001",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com",
                  locationName: "Van Kinsbergen"
                });
              }}
              disabled={testMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {testMutation.isPending ? "Testing All..." : "🧪 Test All"}
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="font-semibold">Test Results:</h3>
              {Object.entries(testResults).map(([locationName, result]) => (
                <div key={locationName} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold mb-2">{locationName}:</h4>
                  <div className="text-sm mb-2">
                    <strong>Status:</strong> {(result as any).success ? '✅ Success' : '❌ Failed'}<br/>
                    <strong>Records:</strong> {(result as any).recordCount}<br/>
                    <strong>Status Code:</strong> {(result as any).status}
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
