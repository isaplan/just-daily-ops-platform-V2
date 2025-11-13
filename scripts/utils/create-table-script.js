const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('Creating powerbi_pnl_aggregated_data table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.powerbi_pnl_aggregated_data (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          location_id UUID NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
          netto_omzet NUMERIC(12,2) NOT NULL DEFAULT 0,
          opbrengst_vorderingen NUMERIC(12,2) DEFAULT 0,
          kostprijs_omzet NUMERIC(12,2) NOT NULL DEFAULT 0,
          lasten_personeel NUMERIC(12,2) NOT NULL DEFAULT 0,
          overige_bedrijfskosten NUMERIC(12,2) NOT NULL DEFAULT 0,
          afschrijvingen NUMERIC(12,2) NOT NULL DEFAULT 0,
          financiele_baten_lasten NUMERIC(12,2) NOT NULL DEFAULT 0,
          total_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
          resultaat NUMERIC(12,2) NOT NULL DEFAULT 0,
          import_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(location_id, year, month)
        );
      `
    });

    if (error) {
      console.error('Error creating table:', error);
    } else {
      console.log('Table created successfully!');
    }

    // Create indexes
    console.log('Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_location_year_month 
        ON public.powerbi_pnl_aggregated_data(location_id, year, month);
        
        CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_aggregated_year_month 
        ON public.powerbi_pnl_aggregated_data(year, month);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
    } else {
      console.log('Indexes created successfully!');
    }

    // Enable RLS
    console.log('Enabling RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.powerbi_pnl_aggregated_data ENABLE ROW LEVEL SECURITY;
      `
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('RLS enabled successfully!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTable();

