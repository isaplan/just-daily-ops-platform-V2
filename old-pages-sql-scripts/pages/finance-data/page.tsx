/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/data
 */

/**
 * Finance Data Overview View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Database, ArrowRight } from "lucide-react";

export default function ViewDataPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">View Data</h1>
        <p className="text-muted-foreground mt-2">
          Browse and explore all data sources in the platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Eitje Data Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Eitje Data</CardTitle>
            </div>
            <CardDescription>
              View hours, finance, workers, and locations data from Eitje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/finance/data/eitje-data">
              <Button className="w-full">
                View Eitje Data
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div>• Hours & Labor</div>
              <div>• Revenue & Finance</div>
              <div>• Workers & Teams</div>
              <div>• Locations</div>
            </div>
          </CardContent>
        </Card>

        {/* Future data sources can be added here */}
      </div>
    </div>
  );
}


