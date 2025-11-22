/**
 * Bork Sales V2 Model Layer
 * Type definitions and interfaces for Bork sales data
 */

export interface BorkSalesRecord {
  id: string;
  date: string;
  location_id?: string;
  location_name?: string | null;
  ticket_key?: string | null;
  ticket_number?: string | null;
  order_key?: string | null;
  order_line_key?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  product_number?: number | null;
  category?: string | null;
  group_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_ex_vat?: number | null;
  total_inc_vat?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  cost_price?: number | null;
  payment_method?: string | null;
  table_number?: number | null;
  waiter_name?: string | null;
  time?: string | null;
  created_at?: string | null;
}

export interface BorkSalesFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  locationId?: string;
  category?: string;
  productName?: string;
}

export interface BorkSalesPagination {
  page: number;
  limit: number;
}

export interface BorkSalesQueryParams extends BorkSalesFilters, BorkSalesPagination {}

export interface BorkSalesResponse {
  success: boolean;
  records: BorkSalesRecord[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}




