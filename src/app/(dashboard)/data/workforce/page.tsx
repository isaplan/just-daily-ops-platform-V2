/**
 * Workforce V2 Overview View Layer
 * Pure presentational component - overview page for Workforce V2 section
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock, UserCheck, ArrowRight } from "lucide-react";

export default function WorkforceOverviewPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workforce V2</h1>
        <p className="text-muted-foreground mt-2">
          View and manage workforce data including hours and workers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Hours Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Hours</CardTitle>
            </div>
            <CardDescription>
              View processed and aggregated hours data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/data/workforce/hours">
              <Button className="w-full">
                View Hours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div>• Processed Hours</div>
              <div>• Aggregated Hours</div>
              <div>• Team & Shift Filters</div>
            </div>
          </CardContent>
        </Card>

        {/* Workers Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle>Workers</CardTitle>
            </div>
            <CardDescription>
              Manage worker profiles and contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/data/workforce/workers">
              <Button className="w-full">
                View Workers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div>• Worker Profiles</div>
              <div>• Contract Management</div>
              <div>• Wage Configuration</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



