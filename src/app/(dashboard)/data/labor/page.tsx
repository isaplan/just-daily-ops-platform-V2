/**
 * Data Labor View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function DataLaborPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Data - Labor - Eitje Dashboard
          </CardTitle>
          <CardDescription>Eitje labor data dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This dashboard provides an overview of all Eitje labor data.</p>
        </CardContent>
      </Card>
    </div>
  );
}


