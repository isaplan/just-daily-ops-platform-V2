/**
 * Finance Daily Ops Productivity View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useDailyOpsViewModel } from "@/viewmodels/finance/useDailyOpsViewModel";

export default function ProductivityPage() {
  const {
    selectedLocation,
    selectedDateRange,
    setSelectedLocation,
    setSelectedDateRange,
  } = useDailyOpsViewModel({ page: "productivity" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Productivity
          </h1>
          <p className="text-muted-foreground">
            Workforce productivity and efficiency metrics
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          {["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month"].map((range) => (
            <Button
              key={range}
              variant={selectedDateRange === range.toLowerCase().replace(" ", "-") ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDateRange(range.toLowerCase().replace(" ", "-"))}
            >
              {range}
            </Button>
          ))}
        </div>

        {/* Location Selector */}
        <div className="flex gap-2">
          {[
            { id: "total", name: "Total", color: "bg-blue-500" },
            { id: "kinsbergen", name: "Van Kinsbergen", color: "bg-green-500" },
            { id: "barbea", name: "Bar Bea", color: "bg-purple-500" },
            { id: "lamour", name: "L'Amour Toujours", color: "bg-orange-500" }
          ].map((location) => (
            <Button
              key={location.id}
              variant={selectedLocation === location.id ? "default" : "outline"}
              onClick={() => setSelectedLocation(location.id)}
              className="flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${location.color}`} />
              {location.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Dashboard</CardTitle>
          <CardDescription>
            Location: {selectedLocation} | Date Range: {selectedDateRange}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Productivity metrics will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


