/**
 * Data Inventory Orders View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryViewModel } from "@/viewmodels/data/useInventoryViewModel";

export default function DataInventoryOrdersPage() {
  useInventoryViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data - Inventory - Orders</CardTitle>
          <CardDescription>Inventory orders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}


