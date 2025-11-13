/**
 * Daily Ops Inventory View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useInventoryViewModel } from "@/viewmodels/daily-ops/useInventoryViewModel";

export default function DailyOpsInventoryPage() {
  useInventoryViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Daily Ops - Inventory
        </h1>
        <p className="text-muted-foreground">
          Inventory management and analytics for daily operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Dashboard</CardTitle>
          <CardDescription>Inventory metrics and management</CardDescription>
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
