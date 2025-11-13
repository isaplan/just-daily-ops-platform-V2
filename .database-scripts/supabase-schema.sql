-- Supabase Database Schema for Just Daily Ops Platform
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Netherlands',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Credentials table
CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id),
  provider TEXT NOT NULL, -- 'bork', 'eitje', etc.
  api_key TEXT,
  api_secret TEXT,
  base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Imports table (main import records)
CREATE TABLE IF NOT EXISTS sales_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id),
  import_date DATE NOT NULL,
  sales_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  records_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Import Items table (individual line items)
CREATE TABLE IF NOT EXISTS sales_import_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_import_id UUID REFERENCES sales_imports(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  product_name TEXT NOT NULL,
  product_sku TEXT,
  category TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  sale_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork Sales Data table (raw Bork API data)
CREATE TABLE IF NOT EXISTS bork_sales_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id),
  import_id TEXT,
  date DATE NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  category TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  revenue DECIMAL(12,2) NOT NULL,
  revenue_ex_vat DECIMAL(12,2) NOT NULL,
  revenue_inc_vat DECIMAL(12,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PowerBI P&L Data table
CREATE TABLE IF NOT EXISTS powerbi_pnl_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_imports_location_date ON sales_imports(location_id, sales_date);
CREATE INDEX IF NOT EXISTS idx_sales_import_items_import_id ON sales_import_items(sales_import_id);
CREATE INDEX IF NOT EXISTS idx_sales_import_items_timestamp ON sales_import_items(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_bork_sales_data_location_date ON bork_sales_data(location_id, date);
CREATE INDEX IF NOT EXISTS idx_powerbi_pnl_data_location_period ON powerbi_pnl_data(location_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pnl_line_items_location_period ON pnl_line_items(location_id, year, month);

-- Insert sample locations
INSERT INTO locations (id, name, code, city) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Haagse Nieuwe', 'HN', 'Den Haag'),
  ('00000000-0000-0000-0000-000000000002', 'Bar Bea', 'BB', 'Den Haag'),
  ('00000000-0000-0000-0000-000000000003', 'L''Amour Toujours', 'LAT', 'Den Haag')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerbi_pnl_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_monthly_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - adjust based on your auth needs)
CREATE POLICY "Allow all operations on locations" ON locations FOR ALL USING (true);
CREATE POLICY "Allow all operations on api_credentials" ON api_credentials FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales_imports" ON sales_imports FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales_import_items" ON sales_import_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on bork_sales_data" ON bork_sales_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on powerbi_pnl_data" ON powerbi_pnl_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on pnl_line_items" ON pnl_line_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on pnl_monthly_summary" ON pnl_monthly_summary FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE ON api_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_imports_updated_at BEFORE UPDATE ON sales_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pnl_monthly_summary_updated_at BEFORE UPDATE ON pnl_monthly_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
