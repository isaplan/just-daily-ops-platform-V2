import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /setup-aggregated-table] Creating bork_sales_aggregated table...');
    
    const supabase = await createClient();
    
    // Create the table using direct SQL execution
    const createTableSQL = `
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
    `;
    
    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    
    if (createError) {
      console.error('[API /setup-aggregated-table] Create table error:', createError);
      return NextResponse.json({
        success: false,
        error: `Failed to create table: ${createError.message}`
      }, { status: 500 });
    }
    
    // Create indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_id ON public.bork_sales_aggregated(location_id);
      CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_date ON public.bork_sales_aggregated(date);
      CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_location_date ON public.bork_sales_aggregated(location_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_bork_sales_agg_created_at ON public.bork_sales_aggregated(created_at);
    `;
    
    const { error: indexError } = await supabase.rpc('exec', { sql: indexSQL });
    
    if (indexError) {
      console.error('[API /setup-aggregated-table] Create indexes error:', indexError);
      return NextResponse.json({
        success: false,
        error: `Failed to create indexes: ${indexError.message}`
      }, { status: 500 });
    }
    
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', { 
      sql: 'ALTER TABLE public.bork_sales_aggregated ENABLE ROW LEVEL SECURITY;' 
    });
    
    if (rlsError) {
      console.error('[API /setup-aggregated-table] Enable RLS error:', rlsError);
      return NextResponse.json({
        success: false,
        error: `Failed to enable RLS: ${rlsError.message}`
      }, { status: 500 });
    }
    
    // Create RLS policies
    const policySQL = `
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'bork_sales_aggregated' 
              AND policyname = 'Allow authenticated read access'
          ) THEN
              CREATE POLICY "Allow authenticated read access" ON public.bork_sales_aggregated
                  FOR SELECT USING (auth.role() = 'authenticated');
          END IF;
          
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'bork_sales_aggregated' 
              AND policyname = 'Allow authenticated write access'
          ) THEN
              CREATE POLICY "Allow authenticated write access" ON public.bork_sales_aggregated
                  FOR ALL USING (auth.role() = 'authenticated');
          END IF;
      END $$;
    `;
    
    const { error: policyError } = await supabase.rpc('exec', { sql: policySQL });
    
    if (policyError) {
      console.error('[API /setup-aggregated-table] Create policies error:', policyError);
      return NextResponse.json({
        success: false,
        error: `Failed to create policies: ${policyError.message}`
      }, { status: 500 });
    }
    
    console.log('[API /setup-aggregated-table] Successfully created bork_sales_aggregated table');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully created bork_sales_aggregated table with indexes and RLS policies'
    });
    
  } catch (error) {
    console.error('[API /setup-aggregated-table] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
