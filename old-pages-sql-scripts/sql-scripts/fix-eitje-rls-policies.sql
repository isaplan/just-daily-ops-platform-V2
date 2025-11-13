-- ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
-- Migrated: 2025-11-13 01:18:49
-- Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/scripts/sql/fix-eitje-rls-policies.sql

-- Fix Eitje RLS policies to allow API routes to insert data
-- Run this SQL in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_environments;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_environments;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_environments;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_teams;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_teams;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_teams;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_users;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_users;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_users;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_shift_types;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_shift_types;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_shift_types;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_planning_shifts_raw;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_planning_shifts_raw;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_planning_shifts_raw;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_time_registration_shifts_raw;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_time_registration_shifts_raw;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_time_registration_shifts_raw;

DROP POLICY IF EXISTS "Allow authenticated read access" ON eitje_revenue_days_raw;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON eitje_revenue_days_raw;
DROP POLICY IF EXISTS "Allow authenticated update access" ON eitje_revenue_days_raw;

-- Create simple policies that allow all operations
CREATE POLICY "Allow all operations" ON eitje_environments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_teams
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_shift_types
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_planning_shifts_raw
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_time_registration_shifts_raw
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON eitje_revenue_days_raw
  FOR ALL USING (true) WITH CHECK (true);

