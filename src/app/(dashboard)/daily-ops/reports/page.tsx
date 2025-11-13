/**
 * Daily Ops Reports View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useReportsViewModel } from "@/viewmodels/daily-ops/useReportsViewModel";

export default function DailyOpsReportsPage() {
  useReportsViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Daily Ops - Reports
        </h1>
        <p className="text-muted-foreground">
          Reports and analytics for daily operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard</CardTitle>
          <CardDescription>Generate and view operational reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Content will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
