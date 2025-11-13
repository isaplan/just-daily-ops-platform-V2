import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MetricType, usePnLTimeSeries } from "@/hooks/usePnLCalculations";
import { Skeleton } from "@/components/ui/skeleton";

interface DateRange {
  start: Date;
  end: Date;
}

interface InteractiveMetricChartProps {
  selectedMetric: MetricType;
  locationId: string | null;
  dateRange: DateRange | null;
  comparisonDateRange?: DateRange | null;
  comparisonEnabled?: boolean;
  includeVat?: boolean;
  vatRate?: number;
}

const metricLabels: Record<MetricType, string> = {
  revenue: "Total Revenue",
  gross_profit: "Gross Profit",
  ebitda: "EBITDA",
  labor_cost: "Labor Cost",
  other_costs: "Other Costs",
};

export function InteractiveMetricChart({
  selectedMetric,
  locationId,
  dateRange,
  comparisonDateRange,
  comparisonEnabled = false,
  includeVat = false,
  vatRate = 1.12,
}: InteractiveMetricChartProps) {
  const { data: primaryData, isLoading: primaryLoading } = usePnLTimeSeries(
    locationId,
    dateRange,
    selectedMetric
  );

  const { data: comparisonData, isLoading: comparisonLoading } = usePnLTimeSeries(
    locationId,
    comparisonDateRange || null,
    selectedMetric
  );

  if (primaryLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!primaryData || primaryData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </CardContent>
      </Card>
    );
  }

  // Merge data for comparison mode
  const isRevenueBased = ['revenue', 'gross_profit', 'ebitda'].includes(selectedMetric);
  const applyVat = (value: number) => includeVat && isRevenueBased ? value * vatRate : value;

  let chartData = primaryData.map((item) => ({
    period: item.period,
    primary: applyVat(item.value),
  }));

  if (comparisonEnabled && comparisonData) {
    chartData = chartData.map((item, index) => ({
      ...item,
      comparison: applyVat(comparisonData[index]?.value || 0),
    }));
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {metricLabels[selectedMetric]} Trend
          {includeVat && isRevenueBased && ' (incl. VAT)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              className="text-xs"
              tickFormatter={(value) => value.substring(0, 7)}
            />
            <YAxis className="text-xs" tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), ""]}
              labelClassName="font-medium"
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="primary"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Current Period"
              dot={{ fill: "hsl(var(--primary))" }}
            />
            {comparisonEnabled && (
              <Line
                type="monotone"
                dataKey="comparison"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Comparison Period"
                dot={{ fill: "hsl(var(--muted-foreground))" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
