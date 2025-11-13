import { useState, useEffect } from 'react';
import { createClient } from '@/integrations/supabase/client';

interface RevenueData {
  totalRevenue: number;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    profit: number;
    transactions: number;
  }>;
  revenueGrowth: number;
}

interface UseRevenueDataProps {
  period: string;
  currentDate: Date;
  comparisonCount: number;
  selectedLocation: string | null;
}

export function useRevenueData({ period, currentDate, comparisonCount, selectedLocation }: UseRevenueDataProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Validate and normalize currentDate
        const validDate = currentDate && !isNaN(currentDate.getTime()) ? currentDate : new Date();
        
        // Calculate date range based on period
        const getDateRange = (period: string, date: Date) => {
          // Additional validation
          if (!date || isNaN(date.getTime())) {
            console.error('Invalid input date:', date);
            const today = new Date();
            return {
              start: today.toISOString().split('T')[0],
              end: today.toISOString().split('T')[0]
            };
          }

          const start = new Date(date);
          const end = new Date(date);
          
          try {
            switch (period) {
              case 'day':
                // Same day
                break;
              case 'week':
                // Get Monday of the week
                const dayOfWeek = date.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0
                start.setDate(date.getDate() + mondayOffset);
                end.setDate(start.getDate() + 6);
                break;
              case 'month':
                start.setDate(1);
                end.setMonth(date.getMonth() + 1, 0);
                break;
              case 'quarter':
                const quarter = Math.floor(date.getMonth() / 3);
                start.setMonth(quarter * 3, 1);
                end.setMonth(quarter * 3 + 3, 0);
                break;
              case 'year':
                start.setMonth(0, 1);
                end.setMonth(11, 31);
                break;
              default:
                // Default to current day if period is unknown
                break;
            }
          } catch (error) {
            console.error('Error calculating date range:', error, { period, date });
            // Fallback to current day
            const today = new Date();
            return {
              start: today.toISOString().split('T')[0],
              end: today.toISOString().split('T')[0]
            };
          }
          
          // Validate dates before converting to ISO string
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error('Invalid date range calculated:', { 
              period, 
              date: date.toISOString(), 
              start: start.toISOString(), 
              end: end.toISOString() 
            });
            // Fallback to current day
            const today = new Date();
            return {
              start: today.toISOString().split('T')[0],
              end: today.toISOString().split('T')[0]
            };
          }
          
          return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
          };
        };

            const { start, end } = getDateRange(period, validDate);

        const supabase = createClient();
        
        // Fetch processed sales data
        const { data: salesData, error: salesError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP6_PROCESSED_DATA')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true });

        if (salesError) {
          throw new Error(salesError.message);
        }

        // Calculate revenue metrics
        const totalRevenue = salesData?.reduce((sum, sale) => {
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          return sum + revenue;
        }, 0) || 0;

        // Group by date for daily breakdown
        const dailyBreakdown = salesData?.reduce((acc: any, sale) => {
          const date = sale.date;
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          const profit = revenue * 0.3; // Simplified profit calculation
          
          if (!acc[date]) {
            acc[date] = { date, revenue: 0, profit: 0, transactions: 0 };
          }
          
          acc[date].revenue += revenue;
          acc[date].profit += profit;
          acc[date].transactions += 1;
          
          return acc;
        }, {});

        const dailyBreakdownArray = Object.values(dailyBreakdown || {}).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate growth (simplified - would need historical data)
        const revenueGrowth = 12.5; // Placeholder

        setData({
          totalRevenue,
          dailyBreakdown: dailyBreakdownArray as any[],
          revenueGrowth
        });
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching revenue data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, [period, currentDate, comparisonCount, selectedLocation]);

  return { data, isLoading, error };
}