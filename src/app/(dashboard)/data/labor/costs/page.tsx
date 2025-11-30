/**
 * Labor Cost V2 - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { LaborCostClient } from './LaborCostClient';
import { fetchLaborCosts } from '@/lib/services/workforce/labor-cost.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function LaborCostPage() {
  // Use default filters: this-year preset, all locations, page 1, first 50 items
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch initial 50 items from aggregated collections (fast, < 500ms)
  const [initialLaborCostData, locations] = await Promise.all([
    fetchLaborCosts({
      startDate,
      endDate,
      locationId: 'all',
      page: 1,
      limit: 50,
    }).catch(() => null),
    getLocations().catch(() => []),
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
