// API CLEAN SLATE - V2: Simple API Test using new simple test function
// This version uses the bork-api-simple-test function to debug the issues

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SimpleApiTestV2() {
  const [testResults, setTestResults] = useState<any>({});

  const testMutation = useMutation({
    mutationFn: async ({ locationId, apiKey, baseUrl, locationName }: {
      locationId: string;
      apiKey: string;
      baseUrl: string;
      locationName: string;
    }) => {
      console.log(`🧪 Testing API connection for ${locationName}...`);
      
      const { data, error } = await supabase.functions.invoke('bork-api-simple-test', {
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
          <CardTitle>🔌 Simple API Test V2</CardTitle>
          <CardDescription>
            Test API connection using new simple test function (bork-api-simple-test)
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
                setTestResults({});
                toast.info("🧹 Cleared test results");
              }}
              className="w-full"
            >
              🧹 Clear Results
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Test Results:</h3>
              <div className="space-y-4">
                {Object.entries(testResults).map(([locationName, result]) => (
                  <Card key={locationName}>
                    <CardHeader>
                      <CardTitle className="text-sm">{locationName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
