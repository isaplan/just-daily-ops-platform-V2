/**
 * Finance Eitje Data Finance Model Layer
 * Type definitions for Eitje finance data
 */

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface Environment {
  id: number;
  raw_data?: {
    name?: string;
    [key: string]: unknown;
  };
}

export interface FinanceRecord {
  id: string;
  date: string;
  environment_id: number;
  environment_name?: string | null;
  total_revenue: number | null;
  transaction_count: number | null;
  avg_revenue_per_transaction: number | null;
  total_revenue_excl_vat: number | null;
  total_revenue_incl_vat: number | null;
  total_vat_amount: number | null;
  avg_vat_rate: number | null;
  total_cash_revenue: number | null;
  total_card_revenue: number | null;
  total_digital_revenue: number | null;
  total_other_revenue: number | null;
  cash_percentage: number | null;
  card_percentage: number | null;
  digital_percentage: number | null;
  other_percentage: number | null;
  max_transaction_value: number | null;
  min_transaction_value: number | null;
  currency: string | null;
  net_revenue: number | null;
  gross_revenue: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FinanceDataResponse {
  records: FinanceRecord[];
  total: number;
}

export interface FinanceQueryParams {
  startDate: string;
  endDate: string;
  environmentId?: string;
  environmentIds?: number[] | null;
  page: number;
  itemsPerPage: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}



