import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceKpiCardsProps {
  locationKey: string;
}

export default function FinanceKpiCards({ locationKey }: FinanceKpiCardsProps) {
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['finance-kpis', locationKey],
    queryFn: async () => {
      let query = supabase
        .from('view_finance_summary' as any)
        .select('*')
        .order('full_date', { ascending: false });

      if (locationKey !== "all") {
        query = query.eq('location_name', locationKey);
      }

      const { data, error } = await query.limit(2);
      if (error) {
        console.error('KPI query error:', error);
        throw error;
      }

      // Calculate period-over-period changes
      const current = data?.[0];
      const previous = data?.[1];

      return {
        current,
        previous,
        changes: {
          revenue: previous ? (((current as any).total_revenue - (previous as any).total_revenue) / (previous as any).total_revenue) * 100 : 0,
          gp: previous ? (current as any).gross_profit_pct - (previous as any).gross_profit_pct : 0,
          labor: previous ? (current as any).labor_cost_pct - (previous as any).labor_cost_pct : 0,
          ebitda: previous ? (current as any).ebitda_pct - (previous as any).ebitda_pct : 0,
        }
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const current = kpiData?.current;
  const changes = kpiData?.changes;

  if (!current) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No financial data available</p>
      </Card>
    );
  }

  const kpis = [
    {
      label: "Total Revenue",
      value: `€${((current as any).total_revenue || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: changes?.revenue || 0,
      icon: DollarSign,
      format: 'currency'
    },
    {
      label: "Gross Profit %",
      value: `${((current as any).gross_profit_pct || 0).toFixed(1)}%`,
      change: changes?.gp || 0,
      icon: Percent,
      format: 'percentage'
    },
    {
      label: "Labor Cost %",
      value: `${((current as any).labor_cost_pct || 0).toFixed(1)}%`,
      change: changes?.labor || 0,
      icon: Percent,
      format: 'percentage',
      inverse: true // Lower is better
    },
    {
      label: "EBITDA %",
      value: `${((current as any).ebitda_pct || 0).toFixed(1)}%`,
      change: changes?.ebitda || 0,
      icon: Percent,
      format: 'percentage'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const isPositive = kpi.inverse ? kpi.change < 0 : kpi.change > 0;
        const Icon = kpi.icon;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={kpi.label} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div className={`flex items-center text-sm ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendIcon className="h-4 w-4 mr-1" />
                {Math.abs(kpi.change).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs. previous period
            </p>
          </Card>
        );
      })}
    </div>
  );
}
