/**
 * Dashboard View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { useDashboardViewModel } from "@/viewmodels/misc/useDashboardViewModel";

export default function DashboardPage() {
  useDashboardViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Daily Ops KPIs - Homepage
          </CardTitle>
          <CardDescription>Overview of daily operations key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This dashboard provides an overview of all daily operations KPIs.</p>
        </CardContent>
      </Card>
    </div>
  );
}


