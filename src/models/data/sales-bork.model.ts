/**
 * Sales Bork Model Layer
 * Type definitions for Bork Sales Data page
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface SalesRecord {
  id: string;
  date: string;
  environment_id: number;
  environment_name: string | null;
  total_revenue: number;
  transaction_count: number;
  avg_revenue_per_transaction: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  avg_vat_rate: number;
  total_cash_revenue: number;
  total_card_revenue: number;
  total_digital_revenue: number;
  total_other_revenue: number;
  cash_percentage: number;
  card_percentage: number;
  digital_percentage: number;
  other_percentage: number;
  max_transaction_value: number;
  min_transaction_value: number;
  currency: string;
  net_revenue: number;
  gross_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface SalesDataResponse {
  records: SalesRecord[];
  total: number;
}

export interface SalesQueryParams {
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: number | null;
  selectedLocation: string;
  startDate: string;
  endDate: string;
  currentPage: number;
  itemsPerPage: number;
  environmentIds: number[] | null;
}



