/**
 * Categories Products Aggregated Sales Model Layer
 * Type definitions for aggregated sales data by category and product
 */

export interface TimePeriodTotals {
  quantity: number;
  revenueExVat: number;
  revenueIncVat: number;
  transactionCount: number;
}

export interface ProductAggregate {
  productName: string;
  daily: TimePeriodTotals;
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals; // Grand total across all periods
  // Workload metrics (for kitchen analysis)
  workloadLevel?: 'low' | 'mid' | 'high';
  workloadMinutes?: number; // Calculated from workloadLevel (low: 2.5, mid: 5, high: 10)
  // MEP (prep) time metrics (kitchen prep time before service)
  mepLevel?: 'low' | 'mid' | 'high';
  mepMinutes?: number; // Calculated from mepLevel (low: 1, mid: 2, high: 4)
  // Course type (for kitchen analysis - optional, only for food items)
  courseType?: 'snack' | 'voorgerecht' | 'hoofdgerecht' | 'nagerecht' | 'bijgerecht' | 'drank' | 'overig';
}

export interface CategoryAggregate {
  categoryName: string;
  mainCategoryName?: string; // Parent/main category if exists
  products: ProductAggregate[];
  daily: TimePeriodTotals; // Category totals (sum of all products)
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals;
}

export interface MainCategoryAggregate {
  mainCategoryName: string;
  categories: CategoryAggregate[];
  daily: TimePeriodTotals; // Main category totals (sum of all subcategories)
  weekly: TimePeriodTotals;
  monthly: TimePeriodTotals;
  total: TimePeriodTotals;
}

export interface CategoriesProductsFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  locationId?: string;
  category?: string;
  productName?: string;
}

export interface CategoriesProductsResponse {
  success: boolean;
  categories: CategoryAggregate[];
  mainCategories?: MainCategoryAggregate[]; // Optional: if main categories exist
  totals: {
    daily: TimePeriodTotals;
    weekly: TimePeriodTotals;
    monthly: TimePeriodTotals;
    total: TimePeriodTotals;
  };
  error?: string;
}

export interface CategoryOption {
  value: string;
  label: string;
  products?: ProductOption[];
}

export interface ProductOption {
  value: string;
  label: string;
  category: string;
}

export interface CategoryProductFilterState {
  selectedCategory: string;
  selectedProduct: string;
  expandedCategories: Set<string>;
}

