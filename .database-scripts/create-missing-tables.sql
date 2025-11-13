-- Create missing tables for Just Daily Ops Platform
-- Run this in your Supabase SQL Editor

-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PowerBI P&L Data table
CREATE TABLE IF NOT EXISTS powerbi_pnl_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  import_id TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  gl_account TEXT,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- P&L Line Items table
CREATE TABLE IF NOT EXISTS pnl_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  import_id TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category_level_1 TEXT NOT NULL,
  category_level_2 TEXT,
  category_level_3 TEXT,
  gl_account TEXT,
  gl_description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- P&L Monthly Summary table
CREATE TABLE IF NOT EXISTS pnl_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_costs DECIMAL(15,2) DEFAULT 0,
  gross_profit DECIMAL(15,2) DEFAULT 0,
  operating_expenses DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Sync Logs table
CREATE TABLE IF NOT EXISTS api_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  sync_type TEXT NOT NULL, -- 'daily', 'range', 'manual'
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_data_location_period ON powerbi_pnl_data(location_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pnl_line_items_location_period ON pnl_line_items(location_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pnl_monthly_summary_location_period ON pnl_monthly_summary(location_id, year, month);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_location_status ON api_sync_logs(location_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE powerbi_pnl_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now)
CREATE POLICY "Allow all operations on powerbi_pnl_data" ON powerbi_pnl_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on pnl_line_items" ON pnl_line_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on pnl_monthly_summary" ON pnl_monthly_summary FOR ALL USING (true);
CREATE POLICY "Allow all operations on api_sync_logs" ON api_sync_logs FOR ALL USING (true);

-- Add updated_at trigger for pnl_monthly_summary
CREATE TRIGGER update_pnl_monthly_summary_updated_at 
  BEFORE UPDATE ON pnl_monthly_summary 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
