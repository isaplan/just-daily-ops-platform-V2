-- ========================================
-- MIGRATE EXISTING USERS AND TEAMS TO UNIFIED TABLES
-- ========================================
-- This script migrates existing Eitje and Bork users/teams to the unified system
-- Run this AFTER running the create_unified_users_teams.sql migration

DO $$
DECLARE
  unified_user_id UUID;
  unified_team_id UUID;
  location_uuid UUID;
  eitje_env_record RECORD;
  eitje_user_record RECORD;
  eitje_team_record RECORD;
  bork_user_record RECORD;
BEGIN
  RAISE NOTICE 'Starting migration of existing users and teams...';

  -- ========================================
  -- 1. MIGRATE EITJE USERS
  -- ========================================
  RAISE NOTICE 'Migrating Eitje users...';
  
  FOR eitje_user_record IN 
    SELECT 
      eu.id,
      eu.eitje_id,
      eu.first_name,
      eu.last_name,
      eu.email,
      eu.phone,
      eu.employee_number,
      eu.hire_date,
      eu.is_active,
      eu.raw_data
    FROM eitje_users eu
  LOOP
    -- Create unified user if not exists (match by email or name)
    SELECT id INTO unified_user_id
    FROM unified_users
    WHERE email = eitje_user_record.email
       OR (first_name = eitje_user_record.first_name 
           AND last_name = eitje_user_record.last_name)
    LIMIT 1;

    -- If no match found, create new unified user
    IF unified_user_id IS NULL THEN
      INSERT INTO unified_users (
        first_name,
        last_name,
        email,
        phone,
        employee_number,
        hire_date,
        is_active
      ) VALUES (
        eitje_user_record.first_name,
        eitje_user_record.last_name,
        eitje_user_record.email,
        eitje_user_record.phone,
        eitje_user_record.employee_number,
        eitje_user_record.hire_date,
        eitje_user_record.is_active
      ) RETURNING id INTO unified_user_id;
    END IF;

    -- Create system mapping
    INSERT INTO user_system_mappings (
      unified_user_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_user_id,
      'eitje',
      eitje_user_record.eitje_id::TEXT,
      eitje_user_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    RAISE NOTICE 'Migrated Eitje user % (eitje_id: %) to unified user %', 
      COALESCE(eitje_user_record.first_name || ' ' || eitje_user_record.last_name, 'Unknown'),
      eitje_user_record.eitje_id,
      unified_user_id;
  END LOOP;

  -- ========================================
  -- 2. MIGRATE BORK USERS
  -- ========================================
  RAISE NOTICE 'Migrating Bork users...';
  
  FOR bork_user_record IN 
    SELECT 
      bu.id,
      bu.location_id,
      bu.bork_id,
      bu.name,
      bu.email,
      bu.role,
      bu.raw_data
    FROM bork_users bu
  LOOP
    -- Try to find existing unified user by email or create new
    SELECT id INTO unified_user_id
    FROM unified_users
    WHERE email = bork_user_record.email
    LIMIT 1;

    -- If no match found, create new unified user
    IF unified_user_id IS NULL THEN
      -- Parse name (assuming format: "First Last")
      INSERT INTO unified_users (
        first_name,
        last_name,
        email,
        is_active
      ) VALUES (
        SPLIT_PART(bork_user_record.name, ' ', 1),
        SPLIT_PART(bork_user_record.name, ' ', 2),
        bork_user_record.email,
        true
      ) RETURNING id INTO unified_user_id;
    END IF;

    -- Create system mapping
    INSERT INTO user_system_mappings (
      unified_user_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_user_id,
      'bork',
      bork_user_record.bork_id::TEXT,
      bork_user_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    -- Link user to location
    IF bork_user_record.location_id IS NOT NULL THEN
      INSERT INTO user_locations (
        unified_user_id,
        location_id,
        role,
        is_active
      ) VALUES (
        unified_user_id,
        bork_user_record.location_id,
        bork_user_record.role,
        true
      ) ON CONFLICT (unified_user_id, location_id) DO UPDATE
      SET role = EXCLUDED.role,
          updated_at = NOW();
    END IF;

    RAISE NOTICE 'Migrated Bork user % (bork_id: %) to unified user %', 
      bork_user_record.name,
      bork_user_record.bork_id,
      unified_user_id;
  END LOOP;

  -- ========================================
  -- 3. MIGRATE EITJE TEAMS
  -- ========================================
  RAISE NOTICE 'Migrating Eitje teams...';
  
  FOR eitje_team_record IN 
    SELECT 
      et.id,
      et.eitje_id,
      et.environment_id,
      et.name,
      et.description,
      et.team_type,
      et.is_active,
      et.raw_data
    FROM eitje_teams et
  LOOP
    -- Create unified team
    INSERT INTO unified_teams (
      name,
      description,
      team_type,
      is_active
    ) VALUES (
      eitje_team_record.name,
      eitje_team_record.description,
      eitje_team_record.team_type,
      eitje_team_record.is_active
    ) RETURNING id INTO unified_team_id;

    -- Create system mapping
    INSERT INTO team_system_mappings (
      unified_team_id,
      system_name,
      external_id,
      raw_data
    ) VALUES (
      unified_team_id,
      'eitje',
      eitje_team_record.eitje_id::TEXT,
      eitje_team_record.raw_data
    ) ON CONFLICT (system_name, external_id) DO NOTHING;

    -- Link team to location (via environment_id -> location mapping)
    -- First, we need to find the location UUID that corresponds to the environment_id
    -- This assumes there's a mapping between eitje_environments and locations
    -- You may need to adjust this based on your actual mapping logic
    IF eitje_team_record.environment_id IS NOT NULL THEN
      -- Try to find location by matching environment name with location name
      SELECT l.id INTO location_uuid
      FROM locations l
      INNER JOIN eitje_environments ee ON ee.eitje_id = eitje_team_record.environment_id
      WHERE LOWER(l.name) = LOWER(ee.name)
      LIMIT 1;

      IF location_uuid IS NOT NULL THEN
        INSERT INTO team_locations (
          unified_team_id,
          location_id,
          is_active
        ) VALUES (
          unified_team_id,
          location_uuid,
          eitje_team_record.is_active
        ) ON CONFLICT (unified_team_id, location_id) DO UPDATE
        SET is_active = EXCLUDED.is_active,
            updated_at = NOW();
      END IF;
    END IF;

    RAISE NOTICE 'Migrated Eitje team % (eitje_id: %) to unified team %', 
      eitje_team_record.name,
      eitje_team_record.eitje_id,
      unified_team_id;
  END LOOP;

  -- ========================================
  -- 4. LINK EITJE USERS TO LOCATIONS
  -- ========================================
  RAISE NOTICE 'Linking Eitje users to locations...';
  
  -- This assumes users are linked to locations through their shifts/environments
  -- You may need to adjust this based on your actual data structure
  FOR eitje_user_record IN 
    SELECT DISTINCT
      usm.unified_user_id,
      ee.eitje_id as environment_id
    FROM user_system_mappings usm
    INNER JOIN eitje_users eu ON eu.eitje_id = usm.external_id::INTEGER
    INNER JOIN eitje_time_registration_shifts_raw etrs ON etrs.user_id = eu.eitje_id
    INNER JOIN eitje_environments ee ON ee.eitje_id = etrs.environment_id
    WHERE usm.system_name = 'eitje'
  LOOP
    -- Find location by matching environment name with location name
    SELECT l.id INTO location_uuid
    FROM locations l
    INNER JOIN eitje_environments ee ON ee.eitje_id = eitje_user_record.environment_id
    WHERE LOWER(l.name) = LOWER(ee.name)
    LIMIT 1;

    IF location_uuid IS NOT NULL THEN
      INSERT INTO user_locations (
        unified_user_id,
        location_id,
        is_active
      ) VALUES (
        eitje_user_record.unified_user_id,
        location_uuid,
        true
      ) ON CONFLICT (unified_user_id, location_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;


