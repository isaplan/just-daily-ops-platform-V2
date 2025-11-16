-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/create-aggregated-tables.sql

-- Create powerbi_pnl_aggregated table with dual-layer COGS structure
-- Summary COGS (Revenue Food/Beverage, Cost of Sales, Labor Contract/Flex) + Detailed GL accounts

CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id uuid NOT NULL REFERENCES public.locations(id),
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Summary COGS Columns (for high-level analysis)
    revenue_food NUMERIC(18, 2) NOT NULL DEFAULT 0,
    revenue_beverage NUMERIC(18, 2) NOT NULL DEFAULT 0,
    revenue_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    cost_of_sales_food NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cost_of_sales_beverage NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cost_of_sales_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    labor_contract NUMERIC(18, 2) NOT NULL DEFAULT 0,
    labor_flex NUMERIC(18, 2) NOT NULL DEFAULT 0,
    labor_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    other_costs_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    opbrengst_vorderingen NUMERIC(18, 2) NOT NULL DEFAULT 0,
    resultaat NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    -- Detailed COGS Columns (for granular analysis)
    netto_omzet_uit_levering_geproduceerd NUMERIC(18, 2) NOT NULL DEFAULT 0,
    netto_omzet_verkoop_handelsgoederen NUMERIC(18, 2) NOT NULL DEFAULT 0,
    inkoopwaarde_handelsgoederen NUMERIC(18, 2) NOT NULL DEFAULT 0,
    lonen_en_salarissen NUMERIC(18, 2) NOT NULL DEFAULT 0,
    huisvestingskosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    exploitatie_kosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    verkoop_kosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    autokosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    kantoorkosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    assurantiekosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    accountantskosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    administratieve_lasten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    andere_kosten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    afschrijvingen NUMERIC(18, 2) NOT NULL DEFAULT 0,
    financiele_baten_lasten NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    -- Legacy totals (for compatibility)
    total_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_cost_of_sales NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_labor_costs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_other_costs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_costs NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    -- Metadata
    import_id uuid,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aggregated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(location_id, year, month)
);

-- Create powerbi_pnl_aggregated_subcategories table for subcategory detail storage
CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated_subcategories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregated_id uuid NOT NULL REFERENCES public.powerbi_pnl_aggregated(id) ON DELETE CASCADE,
    main_category TEXT NOT NULL, -- e.g., "Revenue Food", "Cost of Sales Beverage"
    subcategory TEXT NOT NULL, -- e.g., "Omzet snacks (btw laag)"
    gl_account TEXT NOT NULL, -- The GL account name
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    
    -- Constraints
    UNIQUE(aggregated_id, subcategory)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_location_year_month ON public.powerbi_pnl_aggregated(location_id, year, month);
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_subcategories_aggregated_id ON public.powerbi_pnl_aggregated_subcategories(aggregated_id);
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_subcategories_main_category ON public.powerbi_pnl_aggregated_subcategories(main_category);

-- Enable RLS
ALTER TABLE public.powerbi_pnl_aggregated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_pnl_aggregated_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for powerbi_pnl_aggregated
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.powerbi_pnl_aggregated
            FOR SELECT USING (TRUE);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated' AND policyname = 'Enable insert access for authenticated users') THEN
        CREATE POLICY "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated' AND policyname = 'Enable update access for authenticated users') THEN
        CREATE POLICY "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated' AND policyname = 'Enable delete access for authenticated users') THEN
        CREATE POLICY "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- RLS Policies for powerbi_pnl_aggregated_subcategories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated_subcategories' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.powerbi_pnl_aggregated_subcategories
            FOR SELECT USING (TRUE);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated_subcategories' AND policyname = 'Enable insert access for authenticated users') THEN
        CREATE POLICY "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated_subcategories' AND policyname = 'Enable update access for authenticated users') THEN
        CREATE POLICY "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'powerbi_pnl_aggregated_subcategories' AND policyname = 'Enable delete access for authenticated users') THEN
        CREATE POLICY "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;
