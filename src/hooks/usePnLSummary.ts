import { useQuery } from "@tanstack/react-query";
import { fetchPnLTimeSeries, type MetricType, type DateRange, type PnLTimeSeriesPoint } from "@/lib/services/daily-ops/finance.service";

// Re-export for backward compatibility
export type { MetricType };

interface PnLData {
  revenue: number;
  gross_profit: number;
  ebitda: number;
  labor_cost: number;
  other_costs: number;
  cogs: number;
  financial_costs?: number;
}

// DateRange is now imported from service

/**
 * Fetch P&L data from pre-aggregated summary table
 * Supports "All Locations" with simple SUM()
 */
export function usePnLSummary(
  locationId: string | null,
  dateRange: DateRange | null
) {
  return useQuery({
    queryKey: ["pnl-summary", locationId, dateRange],
    queryFn: async () => {
      if (!dateRange) return null;

      const supabase = createClient();
      const startYear = dateRange.start.getFullYear();
      const startMonth = dateRange.start.getMonth() + 1;
      const endYear = dateRange.end.getFullYear();
      const endMonth = dateRange.end.getMonth() + 1;

      let query = supabase
        .from("powerbi_pnl_data")
        .select("*");

      // Filter by year and month range
      if (startYear === endYear) {
        query = query
          .eq("year", startYear)
          .gte("month", startMonth)
          .lte("month", endMonth);
      } else {
        query = query.or(
          `and(year.eq.${startYear},month.gte.${startMonth}),` +
          `and(year.eq.${endYear},month.lte.${endMonth})` +
          (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : '')
        );
      }

      // Location filter (null or "all" = all locations)
      if (locationId && locationId !== "all") {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return aggregatePnLData(data || []);
    },
    enabled: !!dateRange,
  });
}

/**
 * Simple aggregation - SUM the pre-calculated fields
 */
function aggregatePnLData(data: any[]): PnLData {
  const totals = data.reduce((acc, record) => {
    const amount = Number(record.amount) || 0;
    const category = record.category?.toLowerCase() || '';
    
    // Map PowerBI categories to P&L structure using exact just-stock-it logic
    // Revenue categories: keep amounts as-is (positive stays positive, negative stays negative)
    // Cost/Expense categories: multiply by -1 to convert negative to positive
    if (category === 'netto-omzet' || 
        category === 'overige bedrijfsopbrengsten' || 
        category === 'opbrengst van vorderingen die tot de vaste activa behoren en van effecten') {
      acc.revenue += amount; // Revenue: keep as-is
    } else if (category === 'kostprijs van de omzet') {
      acc.cogs += -1 * amount; // COGS: convert negative to positive
    } else if (category === 'lasten uit hoofde van personeelsbeloningen') {
      acc.labor += -1 * amount; // Labor: convert negative to positive
    } else if (category === 'overige bedrijfskosten') {
      acc.opex += -1 * amount; // OPEX: convert negative to positive
    } else if (category === 'afschrijvingen op immateriële en materiële vaste activa') {
      acc.depreciation += -1 * amount; // Depreciation: convert negative to positive
    } else if (category === 'financiële baten en lasten') {
      acc.financial += -1 * amount; // Financial: convert negative to positive
    }
    
    return acc;
  }, {
    revenue: 0,
    cogs: 0,
    labor: 0,
    opex: 0,
    depreciation: 0,
    financial: 0
  });

  const gross_profit = totals.revenue - totals.cogs;
  const ebitda = gross_profit - totals.labor - totals.opex + totals.depreciation;
  const net_profit = ebitda - totals.financial;

  return {
    revenue: totals.revenue,
    gross_profit,
    ebitda,
    labor_cost: totals.labor,
    other_costs: totals.opex,
    cogs: totals.cogs,
    financial_costs: totals.financial
  };
}

/**
 * Time series data for charts
 * Thin wrapper around Service layer (MVVM compliant)
 * Uses aggregated table for consistency with P&L balance page
 */
export function usePnLTimeSeries(
  locationId: string | null,
  dateRange: DateRange | null,
  metric: MetricType
) {
  return useQuery<PnLTimeSeriesPoint[]>({
    queryKey: ["pnl-timeseries-aggregated", locationId, dateRange, metric],
    enabled: !!dateRange && locationId !== undefined,
    queryFn: () => fetchPnLTimeSeries(locationId, dateRange, metric),
  });
}

function groupByMonth(data: any[]) {
  const grouped = new Map<string, any>();

  data.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;

        if (!grouped.has(monthKey)) {
          grouped.set(monthKey, {
            revenue: 0,
            cogs: 0,
            labor: 0,
            opex: 0,
            depreciation: 0,
            financial: 0
          });
        }
    
    const totals = grouped.get(monthKey);
    const amount = Number(row.amount) || 0;
    const category = row.category?.toLowerCase() || '';
    
    // Map PowerBI categories to P&L structure using exact just-stock-it logic
    // Revenue categories: keep amounts as-is (positive stays positive, negative stays negative)
    // Cost/Expense categories: multiply by -1 to convert negative to positive
    if (category === 'netto-omzet' || 
        category === 'overige bedrijfsopbrengsten' || 
        category === 'opbrengst van vorderingen die tot de vaste activa behoren en van effecten') {
      totals.revenue += amount; // Revenue: keep as-is
    } else if (category === 'kostprijs van de omzet') {
      totals.cogs += -1 * amount; // COGS: convert negative to positive
    } else if (category === 'lasten uit hoofde van personeelsbeloningen') {
      totals.labor += -1 * amount; // Labor: convert negative to positive
    } else if (category === 'overige bedrijfskosten') {
      totals.opex += -1 * amount; // OPEX: convert negative to positive
    } else if (category === 'afschrijvingen op immateriële en materiële vaste activa') {
      totals.depreciation += -1 * amount; // Depreciation: convert negative to positive
    } else if (category === 'financiële baten en lasten') {
      totals.financial += -1 * amount; // Financial: convert negative to positive
    }
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({ period, totals }));
}

// extractMetricFromSummary moved to Service layer (MVVM compliance)