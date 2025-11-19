/**
 * Products Management - Server Component
 * Simplified product management with course types, workload, and MEP settings
 */

import { ProductsClient } from './ProductsClient';
import { fetchCategoriesProductsAggregate } from '@/lib/services/sales/categories-products.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function ProductsPage() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use current year as default
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
        daily: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        weekly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        monthly: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
        total: { quantity: 0, revenueExVat: 0, revenueIncVat: 0, transactionCount: 0 },
      },
      error: 'Failed to fetch aggregated data',
    })),
    getLocations().catch(() => []),
  ]);
  
  // ✅ Pass server-fetched data to client component
  return (
    <ProductsClient
      initialData={{
        aggregatedData: initialAggregatedData.success ? initialAggregatedData : undefined,
        locations,
      }}
    />
  );
}

