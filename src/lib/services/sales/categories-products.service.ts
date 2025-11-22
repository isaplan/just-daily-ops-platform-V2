/**
 * Categories Products Aggregated Sales Service Layer
 * Client-side data fetching functions - Updated for GraphQL
 */

import { 
  CategoriesProductsFilters, 
  CategoriesProductsResponse 
} from '@/models/sales/categories-products.model';
import { 
  getCategoriesProductsAggregate, 
  getCategoriesMetadata,
  getCategoryProducts,
  CategoriesProductsFilters as GraphQLFilters,
  CategoriesMetadataResponse,
  CategoryAggregate
} from '@/lib/services/graphql/queries';

/**
 * Fetch aggregated categories/products data from GraphQL API
 */
export async function fetchCategoriesProductsAggregate(
  params: CategoriesProductsFilters
): Promise<CategoriesProductsResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: GraphQLFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.category && params.category !== 'all') {
    filters.category = params.category;
  }
  if (params.productName) {
    filters.productName = params.productName;
  }

  const result = await getCategoriesProductsAggregate(
    params.startDate,
    params.endDate,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch categories/products aggregate data');
  }

  return result;
}

/**
 * Fetch categories metadata only (lightweight - for fast first paint)
 */
export async function fetchCategoriesMetadata(
  params: CategoriesProductsFilters
): Promise<CategoriesMetadataResponse> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: GraphQLFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.category && params.category !== 'all') {
    filters.category = params.category;
  }
  if (params.productName) {
    filters.productName = params.productName;
  }

  const result = await getCategoriesMetadata(
    params.startDate,
    params.endDate,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch categories metadata');
  }

  return result;
}

/**
 * Fetch products for a specific category (lazy loading)
 */
export async function fetchCategoryProducts(
  categoryName: string,
  params: CategoriesProductsFilters
): Promise<CategoryAggregate> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: GraphQLFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.productName) {
    filters.productName = params.productName;
  }

  return await getCategoryProducts(
    categoryName,
    params.startDate,
    params.endDate,
    Object.keys(filters).length > 0 ? filters : undefined
  );
}

