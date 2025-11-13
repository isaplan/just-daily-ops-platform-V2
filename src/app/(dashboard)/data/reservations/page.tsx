/**
 * Data Reservations View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useReservationsViewModel } from "@/viewmodels/data/useReservationsViewModel";

export default function DataReservationsPage() {
  useReservationsViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Reservations Data
        </h1>
        <p className="text-muted-foreground">
          View and manage reservations data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>View and manage reservations data</CardDescription>
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
