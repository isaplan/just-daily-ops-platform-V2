/**
 * Operations Suppliers View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { useSuppliersViewModel } from "@/viewmodels/operations/useSuppliersViewModel";

export default function OperationsSuppliersPage() {
  useSuppliersViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8" />
          Suppliers
        </h1>
        <p className="text-muted-foreground">
          Manage suppliers and vendor relationships
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers Management</CardTitle>
          <CardDescription>View and manage all suppliers</CardDescription>
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
