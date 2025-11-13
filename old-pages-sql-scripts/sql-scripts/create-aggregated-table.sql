-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-aggregated-table.sql

-- Create aggregated PowerBI P&L data table
-- This table stores pre-calculated monthly totals for better performance

CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Revenue
  netto_omzet NUMERIC(12,2) NOT NULL DEFAULT 0,
  opbrengst_vorderingen NUMERIC(12,2) DEFAULT 0,
  
  -- Cost of Goods Sold (COGS)
  kostprijs_omzet NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Personnel Costs
  lasten_personeel NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Other Business Costs (Overige bedrijfskosten)
  overige_bedrijfskosten NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Depreciation
  afschrijvingen NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Financial
  financiele_baten_lasten NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Calculated totals
  total_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  resultaat NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  import_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(location_id, year, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_location_year_month 
  ON public.powerbi_pnl_aggregated_data(location_id, year, month);

CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_year_month 
  ON public.powerbi_pnl_aggregated_data(year, month);

-- Enable RLS
ALTER TABLE public.powerbi_pnl_aggregated_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view aggregated P&L data"
  ON public.powerbi_pnl_aggregated_data FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert aggregated P&L data"
  ON public.powerbi_pnl_aggregated_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update aggregated P&L data"
  ON public.powerbi_pnl_aggregated_data FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete aggregated P&L data"
  ON public.powerbi_pnl_aggregated_data FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_powerbi_pnl_aggregated_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_powerbi_pnl_aggregated_updated_at
  BEFORE UPDATE ON public.powerbi_pnl_aggregated_data
  FOR EACH ROW
  EXECUTE FUNCTION update_powerbi_pnl_aggregated_updated_at();