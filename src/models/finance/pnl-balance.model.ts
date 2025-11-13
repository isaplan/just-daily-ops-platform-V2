/**
 * P&L Balance Model Layer
 * Type definitions for P&L Balance page
 */

export interface AggregatedPnLRecord {
  id: string;
  location_id: string;
  year: number;
  month: number;
  // Revenue (positive values)
  netto_omzet_uit_levering_geproduceerd: number;
  netto_omzet_verkoop_handelsgoederen: number;
  revenue_total?: number;
  // Cost of Sales (negative values)
  inkoopwaarde_handelsgoederen: number;
  cost_of_sales_total?: number;
  // Labor Costs (negative values)
  lonen_en_salarissen?: number;
  labor_contract?: number;
  labor_flex?: number;
  labor_total?: number;
  // Other Costs (negative values)
  other_costs_total?: number;
  overige_bedrijfskosten?: number;
  huisvestingskosten?: number;
  exploitatie_kosten?: number;
  verkoop_kosten?: number;
  autokosten?: number;
  kantoorkosten?: number;
  assurantiekosten?: number;
  accountantskosten?: number;
  administratieve_lasten?: number;
  andere_kosten?: number;
  afschrijvingen?: number;
  financiele_baten_lasten?: number;
  opbrengst_vorderingen?: number;
  // Calculated
  total_costs?: number;
  resultaat: number;
  // Metadata
  import_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProcessedPnLData {
  category: string;
  subcategory: string | null;
  amounts: { [month: number]: number };
  total: number;
  isExpanded: boolean;
  isSubcategory: boolean;
  isMissing?: boolean;
  isCollapsible?: boolean;
  parentCategory?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errorMargin: number;
  calculatedResult: number;
  actualResult: number;
  missingCategories: string[];
}

export interface PnLBalanceQueryParams {
  year: number;
  month?: number;
  location: string;
}

export interface PnLBalanceResponse {
  success: boolean;
  data: AggregatedPnLRecord[];
  summary?: {
    totalRecords: number;
    locations: string[];
    months: number[];
    totalRevenue: number;
    totalCosts: number;
    totalResultaat: number;
  };
  error?: string;
}

export interface CategoryConfig {
  category: string;
  subcategories: string[];
  isSubcategory?: boolean;
  parentCategory?: string;
  isCollapsible?: boolean;
}

export interface MonthOption {
  value: number;
  label: string;
}

export interface LocationOption {
  value: string;
  label: string;
}



