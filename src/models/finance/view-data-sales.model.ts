/**
 * Finance View Data Sales Model Layer
 * Type definitions for sales data view
 */

export interface RevenueRecord {
  id: string;
  date: string;
  environment_id?: number | null;
  total_revenue?: number | null;
  total_revenue_excl_vat?: number | null;
  total_revenue_incl_vat?: number | null;
  total_vat_amount?: number | null;
  avg_vat_rate?: number | null;
  total_cash_revenue?: number | null;
  total_card_revenue?: number | null;
  total_digital_revenue?: number | null;
  cash_percentage?: number | null;
  card_percentage?: number | null;
  digital_percentage?: number | null;
  transaction_count?: number | null;
  avg_revenue_per_transaction?: number | null;
}

export interface SalesTotals {
  totalRevenue: number;
  totalTransactions: number;
  totalCash: number;
  totalCard: number;
  totalDigital: number;
  avgTransactionValue: number;
}

export interface SalesDataResponse {
  records: RevenueRecord[];
  total: number;
  totalPages: number;
  totals: SalesTotals;
}

export interface SalesQueryParams {
  page: number;
  limit: number;
  dateFilter?: string;
}



