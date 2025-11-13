-- COMPLETE REBUILD: CREATE ALL 65 TABLES
-- Run this in Supabase SQL Editor to create all missing tables

-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- API Credentials
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    api_key TEXT,
    api_secret TEXT,
    base_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Sync Logs
CREATE TABLE IF NOT EXISTS api_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_credential_id UUID,
    sync_type TEXT,
    status TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork API Credentials
CREATE TABLE IF NOT EXISTS bork_api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    api_key TEXT,
    api_secret TEXT,
    base_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork API Sync Logs
CREATE TABLE IF NOT EXISTS bork_api_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    sync_type TEXT,
    status TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork Backfill Progress
CREATE TABLE IF NOT EXISTS bork_backfill_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    backfill_type TEXT,
    status TEXT,
    progress_percentage INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork Backfill Queue
CREATE TABLE IF NOT EXISTS bork_backfill_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    backfill_type TEXT,
    status TEXT,
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork Sales Data
CREATE TABLE IF NOT EXISTS bork_sales_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    sale_date DATE,
    product_name TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bork Sync Config
CREATE TABLE IF NOT EXISTS bork_sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency TEXT DEFAULT 'daily',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Combined Products
CREATE TABLE IF NOT EXISTS combined_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    matched_to_type TEXT,
    matched_product_id UUID,
    matched_recipe_id UUID,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    division TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Waste
CREATE TABLE IF NOT EXISTS daily_waste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL,
    product_id UUID,
    date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT,
    reason TEXT,
    reason_notes TEXT,
    cost DECIMAL(10,2),
    recorded_by_user_id UUID,
    storage_location_id UUID,
    photo_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Imports
CREATE TABLE IF NOT EXISTS data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type TEXT NOT NULL,
    location_id UUID,
    file_name TEXT,
    uploaded_by_user_id UUID,
    status TEXT DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    error_message TEXT,
    date_range_start DATE,
    date_range_end DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Eitje Backfill Progress
CREATE TABLE IF NOT EXISTS eitje_backfill_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    backfill_type TEXT,
    status TEXT,
    progress_percentage INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Backfill Queue
CREATE TABLE IF NOT EXISTS eitje_backfill_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    backfill_type TEXT,
    status TEXT,
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Environments
CREATE TABLE IF NOT EXISTS eitje_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_url TEXT,
    api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Planning Shifts
CREATE TABLE IF NOT EXISTS eitje_planning_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    shift_date DATE,
    shift_type_id UUID,
    start_time TIME,
    end_time TIME,
    employee_id UUID,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Revenue Days
CREATE TABLE IF NOT EXISTS eitje_revenue_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    revenue_date DATE,
    total_revenue DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Shift Types
CREATE TABLE IF NOT EXISTS eitje_shift_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    default_start_time TIME,
    default_end_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Shifts
CREATE TABLE IF NOT EXISTS eitje_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    employee_id UUID,
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Sync Config
CREATE TABLE IF NOT EXISTS eitje_sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency TEXT DEFAULT 'daily',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Teams
CREATE TABLE IF NOT EXISTS eitje_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Time Registration Shifts
CREATE TABLE IF NOT EXISTS eitje_time_registration_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID,
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    break_duration INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eitje Users
CREATE TABLE IF NOT EXISTS eitje_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eitje_user_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution Logs
CREATE TABLE IF NOT EXISTS execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT,
    execution_id UUID,
    status TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Chat Messages
CREATE TABLE IF NOT EXISTS financial_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    user_id UUID,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Chat Sessions
CREATE TABLE IF NOT EXISTS financial_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Insights
CREATE TABLE IF NOT EXISTS financial_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    value DECIMAL(15,2),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    report_type TEXT,
    report_name TEXT,
    report_data JSONB,
    generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import Validation Logs
CREATE TABLE IF NOT EXISTS import_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID,
    validation_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations (already exists, but ensure it has all columns)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Member Invitations
