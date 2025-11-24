/**
 * Labor Cost V2 - Server Component
 * Fetches initial data on server for fast first paint
 */

import { LaborCostClient } from './LaborCostClient';
import { fetchLaborCosts } from '@/lib/services/workforce/labor-cost.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function LaborCostPage() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use default filters: this-year preset, all locations, page 1
  // Calculate "this-year" date range server-side (can't use client function)
  const now = new Date();
  const currentYear = now.getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch initial data in parallel
  const [initialLaborCostData, locations] = await Promise.all([
    fetchLaborCosts({
      startDate,
      endDate,
      page: 1,
      limit: 50,
    }).catch(() => null), // Gracefully handle errors
    getLocations().catch(() => []), // Gracefully handle errors
  ]);

  return (
    <LaborCostClient 
      initialData={{
        laborCostData: initialLaborCostData || undefined,
        locations: locations || [],
      }}
    />
  );
}
