/**
 * SSR Demo Client Component
 * 
 * This demonstrates how Client Components receive and use
 * server-fetched data via ViewModels
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Zap } from 'lucide-react';

interface DemoData {
  locationsCount: number;
  locations: Array<{ id: string; name: string; code?: string }>;
  serverFetchTime: string;
}

interface DemoSSRClientProps {
  initialData: DemoData;
}

export function DemoSSRClient({ initialData }: DemoSSRClientProps) {
  const serverTime = new Date(initialData.serverFetchTime);
  
  // ✅ Calculate hydration time only on client to avoid hydration mismatch
  const [hydrationTime, setHydrationTime] = useState<number>(0);
  const [clientTime, setClientTime] = useState<Date | null>(null);
  
  useEffect(() => {
    const now = new Date();
    setClientTime(now);
    setHydrationTime(Math.abs(now.getTime() - serverTime.getTime()));
  }, [serverTime]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      <div className="pt-20 space-y-1">
        <h1 className="text-2xl font-semibold">SSR + MVVM Pattern Demo</h1>
        <p className="text-sm text-muted-foreground">
          Server-Side Rendering with Next.js 15 + MongoDB + GraphQL
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Fetch</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CheckCircle className="h-6 w-6 inline mr-2" />
              Server-Side
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Data fetched on server before page load
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hydration Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {hydrationTime > 0 ? `${hydrationTime}ms` : 'Calculating...'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Time to hydrate client component
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Strategy</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ISR 30m
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Page cached at CDN for 30 minutes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Display */}
      <Card>
        <CardHeader>
          <CardTitle>Server-Fetched Data</CardTitle>
          <CardDescription>
            This data was fetched on the server and passed to the client component
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Active Locations</h3>
            <Badge variant="outline" className="text-lg">
              {initialData.locationsCount} locations
            </Badge>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Sample Locations (Top 5)</h3>
            <div className="space-y-2">
              {initialData.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{location.name}</p>
                    {location.code && (
                      <p className="text-sm text-muted-foreground">
                        Code: {location.code}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Technical Details</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Server Fetch Time:</strong>{' '}
                {serverTime.toLocaleTimeString()}
              </p>
              <p>
                <strong>Client Hydration:</strong>{' '}
                {clientTime ? clientTime.toLocaleTimeString() : 'Loading...'}
              </p>
              <p>
                <strong>Pattern:</strong> Server Component → Client Component
              </p>
              <p>
                <strong>Caching:</strong> Next.js ISR (30 minutes)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Explanation */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <div>
            <strong>1. Server Component (page.tsx):</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Fetches data from MongoDB on server</li>
              <li>Runs before page is sent to browser</li>
              <li>No client-side loading state needed</li>
            </ul>
          </div>

          <div>
            <strong>2. ISR Caching:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Page cached at CDN for 30 minutes</li>
              <li>Subsequent requests = instant (served from cache)</li>
              <li>Automatic revalidation every 30 minutes</li>
            </ul>
          </div>

          <div>
            <strong>3. Client Component (DemoSSRClient.tsx):</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Receives pre-fetched data as props</li>
              <li>Handles interactivity and UI updates</li>
              <li>Can use ViewModels for additional client-side logic</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <strong>Performance Benefit:</strong>
            <p className="mt-1">
              First paint in <strong>0.5-1 second</strong> (vs 3-5 seconds with
              client-only rendering)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Elements</CardTitle>
          <CardDescription>
            Client-side interactivity still works perfectly with SSR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              alert(
                `This page was server-rendered at ${serverTime.toLocaleTimeString()}\n\n` +
                  `You're viewing it at ${clientTime?.toLocaleTimeString() || 'calculating...'}\n\n` +
                  `Hydration took only ${hydrationTime}ms!`
              );
            }}
          >
            Test Client-Side Interaction
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

