/**
 * Daily Ops Labor Model Layer
 * Type definitions for labor analytics page
 */

export interface LaborData {
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  productivity: number;
  avgRate: number;
  efficiency: number;
  peakHours: number;
  activeStaff: number;
}

export interface LaborQueryParams {
  locationId: string;
  startDate: string;
  endDate: string;
}

export interface Location {
  id: string;
  name: string;
}




