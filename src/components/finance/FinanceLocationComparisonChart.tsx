import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceLocationComparisonChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['finance-location-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_finance_location_comparison' as any)
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(30); // Last 10 months x 3 locations

      if (error) throw error;

      // Group by period and pivot by location
      const grouped = data?.reduce((acc: any, row: any) => {
        const key = row.period_name;
        if (!acc[key]) {
          acc[key] = { period: key };
        }
        acc[key][`${row.location_name}_revenue`] = Math.round(row.total_revenue || 0);
        acc[key][`${row.location_name}_gp`] = parseFloat((row.gross_profit_pct || 0).toFixed(1));
        acc[key][`${row.location_name}_ebitda`] = parseFloat((row.ebitda_pct || 0).toFixed(1));
        return acc;
      }, {});

      return Object.values(grouped || {}).reverse();
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No comparison data available
      </div>
    );
  }

  // Get unique location names from data
  const locations = chartData.length > 0 
    ? Object.keys(chartData[0])
        .filter((key: string) => key.endsWith('_revenue'))
        .map((key: string) => key.replace('_revenue', ''))
    : [];

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
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
          formatter={(value: any) => `€${value.toLocaleString('nl-NL')}`}
        />
        <Legend />
        {locations.map((location, index) => (
          <Bar 
            key={location}
            dataKey={`${location}_revenue`} 
            fill={colors[index % colors.length]}
            name={location}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
