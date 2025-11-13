import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /admin/create-aggregated-tables] Creating aggregated tables...');
    
    const supabase = await createClient();
    
    // Create the main aggregated table
    const { error: createMainError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            location_id uuid NOT NULL REFERENCES public.locations(id),
            year INT NOT NULL,
            month INT NOT NULL,
            
            -- Summary COGS Columns
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
            
            -- Detailed COGS Columns
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
            
            -- Metadata
            import_id uuid REFERENCES public.powerbi_pnl_imports(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            aggregated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Constraints
            UNIQUE(location_id, year, month)
        );
      `
    });
    
    if (createMainError) {
      console.error('[API /admin/create-aggregated-tables] Error creating main table:', createMainError);
      return NextResponse.json({
        success: false,
        error: `Failed to create main table: ${createMainError.message}`
      }, { status: 500 });
    }
    
    // Create the subcategories table
    const { error: createSubError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated_subcategories (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            aggregated_id uuid NOT NULL REFERENCES public.powerbi_pnl_aggregated(id) ON DELETE CASCADE,
            main_category TEXT NOT NULL,
            subcategory TEXT NOT NULL,
            gl_account TEXT NOT NULL,
            amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
            
            UNIQUE(aggregated_id, subcategory)
        );
      `
    });
    
    if (createSubError) {
      console.error('[API /admin/create-aggregated-tables] Error creating subcategories table:', createSubError);
      return NextResponse.json({
        success: false,
        error: `Failed to create subcategories table: ${createSubError.message}`
      }, { status: 500 });
    }
    
    // Enable RLS
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.powerbi_pnl_aggregated ENABLE ROW LEVEL SECURITY;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.powerbi_pnl_aggregated_subcategories ENABLE ROW LEVEL SECURITY;' });
    
    console.log('[API /admin/create-aggregated-tables] Tables created successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Aggregated tables created successfully'
    });
    
  } catch (error) {
    console.error('[API /admin/create-aggregated-tables] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


