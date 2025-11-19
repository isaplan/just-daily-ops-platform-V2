/**
 * Daily Ops Keuken Analyses Page
 * Server Component wrapper - fetches initial data for SSR
 */

import { KeukenAnalysesClient } from "./KeukenAnalysesClient";
import { fetchKeukenAnalysesData } from "@/lib/services/daily-ops/keuken-analyses.service";
import { startOfMonth, endOfMonth } from "date-fns";

// ISR revalidation - 30 minutes
export const revalidate = 1800;

export default async function KeukenAnalysesPage() {
  // Calculate "this-month" date range server-side
  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  console.log('[Keuken Page] Server-side date calculation:', {
    now: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  });

  // Fetch initial data on server
  const initialData = await fetchKeukenAnalysesData({
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  });

  // Pass server data to client component
  return <KeukenAnalysesClient initialData={initialData} />;
}

