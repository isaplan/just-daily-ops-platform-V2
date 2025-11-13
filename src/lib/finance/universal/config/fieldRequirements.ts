import { ImportType } from '../types';

// Field requirements per import type
export const FIELD_REQUIREMENTS: Record<ImportType, { required: string[], optional: string[] }> = {
  bork_sales: {
    required: ['product_name', 'date'],
    optional: ['quantity', 'price', 'revenue', 'category']
  },
  eitje_labor: {
    required: ['date', 'employee_name', 'team_name', 'hours', 'shift_type'],
    optional: ['hourly_rate', 'labor_cost', 'contract_type', 'base_hourly_wage', 'location_name']
  },
  eitje_productivity: {
    required: ['date', 'team_name', 'hours_worked', 'revenue', 'labor_cost'],
    optional: ['labor_cost_percentage', 'productivity_per_hour', 'location_name']
  },
  powerbi_pnl: {
    required: ['year', 'month', 'gl_account', 'category', 'amount'],
    optional: ['subcategory']
  }
};
