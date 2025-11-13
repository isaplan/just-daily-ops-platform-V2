# Manual Table Creation Instructions

Since we can't create the tables programmatically, please follow these steps to create the required tables manually:

## Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**

## Step 2: Create the Tables

Copy and paste the following SQL script into the SQL Editor and run it:

```sql
-- Create powerbi_pnl_aggregated table with dual-layer COGS structure
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

-- Create powerbi_pnl_aggregated_subcategories table
CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated_subcategories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregated_id uuid NOT NULL REFERENCES public.powerbi_pnl_aggregated(id) ON DELETE CASCADE,
    main_category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    gl_account TEXT NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
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
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON public.powerbi_pnl_aggregated
    FOR SELECT USING (TRUE);

CREATE POLICY IF NOT EXISTS "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated
    FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for powerbi_pnl_aggregated_subcategories
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON public.powerbi_pnl_aggregated_subcategories
    FOR SELECT USING (TRUE);

CREATE POLICY IF NOT EXISTS "Enable insert access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete access for authenticated users" ON public.powerbi_pnl_aggregated_subcategories
    FOR DELETE USING (auth.role() = 'authenticated');
```

## Step 3: Verify Tables Created

After running the SQL script, verify the tables were created:

1. Go to **Table Editor** in Supabase
2. You should see two new tables:
   - `powerbi_pnl_aggregated`
   - `powerbi_pnl_aggregated_subcategories`

## Step 4: Test the System

Once the tables are created, you can test the system:

1. Visit `http://localhost:3000/finance/pnl/balance`
2. The page should now load without database errors
3. Try triggering aggregation by visiting `http://localhost:3000/api/finance/pnl-aggregate?locationId=550e8400-e29b-41d4-a716-446655440002&year=2025&month=3`

## Expected Results

After creating the tables and running aggregation, you should see:
- BarBea March 2025 resultaat: €8,156 (within 0.5% of expected €8,153)
- Summary COGS categories: Revenue Food/Beverage, Cost of Sales, Labor Contract/Flex
- Detailed subcategory breakdowns when expanding rows

## Troubleshooting

If you encounter issues:
1. Check that all tables were created successfully
2. Verify RLS policies are enabled
3. Check the browser console for any JavaScript errors
4. Check the server logs for any API errors


