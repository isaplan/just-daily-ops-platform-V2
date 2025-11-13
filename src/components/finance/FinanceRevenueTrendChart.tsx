import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceRevenueTrendChartProps {
  locationKey: string;
}

export default function FinanceRevenueTrendChart({ locationKey }: FinanceRevenueTrendChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['finance-trends', locationKey],
    queryFn: async () => {
      let query = supabase
        .from('view_finance_trends' as any)
        .select('*')
        .order('full_date', { ascending: true });

      if (locationKey !== "all") {
        query = query.eq('location_key', parseInt(locationKey));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data for chart
      return data?.map((row: any) => ({
        period: row.period_name,
        revenue: Math.round(row.total_revenue || 0),
        revenue_3month_avg: Math.round(row.revenue_3month_avg || 0),
        gp_pct: parseFloat((row.gross_profit_pct || 0).toFixed(1)),
        labor_pct: parseFloat((row.labor_cost_pct || 0).toFixed(1)),
        ebitda_pct: parseFloat((row.ebitda_pct || 0).toFixed(1)),
        location: row.location_name
      }));
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
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
          yAxisId="left"
          className="text-xs"
          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          className="text-xs"
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip 
          formatter={(value: any, name: string) => {
            if (name.includes('revenue')) {
              return [`€${value.toLocaleString('nl-NL')}`, name];
            }
            return [`${value}%`, name];
          }}
        />
        <Legend />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="revenue" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Revenue"
          dot={{ r: 3 }}
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="revenue_3month_avg" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          strokeDasharray="5 5"
          name="3-Month Avg"
          dot={false}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="ebitda_pct" 
          stroke="hsl(var(--chart-2))" 
          strokeWidth={2}
          name="EBITDA %"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
