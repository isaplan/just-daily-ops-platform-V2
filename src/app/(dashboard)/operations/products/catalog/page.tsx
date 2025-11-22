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
  // Use this week (Monday to Sunday) as default
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startDate = startOfWeek.toISOString().split('T')[0];
  const endDate = endOfWeek.toISOString().split('T')[0];
  
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
    getLocations().catch(() => []),
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
