/**
 * Categories Products Aggregated Sales - Server Component
 * Fetches initial data on server for fast first paint
 */

import { CategoriesProductsClient } from './CategoriesProductsClient';
import { fetchCategoriesProductsAggregate } from '@/lib/services/sales/categories-products.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function CategoriesProductsPage() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use default filters: this-year preset, all locations
  // Calculate 'this-year' range on server (can't use client-side function)
  const now = new Date();
  const startDate = `${now.getFullYear()}-01-01`;
  const endDate = `${now.getFullYear()}-12-31`;
  
  // Fetch data in parallel
  const [initialAggregatedData, locations] = await Promise.all([
    fetchCategoriesProductsAggregate({
      startDate,
      endDate,
      locationId: 'all',
      category: 'all',
    }).catch(() => ({
      success: false,
      categories: [],
      mainCategories: [],
      totals: {
        quantity: 0,
        revenueExVat: 0,
        revenueIncVat: 0,
        transactionCount: 0,
      },
      error: 'Failed to fetch aggregated data',
    })),
    getLocations().catch(() => []),
  ]);
  
  // ✅ Pass server-fetched data to client component
  return (
    <CategoriesProductsClient
      initialData={{
        aggregatedData: initialAggregatedData.success ? initialAggregatedData : undefined,
        locations,
      }}
    />
  );
}
