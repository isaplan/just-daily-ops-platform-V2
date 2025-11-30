/**
 * Categories Products Aggregated Sales - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { CategoriesProductsClient } from './CategoriesProductsClient';
import { fetchCategoriesProductsAggregate } from '@/lib/services/sales/categories-products.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function CategoriesProductsPage() {
  // Use default filters: this-year preset, all locations
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch initial data from aggregated collections (fast, < 500ms)
  const [initialAggregatedData, locations] = await Promise.all([
    fetchCategoriesProductsAggregate({
      startDate,
      endDate,
      locationId: 'all',
      category: 'all',
    }).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <CategoriesProductsClient
      initialData={{
        aggregatedData: initialAggregatedData || undefined,
        locations: locations || [],
      }}
    />
  );
}
