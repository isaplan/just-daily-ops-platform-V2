"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePnLTimeSeries, MetricType } from "@/hooks/usePnLSummary";
import { mergeMultiLocationData, getLocationColor, TimeGranularity } from "@/lib/finance/chartDataAggregator";
import { CategorySelection } from "./CategoryFilterSheet";

interface DateRange {
  start: Date;
  end: Date;
}

interface FlexibleMetricChartProps {
  selectedMetric: MetricType;
  activeLocations: string[];
  dateRange: DateRange | null;
  comparisonDateRange?: DateRange | null;
  comparisonEnabled?: boolean;
  chartType: "line" | "bar";
  xAxisGranularity: TimeGranularity;
  includeVat?: boolean;
  vatRate?: number;
  selectedCategories?: CategorySelection[];
  categoryData?: Array<{
    category: string;
    subcategory?: string;
    data: Array<{ period: string; value: number }>;
  }>;
}

const metricLabels: Record<MetricType, string> = {
  revenue: "Revenue",
  gross_profit: "Gross Profit",
  ebitda: "EBITDA",
  labor_cost: "Labor Cost",
  other_costs: "Other Costs",
};

export default function FlexibleMetricChart({
  selectedMetric,
  activeLocations,
  dateRange,
  comparisonDateRange,
  comparisonEnabled,
  chartType,
  xAxisGranularity,
  includeVat = false,
  vatRate = 1.12,
  selectedCategories = [],
  categoryData = [],
}: FlexibleMetricChartProps) {
  // Category mode: Show selected categories instead of metrics
  const isCategoryMode = selectedCategories.length > 0;
  // Fetch locations for name mapping
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("locations").select("*");
      return data || [];
    },
  });

  // Determine which location IDs to fetch (for display logic)
  const locationIdsToFetch = activeLocations.includes("all")
    ? [null] // null = aggregate all
    : activeLocations;

  // Always fetch for up to 4 locations to maintain consistent hook count
  // Use "all" (null) for primary, then individual locations if needed
  const loc1 = locationIdsToFetch[0] ?? null;
  const loc2 = locationIdsToFetch[1] ?? null;
  const loc3 = locationIdsToFetch[2] ?? null;
  const loc4 = locationIdsToFetch[3] ?? null;

  // Primary period queries (always 4 hooks, some may be disabled)
  const primary1 = usePnLTimeSeries(loc1, dateRange, selectedMetric);
  const primary2 = usePnLTimeSeries(loc2, dateRange, selectedMetric);
  const primary3 = usePnLTimeSeries(loc3, dateRange, selectedMetric);
  const primary4 = usePnLTimeSeries(loc4, dateRange, selectedMetric);

  // Comparison period queries (always 4 hooks, some may be disabled)
  const comparison1 = usePnLTimeSeries(
    comparisonEnabled && comparisonDateRange ? loc1 : null,
    comparisonEnabled ? comparisonDateRange : null,
    selectedMetric
  );
  const comparison2 = usePnLTimeSeries(
    comparisonEnabled && comparisonDateRange ? loc2 : null,
    comparisonEnabled ? comparisonDateRange : null,
    selectedMetric
  );
  const comparison3 = usePnLTimeSeries(
    comparisonEnabled && comparisonDateRange ? loc3 : null,
    comparisonEnabled ? comparisonDateRange : null,
    selectedMetric
  );
  const comparison4 = usePnLTimeSeries(
    comparisonEnabled && comparisonDateRange ? loc4 : null,
    comparisonEnabled ? comparisonDateRange : null,
    selectedMetric
  );

  const primaryQueries = [primary1, primary2, primary3, primary4];
  const comparisonQueries = [comparison1, comparison2, comparison3, comparison4];

  const isLoading = isCategoryMode ? false : (primaryQueries.some(q => q.isLoading) || comparisonQueries.some(q => q.isLoading));

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  // Category mode: Use category data directly
  if (isCategoryMode) {
    const categoryChartData = mergeCategoryData(categoryData, xAxisGranularity);

    if (!categoryChartData || categoryChartData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Category Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No data available for the selected categories
            </div>
          </CardContent>
        </Card>
      );
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    // Map category names to colors (matching CategoryFilterSheet)
    const CATEGORY_CHART_COLORS: Record<string, string> = {
      Revenue: "hsl(142, 70%, 45%)",      // Green
      COGS: "hsl(24, 70%, 50%)",          // Orange
      Labor: "hsl(221, 70%, 50%)",        // Blue
      OPEX: "hsl(271, 70%, 50%)",         // Purple
      Depreciation: "hsl(0, 0%, 45%)",    // Gray
      Finance: "hsl(0, 70%, 50%)",        // Red
    };

    const getCategoryColor = (category: string): string => {
      return CATEGORY_CHART_COLORS[category] || "hsl(var(--chart-1))";
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-xs"
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))"
                }}
              />
              <Legend />
              
              {categoryData.map((cat, index) => {
                const categoryKey = cat.subcategory 
                  ? `${cat.category}_${cat.subcategory}`
                  : cat.category;
                const categoryLabel = cat.subcategory 
                  ? `${cat.category} > ${cat.subcategory}`
                  : cat.category;

                return (
                  <Bar
                    key={categoryKey}
                    dataKey={categoryKey}
                    fill={getCategoryColor(cat.category)}
                    name={categoryLabel}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // Build location datasets for primary period (only for active locations)
  const primaryDataSets = locationIdsToFetch.map((locationId, index) => {
    const query = primaryQueries[index];
    const locationName = locationId === null 
      ? "All Locations"
      : locations?.find(l => l.id === locationId)?.name || "Unknown";
    
    const data = (query.data || []).map(item => ({
      period: item.period,
      value: includeVat && (selectedMetric === "revenue" || selectedMetric === "gross_profit")
        ? item.value * vatRate
        : item.value,
    }));

    return {
      locationId: locationId || "all",
      locationName,
      data,
    };
  });

  // Build location datasets for comparison period (only for active locations)
  const comparisonDataSets = comparisonEnabled && comparisonDateRange
    ? locationIdsToFetch.map((locationId, index) => {
        const query = comparisonQueries[index];
        const locationName = locationId === null 
          ? "All Locations"
          : locations?.find(l => l.id === locationId)?.name || "Unknown";
        
        const data = (query.data || []).map(item => ({
          period: item.period,
          value: includeVat && (selectedMetric === "revenue" || selectedMetric === "gross_profit")
            ? item.value * vatRate
            : item.value,
        }));

        return {
          locationId: `${locationId || "all"}_comparison`,
          locationName: `${locationName} (Comparison)`,
          data,
        };
      })
    : [];

  // Merge all datasets
  const allDataSets = [...primaryDataSets, ...comparisonDataSets];
  const chartData = mergeMultiLocationData(allDataSets, xAxisGranularity);

  // Debug logging for "All Locations"
  console.log("🔍 FlexibleMetricChart Debug:", {
    activeLocations,
    locationIdsToFetch,
    primaryDataSetsCount: primaryDataSets.length,
    comparisonDataSetsCount: comparisonDataSets.length,
    primaryDataSets,
    chartDataLength: chartData.length,
    chartDataSample: chartData.slice(0, 3),
  });

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metricLabels[selectedMetric]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {metricLabels[selectedMetric]} - {chartType === "line" ? "Trend" : "Comparison"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-xs"
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))"
                }}
              />
              <Legend />
              
              {/* Primary period lines */}
              {primaryDataSets.map((dataset, index) => {
                const actualLocationId = dataset.locationId === "all" ? undefined : dataset.locationId;
                return (
                  <Line
                    key={dataset.locationId}
                    type="monotone"
                    dataKey={dataset.locationId}
                    stroke={getLocationColor(index, actualLocationId)}
                    strokeWidth={2}
                    name={dataset.locationName}
                    dot={{ r: 3 }}
                  />
                );
              })}
              
              {/* Comparison period lines (dashed) */}
              {comparisonDataSets.map((dataset, index) => {
                // Extract the original location ID (remove _comparison suffix)
                const actualLocationId = dataset.locationId.replace('_comparison', '');
                const locationId = actualLocationId === "all" ? undefined : actualLocationId;
                return (
                  <Line
                    key={dataset.locationId}
                    type="monotone"
                    dataKey={dataset.locationId}
                    stroke={getLocationColor(index, locationId)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name={dataset.locationName}
                    dot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-xs"
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))"
                }}
              />
              <Legend />
              
              {/* Primary period bars */}
              {primaryDataSets.map((dataset, index) => {
                const actualLocationId = dataset.locationId === "all" ? undefined : dataset.locationId;
                return (
                  <Bar
                    key={dataset.locationId}
                    dataKey={dataset.locationId}
                    fill={getLocationColor(index, actualLocationId)}
                    name={dataset.locationName}
                  />
                );
              })}
              
              {/* Comparison period bars (with pattern) */}
              {comparisonDataSets.map((dataset, index) => {
                // Extract the original location ID (remove _comparison suffix)
                const actualLocationId = dataset.locationId.replace('_comparison', '');
                const locationId = actualLocationId === "all" ? undefined : actualLocationId;
                return (
                  <Bar
                    key={dataset.locationId}
                    dataKey={dataset.locationId}
                    fill={getLocationColor(index, locationId)}
                    fillOpacity={0.6}
                    name={dataset.locationName}
                  />
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Merge category data for chart display
 */
function mergeCategoryData(
  categoryData: Array<{
    category: string;
    subcategory?: string;
    data: Array<{ period: string; value: number }>;
  }>,
  granularity: TimeGranularity
): Array<Record<string, any>> {
  const merged = new Map<string, Record<string, any>>();

  categoryData.forEach((cat) => {
    const categoryKey = cat.subcategory 
      ? `${cat.category}_${cat.subcategory}`
      : cat.category;

    cat.data.forEach((item) => {
      if (!merged.has(item.period)) {
        merged.set(item.period, { period: item.period });
      }
      const existing = merged.get(item.period)!;
      existing[categoryKey] = item.value;
    });
  });

  return Array.from(merged.values()).sort((a, b) => 
    a.period.localeCompare(b.period)
  );
}