CREATE TABLE IF NOT EXISTS member_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT,
    location_id UUID,
    invited_by_user_id UUID,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Item Waste
CREATE TABLE IF NOT EXISTS menu_item_waste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID,
    waste_date DATE,
    quantity DECIMAL(10,2),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_section_id UUID,
    product_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Product Price History
CREATE TABLE IF NOT EXISTS menu_product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_section_product_id UUID,
    menu_version_id UUID,
    product_id UUID,
    field_changed TEXT,
    old_value DECIMAL(10,2),
    new_value DECIMAL(10,2),
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by_user_id UUID,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Section Products
CREATE TABLE IF NOT EXISTS menu_section_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_section_id UUID,
    product_id UUID,
    display_order INTEGER DEFAULT 0,
    product_name TEXT,
    category TEXT,
    description TEXT,
    cost_price DECIMAL(10,2),
    btw_rate INTEGER,
    supplier TEXT,
    waste_percentage DECIMAL(5,2),
    target_margin_percentage DECIMAL(5,2),
    suggested_price_ex_btw DECIMAL(10,2),
    suggested_price_inc_btw DECIMAL(10,2),
    consumer_price DECIMAL(10,2),
    is_confirmed BOOLEAN DEFAULT false,
    added_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Sections
CREATE TABLE IF NOT EXISTS menu_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_version_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Versions
CREATE TABLE IF NOT EXISTS menu_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT false,
    menu_items JSONB,
    status TEXT DEFAULT 'draft',
    description TEXT,
    created_by_user_id UUID,
    approved_by_user_id UUID,
    published_by_user_id UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Stock Count Items
CREATE TABLE IF NOT EXISTS monthly_stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID,
    product_id UUID,
    expected_quantity DECIMAL(10,2),
    actual_quantity DECIMAL(10,2),
    variance DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Stock Counts
CREATE TABLE IF NOT EXISTS monthly_stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    count_date DATE,
    status TEXT DEFAULT 'in_progress',
    started_by_user_id UUID,
    completed_by_user_id UUID,
    confirmed_by_user_id UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_value_ex_btw DECIMAL(15,2),
    total_value_btw_high DECIMAL(15,2),
    total_value_btw_low DECIMAL(15,2),
    total_value_inc_btw DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Groups
CREATE TABLE IF NOT EXISTS order_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    checked_at TIMESTAMP WITH TIME ZONE,
    location_id UUID,
    created_by_user_id UUID,
    checked_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order History
CREATE TABLE IF NOT EXISTS order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID,
    action TEXT,
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    quantity DECIMAL(10,2),
    order_date TIMESTAMP WITH TIME ZONE,
    order_group_id UUID,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Package Migrations
CREATE TABLE IF NOT EXISTS package_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT,
    version TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Package Usage Logs
CREATE TABLE IF NOT EXISTS package_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PnL Line Items (already exists, but ensure it has all columns)
-- This table already exists with the correct structure

-- PnL Monthly Summary (already exists, but ensure it has all columns)
-- This table already exists with the correct structure

-- PnL Reports
CREATE TABLE IF NOT EXISTS pnl_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    report_name TEXT,
    report_data JSONB,
    generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PowerBI PnL Data (already exists, but ensure it has all columns)
-- This table already exists with the correct structure

-- Product Locations
CREATE TABLE IF NOT EXISTS product_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    location_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Recipe Ingredients
CREATE TABLE IF NOT EXISTS product_recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID,
    ingredient_product_id UUID,
    quantity_ml DECIMAL(10,2),
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Recipes
CREATE TABLE IF NOT EXISTS product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finished_product_name TEXT,
    recipe_type TEXT,
    unit_size_ml DECIMAL(10,2),
    units_per_bottle DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    division TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hoofdcategorie TEXT,
    productcategorie TEXT,
    product TEXT,
    leverancier TEXT,
    verpakking TEXT,
    aantal_per_verpakking INTEGER,
    bestel_eenheid TEXT,
    kost_prijs_per_stuk DECIMAL(10,2),
    btw INTEGER,
    prijs_ex_btw DECIMAL(10,2),
    prijs_in_btw DECIMAL(10,2),
    prijs_ex_btw_calculated DECIMAL(10,2),
    prijs_in_btw_calculated DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    division TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles (already exists, but ensure it has all columns)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Report Insights
