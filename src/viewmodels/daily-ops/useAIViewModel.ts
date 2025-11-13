/**
 * Daily Ops AI ViewModel Layer
 * Business logic for AI analytics page
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAIInsights } from "@/lib/services/daily-ops/ai.service";

export function useAIViewModel() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: fetchAIInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    insights: insights || [],
    isLoading,
  };
}




