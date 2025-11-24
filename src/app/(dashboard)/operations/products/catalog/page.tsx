/**
 * Product Catalog - Server Component
 * Full-featured product management with course types, workload, and MEP settings
 * 
 * ✅ OPTIMIZED: Fetches only category metadata (names + counts) for fast first paint
 * Products are lazy-loaded when categories are expanded
 */

import { ProductsClient } from './ProductsClient';
import { fetchCategoriesMetadata } from '@/lib/services/sales/categories-products.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function ProductCatalogPage() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use current month as default (matches client-side default)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Last day of current month
  endOfMonth.setHours(23, 59, 59, 999);

  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];
  
  // ✅ Fetch only category metadata (lightweight - ~5-10KB vs 500KB+)
  // Products will be lazy-loaded when categories are expanded
  const [categoriesMetadata, locations] = await Promise.all([
    fetchCategoriesMetadata({
      startDate,
      endDate,
      locationId: 'all',
      category: 'all',
    }).catch(() => ({
      success: false,
      categories: [],
      totals: {
        quantity: 0,
        revenueExVat: 0,
        revenueIncVat: 0,
        transactionCount: 0,
      },
      error: 'Failed to fetch categories metadata',
    })),
    getLocations().catch((error) => {
      console.error('[ProductCatalogPage] Error fetching locations:', error);
      return [];
    }),
  ]);
  
  // ✅ Pass lightweight metadata to client component
  // Products will be loaded on-demand when categories are expanded
  return (
    <ProductsClient
      initialData={{
        categoriesMetadata: categoriesMetadata.success ? categoriesMetadata : undefined,
        locations,
        dateRange: { startDate, endDate },
      }}
    />
  );
}
