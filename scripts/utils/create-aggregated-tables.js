// Create aggregated tables for Eitje data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating aggregated tables...');
    
    // Create labor hours aggregated table
    const { error: laborError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS eitje_labor_hours_aggregated (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          environment_id INTEGER NOT NULL,
          total_hours_worked DECIMAL(10,2) DEFAULT 0,
          total_wage_cost DECIMAL(10,2) DEFAULT 0,
          employee_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(date, environment_id)
        );
      `
    });
    
    if (laborError) {
      console.error('Error creating labor table:', laborError);
    } else {
      console.log('✅ Created eitje_labor_hours_aggregated table');
    }
    
    // Create revenue days aggregated table
    const { error: revenueError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS eitje_revenue_days_aggregated (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          environment_id INTEGER NOT NULL,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          transaction_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(date, environment_id)
        );
      `
    });
    
    if (revenueError) {
      console.error('Error creating revenue table:', revenueError);
    } else {
      console.log('✅ Created eitje_revenue_days_aggregated table');
    }
    
    console.log('Tables created successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTables();


