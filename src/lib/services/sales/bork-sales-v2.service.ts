/**
 * Bork Sales V2 Service Layer
 * Client-side data fetching functions - Updated for GraphQL
 */

import { BorkSalesQueryParams, BorkSalesResponse, BorkSalesRecord } from '@/models/sales/bork-sales-v2.model';
import { getDailySales, SalesFilters } from '@/lib/services/graphql/queries';

/**
 * Fetch Bork sales data from GraphQL API
 */
export async function fetchBorkSales(
  params: BorkSalesQueryParams
): Promise<BorkSalesResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: SalesFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.category && params.category !== 'all') {
    filters.category = params.category;
  }
  if (params.productName) {
    filters.productName = params.productName;
  }

  const result = await getDailySales(
    params.startDate,
    params.endDate,
    params.page,
    params.limit,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch sales data');
  }

  return {
    success: result.success,
    records: result.records as BorkSalesRecord[],
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}


