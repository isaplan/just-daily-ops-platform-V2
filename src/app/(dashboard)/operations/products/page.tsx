/**
 * Operations Products View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";
import { useProductsViewModel } from "@/viewmodels/operations/useProductsViewModel";

export default function OperationsProductsPage() {
  useProductsViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="h-8 w-8" />
          Products
        </h1>
        <p className="text-muted-foreground">
          Manage products and inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products Management</CardTitle>
          <CardDescription>View and manage all products</CardDescription>
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
