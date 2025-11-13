/**
 * Daily Ops AI View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useAIViewModel } from "@/viewmodels/daily-ops/useAIViewModel";

export default function DailyOpsAIPage() {
  useAIViewModel(); // ViewModel ready for future use
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8" />
          Daily Ops - AI & Analytics
        </h1>
        <p className="text-muted-foreground">
          AI-powered insights and analytics for daily operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI & Analytics Dashboard</CardTitle>
          <CardDescription>AI-powered insights and recommendations</CardDescription>
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
