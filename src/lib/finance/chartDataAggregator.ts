/**
 * Data aggregation helpers for P&L charts
 * Transforms monthly data into quarterly/yearly aggregates
 */

interface MonthlyDataPoint {
  period: string; // "2024-10"
  value: number;
}

interface AggregatedDataPoint {
  period: string; // "2024-Q4" or "2024"
  value: number;
}

export type TimeGranularity = "day" | "week" | "month" | "quarter" | "year";

/**
 * Aggregate monthly data by quarter (Q1, Q2, Q3, Q4)
 */
export function aggregateByQuarter(
  monthlyData: MonthlyDataPoint[]
): AggregatedDataPoint[] {
  const quarterMap = new Map<string, number>();
  
  monthlyData.forEach(({ period, value }) => {
    const [year, month] = period.split('-').map(Number);
    const quarter = Math.ceil(month / 3);
    const quarterKey = `${year}-Q${quarter}`;
    
    quarterMap.set(
      quarterKey, 
      (quarterMap.get(quarterKey) || 0) + value
    );
  });
  
  return Array.from(quarterMap.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Aggregate monthly data by year
 */
export function aggregateByYear(
  monthlyData: MonthlyDataPoint[]
): AggregatedDataPoint[] {
  const yearMap = new Map<string, number>();
  
  monthlyData.forEach(({ period, value }) => {
    const year = period.split('-')[0];
    yearMap.set(year, (yearMap.get(year) || 0) + value);
  });
  
  return Array.from(yearMap.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Apply time granularity aggregation to data
 */
export function applyGranularity(
  data: MonthlyDataPoint[],
  granularity: TimeGranularity
): AggregatedDataPoint[] {
  switch (granularity) {
    case "quarter":
      return aggregateByQuarter(data);
    case "year":
      return aggregateByYear(data);
    case "month":
    default:
      return data;
  }
}

interface LocationDataSet {
  locationId: string;
  locationName: string;
  data: MonthlyDataPoint[];
}

/**
 * Merge multiple location datasets into unified chart data
 * Output format: [{ period, location_id1, location_id2, ... }]
 */
export function mergeMultiLocationData(
  locationDataSets: LocationDataSet[],
  granularity: TimeGranularity
): any[] {
  // Aggregate each location's data by granularity
  const aggregated = locationDataSets.map(({ locationId, locationName, data }) => ({
    locationId,
    locationName,
    data: applyGranularity(data, granularity)
  }));
  
  // Create unified period list
  const allPeriods = new Set(
    aggregated.flatMap(({ data }) => data.map(d => d.period))
  );
  
  // Merge into single array with all locations
  return Array.from(allPeriods)
    .sort()
    .map(period => {
      const row: any = { period };
      
      aggregated.forEach(({ locationId, locationName, data }) => {
        const match = data.find(d => d.period === period);
        row[locationId] = match?.value || 0;
        row[`${locationId}_name`] = locationName;
      });
      
      return row;
    });
}

/**
 * Color mapping for specific locations
 */
const LOCATION_COLOR_MAP: Record<string, string> = {
  "550e8400-e29b-41d4-a716-446655440001": "#407B7D", // Van Kinsbergen
  "550e8400-e29b-41d4-a716-446655440002": "#DA9C29", // Bar Bea
  "550e8400-e29b-41d4-a716-446655440003": "#F05B40", // L'Amour Toujours
};

/**
 * Default color palette for multi-location charts
 */
export const LOCATION_COLORS = [
  "hsl(var(--chart-1))", // Blue
  "hsl(var(--chart-2))", // Green
  "hsl(var(--chart-3))", // Amber
  "hsl(var(--chart-4))", // Purple
  "hsl(var(--chart-5))", // Red
];

/**
 * Get color for location by ID or index
 * Prioritizes specific location colors, falls back to index-based colors
 */
export function getLocationColor(index: number, locationId?: string): string {
  // Check if we have a specific color for this location ID
  if (locationId && LOCATION_COLOR_MAP[locationId]) {
    return LOCATION_COLOR_MAP[locationId];
  }
  
  return LOCATION_COLORS[index % LOCATION_COLORS.length];
}
