-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-table-manual.sql

-- Run this SQL directly in your Supabase SQL Editor
-- This will create the bork_sales_aggregated table

CREATE TABLE IF NOT EXISTS public.bork_sales_aggregated (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id),
    date DATE NOT NULL,
    
    -- Overall metrics
    total_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue_excl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_revenue_incl_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    avg_price DECIMAL(10,2) DEFAULT 0,
    
    -- VAT breakdown (Netherlands: 9% food, 21% drinks)
    vat_9_base DECIMAL(12,2) DEFAULT 0,
    vat_9_amount DECIMAL(10,2) DEFAULT 0,
    vat_21_base DECIMAL(12,2) DEFAULT 0,
    vat_21_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Product metrics
    product_count INTEGER DEFAULT 0,
    unique_products INTEGER DEFAULT 0,
    top_category TEXT,
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(location_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_id ON public.bork_sales_aggregated(location_id);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_date ON public.bork_sales_aggregated(date);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_date ON public.bork_sales_aggregated(location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_created_at ON public.bork_sales_aggregated(created_at);

-- Enable RLS
ALTER TABLE public.bork_sales_aggregated ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access" ON public.bork_sales_aggregated
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write access" ON public.bork_sales_aggregated
    FOR ALL USING (auth.role() = 'authenticated');

