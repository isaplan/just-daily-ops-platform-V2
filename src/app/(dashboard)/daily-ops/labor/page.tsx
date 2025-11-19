/**
 * Daily Ops Labor Page
 * Server Component wrapper - fetches initial data for SSR
 */

import { LaborOpsClient } from "./LaborOpsClient";
import { fetchLaborOpsData } from "@/lib/services/daily-ops/labor-ops.service";
import { startOfMonth, endOfMonth } from "date-fns";

// ISR revalidation - 30 minutes
export const revalidate = 1800;

export default async function LaborOpsPage() {
  // Calculate "this-month" date range server-side
  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  // Fetch initial data on server
  const initialData = await fetchLaborOpsData({
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  });

  // Pass server data to client component
  return <LaborOpsClient initialData={initialData} />;
}

