import { useState, useEffect } from 'react';

interface SalesData {
  id: string;
  location_id: string;
  date: string;
  total_quantity: number;
  total_revenue_excl_vat: number;
  total_revenue_incl_vat: number;
  total_vat_amount: number;
  total_cost: number;
  avg_price: number;
  vat_9_base: number;
  vat_9_amount: number;
  vat_21_base: number;
  vat_21_amount: number;
  product_count: number;
  unique_products: number;
  top_category: string | null;
  category_breakdown: Record<string, unknown>;
  display_revenue?: number;
  created_at: string;
  updated_at: string;
}

interface UseSalesDataProps {
  locationFilter: string | string[] | "all";
  dateRange: { start: Date; end: Date } | null;
  includeVat?: boolean;
}

export function useSalesData({ locationFilter, dateRange, includeVat = false }: UseSalesDataProps) {
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Early return if dateRange is null or undefined
        if (!dateRange || !dateRange.start || !dateRange.end) {
          setData([]);
          setIsLoading(false);
          return;
        }

        // Build query parameters for the aggregated sales API
        const params = new URLSearchParams();
        
        // Add location filter - DEFENSIVE: Only add if we have valid location IDs
        if (locationFilter !== "all") {
          if (Array.isArray(locationFilter)) {
            // Only add if array has valid location IDs
            if (locationFilter.length > 0 && locationFilter.every(id => id && id.trim() !== '')) {
              params.append('locationIds', locationFilter.join(','));
            }
          } else {
            // Only add if single location ID is valid
            if (locationFilter && locationFilter.trim() !== '') {
              params.append('locationIds', locationFilter);
            }
          }
        }
        
        // Add date range
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
        
        // Add VAT preference
        params.append('includeVat', includeVat.toString());
        
        // Add pagination (fetch all data for now)
        params.append('limit', '1000');
        params.append('page', '1');

        console.log('[useSalesData] Fetching aggregated sales data with params:', params.toString());

        const response = await fetch(`/api/sales/aggregated?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          // If the table doesn't exist yet, return empty data instead of throwing
          if (result.error?.includes('Could not find the table') || result.error?.includes('relation') || result.error?.includes('does not exist')) {
            console.log('[useSalesData] Aggregated table not found, returning empty data');
            setData([]);
            return;
          }
          throw new Error(result.error || 'Failed to fetch sales data');
        }

        console.log('[useSalesData] Fetched', result.data?.length || 0, 'aggregated sales records');
        setData(result.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching sales data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [locationFilter, dateRange, includeVat]);

  return { data, isLoading, error };
}