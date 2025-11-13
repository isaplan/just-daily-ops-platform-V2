import { useQuery } from '@tanstack/react-query';

interface LatestPnLBalanceData {
  id: string;
  location_id: string;
  year: number;
  month: number;
  // Revenue (positive values)
  netto_omzet_uit_levering_geproduceerd: number;
  netto_omzet_verkoop_handelsgoederen: number;
  revenue_total?: number;
  // Cost of Sales (negative values)
  inkoopwaarde_handelsgoederen: number;
  cost_of_sales_total?: number;
  // Labor Costs (negative values)
  lonen_en_salarissen?: number;
  labor_contract?: number;
  labor_flex?: number;
  labor_total?: number;
  // Other Costs (negative values)
  other_costs_total?: number;
  overige_bedrijfskosten?: number;
  huisvestingskosten?: number;
  exploitatie_kosten?: number;
  verkoop_kosten?: number;
  autokosten?: number;
  kantoorkosten?: number;
  assurantiekosten?: number;
  accountantskosten?: number;
  administratieve_lasten?: number;
  andere_kosten?: number;
  afschrijvingen?: number;
  financiele_baten_lasten?: number;
  opbrengst_vorderingen?: number;
  // Calculated
  total_costs?: number;
  resultaat: number;
  // Metadata
  import_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface LatestPnLBalanceResponse {
  success: boolean;
  data: LatestPnLBalanceData | null;
  meta?: {
    year: number;
    month: number;
    location_id: string;
    isLatest: boolean;
  };
  message?: string;
  error?: string;
}

interface UseLatestPnLBalanceProps {
  location?: string | null;
  enabled?: boolean;
}

/**
 * Hook to fetch the latest PNL Balance
 * 
 * @param location - Optional location ID to filter by, or 'all' for all locations
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Query result with latest PNL Balance data
 */
export function useLatestPnLBalance({ 
  location = 'all', 
  enabled = true 
}: UseLatestPnLBalanceProps = {}) {
  return useQuery<LatestPnLBalanceResponse>({
    queryKey: ['pnl-balance', 'latest', location],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location && location !== 'all') {
        params.append('location', location);
      }

      const response = await fetch(`/api/finance/pnl-balance/latest?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch latest PNL Balance');
      }
      
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}




