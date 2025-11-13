/**
 * Finance Daily Ops Model Layer
 * Type definitions for daily ops finance pages
 */

export interface DailyOpsKpi {
  id: string;
  title: string;
  value: number;
  change: number;
  trend: "up" | "down" | "stable";
}

export interface DailyOpsTrend {
  date: string;
  revenue: number;
  hours: number;
  productivity: number;
}




