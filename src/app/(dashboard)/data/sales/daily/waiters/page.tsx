/**
 * Waiter Performance - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { WaiterPerformanceClient } from './WaiterPerformanceClient';
import { getWaiterPerformance } from '@/lib/services/graphql/queries';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function WaiterPerformancePage() {
  // Use default filters: this-year preset, all locations
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch initial data from aggregated collections (fast, < 500ms)
  const [initialWaiterData, locations] = await Promise.all([
    getWaiterPerformance(startDate, endDate, {}).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <WaiterPerformanceClient
      initialData={{
        waiterData: initialWaiterData || undefined,
        locations: locations || [],
      }}
    />
  );
}
