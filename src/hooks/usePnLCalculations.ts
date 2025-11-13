import { useState, useEffect } from 'react';
import { createClient } from '@/integrations/supabase/client';

interface PnLData {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  categories: Array<{
    category: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }>;
}

interface UsePnLCalculationsProps {
  start: string;
  end: string;
}

export function usePnLCalculations({ start, end }: UsePnLCalculationsProps) {
  const [data, setData] = useState<PnLData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPnLData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        
        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP6_PROCESSED_DATA')
          .gte('date', start)
          .lte('date', end);

        if (salesError) {
          throw new Error(salesError.message);
        }

        // Fetch cost data (if available)
        const { data: costData, error: costError } = await supabase
          .from('daily_waste')
          .select('*')
          .gte('date', start)
          .lte('date', end);

        // Calculate P&L metrics
        const totalRevenue = salesData?.reduce((sum, sale) => {
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          return sum + revenue;
        }, 0) || 0;

        // Calculate costs (simplified - would need actual cost data)
        const totalCosts = totalRevenue * 0.7; // Assume 70% cost ratio
        const totalProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Calculate by category
        const categoryData = salesData?.reduce((acc: any, sale) => {
          const category = sale.raw_data?.category || 'Unknown';
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          const costs = revenue * 0.7; // Simplified cost calculation
          const profit = revenue - costs;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

          if (!acc[category]) {
            acc[category] = { category, revenue: 0, costs: 0, profit: 0, margin: 0 };
          }

          acc[category].revenue += revenue;
          acc[category].costs += costs;
          acc[category].profit += profit;
          acc[category].margin = acc[category].revenue > 0 ? 
            (acc[category].profit / acc[category].revenue) * 100 : 0;

          return acc;
        }, {});

        const categories = Object.values(categoryData || {}).sort((a: any, b: any) => 
          b.revenue - a.revenue
        );

        setData({
          totalRevenue,
          totalCosts,
          totalProfit,
          profitMargin,
          categories: categories as any[]
        });
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching P&L data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPnLData();
  }, [start, end]);

  return { data, isLoading, error };
}