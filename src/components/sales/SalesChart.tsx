"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesChartProps {
  data: Array<{
    period: string;
    revenue: number;
    transactions: number;
    avgTransaction: number;
  }>;
  chartType: "line" | "bar";
  isLoading?: boolean;
  title?: string;
}

export function SalesChart({ 
  data, 
  chartType, 
  isLoading = false, 
  title = "Sales Performance" 
}: SalesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("nl-NL").format(value);
  };

  const ChartComponent = chartType === "line" ? LineChart : BarChart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tickFormatter={(value) => {
                // Format period for display
                if (value.includes('-')) {
                  const [year, month] = value.split('-');
                  return `${month}/${year.slice(-2)}`;
                }
                return value;
              }}
            />
            <YAxis 
              className="text-xs"
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: any, name: string) => {
                if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                if (name === 'transactions') return [formatNumber(value), 'Transactions'];
                if (name === 'avgTransaction') return [formatCurrency(value), 'Avg Transaction'];
                return [value, name];
              }}
              contentStyle={{ 
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))"
              }}
            />
            {chartType === "line" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Transactions"
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  name="Revenue"
                />
                <Bar
                  dataKey="transactions"
                  fill="hsl(var(--secondary))"
                  name="Transactions"
                />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