CREATE TABLE IF NOT EXISTS report_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    value DECIMAL(15,2),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID,
    product_id UUID,
    quantity DECIMAL(10,2),
    expected_product_id UUID,
    reason TEXT,
    action_taken TEXT,
    status TEXT DEFAULT 'pending',
    approved_by_user_id UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    supplier_return_status TEXT,
    stock_adjusted BOOLEAN DEFAULT false,
    stock_adjustment_notes TEXT,
    transfer_to_location_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_date TIMESTAMP WITH TIME ZONE,
    order_group_id UUID,
    location_id UUID,
    created_by_user_id UUID,
    approved_by_user_id UUID,
    status TEXT DEFAULT 'pending',
    return_type TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roadmap Items
CREATE TABLE IF NOT EXISTS roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    user_story TEXT,
    expected_results TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    department TEXT,
    category TEXT,
    triggers TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Import Items (already exists, but ensure it has all columns)
ALTER TABLE sales_import_items ADD COLUMN IF NOT EXISTS btw_percentage INTEGER;

-- Sales Imports (already exists, but ensure it has all columns)
ALTER TABLE sales_imports ADD COLUMN IF NOT EXISTS date_range_end DATE;

-- Stock Levels
CREATE TABLE IF NOT EXISTS stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    location_id UUID,
    current_stock DECIMAL(10,2) DEFAULT 0,
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    maximum_stock DECIMAL(10,2),
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    location_id UUID,
    transaction_type TEXT,
    quantity DECIMAL(10,2),
    reason TEXT,
    reference_id UUID,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage Locations
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Orders
CREATE TABLE IF NOT EXISTS supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    location_id UUID,
    order_date DATE,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    info_email TEXT,
    order_email TEXT,
    website TEXT,
    online_shop TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_combined_products_updated_at BEFORE UPDATE ON combined_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_section_products_updated_at BEFORE UPDATE ON menu_section_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_sections_updated_at BEFORE UPDATE ON menu_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_versions_updated_at BEFORE UPDATE ON menu_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_stock_counts_updated_at BEFORE UPDATE ON monthly_stock_counts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_groups_updated_at BEFORE UPDATE ON order_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_recipes_updated_at BEFORE UPDATE ON product_recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON roadmap_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_imports_updated_at BEFORE UPDATE ON sales_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_api_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_backfill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_backfill_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE combined_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_backfill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_backfill_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_planning_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_revenue_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_time_registration_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eitje_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations" ON api_credentials FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON api_sync_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_api_credentials FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_api_sync_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_backfill_progress FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_backfill_queue FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_sales_data FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON bork_sync_config FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON combined_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON comments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON daily_waste FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON data_imports FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_backfill_progress FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_backfill_queue FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_environments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_planning_shifts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_revenue_days FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_shift_types FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_shifts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_sync_config FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_teams FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_time_registration_shifts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON eitje_users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON execution_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON financial_chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON financial_chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON financial_insights FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON financial_reports FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON import_validation_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON member_invitations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_item_waste FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_product_price_history FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_section_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_sections FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON menu_versions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON monthly_stock_count_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON monthly_stock_counts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON order_groups FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON order_history FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON package_migrations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON package_usage_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON pnl_reports FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON product_locations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON product_recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON product_recipes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON report_insights FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON return_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON returns FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON roadmap_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON stock_levels FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON stock_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON storage_locations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON supplier_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON user_roles FOR ALL USING (true);

-- Success message
SELECT 'All 65 tables created successfully!' as result;
