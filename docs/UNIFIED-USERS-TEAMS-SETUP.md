# Unified Users and Teams System Setup

## Overview
This system creates a unified user and team management structure that binds all different external user/team IDs (Eitje, Bork, etc.) to single UUIDs and links them to locations.

## Architecture

### Core Tables

1. **unified_users** - Canonical user records (one UUID per actual person)
2. **user_system_mappings** - Maps external system IDs (Eitje, Bork, etc.) to unified user UUIDs
3. **user_locations** - Many-to-many: users can work at multiple locations
4. **unified_teams** - Canonical team records (one UUID per actual team)
5. **team_system_mappings** - Maps external system IDs to unified team UUIDs
6. **team_locations** - Many-to-many: teams can exist at multiple locations
7. **team_members** - Many-to-many: users can be in multiple teams

### Key Features

- **Single Source of Truth**: One UUID per actual user/team, regardless of external system
- **Multi-System Support**: Supports Eitje, Bork, and future systems
- **Location Binding**: Users and teams are linked to locations
- **Flexible Relationships**: Many-to-many relationships for users↔locations, teams↔locations, users↔teams

## Setup Instructions

### Step 1: Create Database Tables

Run the migration file:
```sql
-- File: supabase/migrations/20250103000001_create_unified_users_teams.sql
```

This creates:
- All unified tables
- Indexes for performance
- RLS policies
- Helper functions (`get_unified_user_id`, `get_unified_team_id`)
- Triggers for `updated_at` timestamps

### Step 2: Migrate Existing Data

Run the migration script:
```sql
-- File: scripts/migrate-existing-users-teams.sql
```

This script:
- Migrates Eitje users to unified_users
- Migrates Bork users to unified_users
- Creates system mappings for both systems
- Links users to locations
- Migrates Eitje teams to unified_teams
- Links teams to locations

### Step 3: Verify Migration

Check that data was migrated correctly:

```sql
-- Check unified users
SELECT COUNT(*) FROM unified_users;

-- Check system mappings
SELECT system_name, COUNT(*) 
FROM user_system_mappings 
GROUP BY system_name;

-- Check user locations
SELECT COUNT(*) FROM user_locations;

-- Check unified teams
SELECT COUNT(*) FROM unified_teams;

-- Check team locations
SELECT COUNT(*) FROM team_locations;
```

## Usage Examples

### Get Unified User ID from Eitje ID

```sql
SELECT get_unified_user_id('eitje', '12345');
```

### Get All Users at a Location

```sql
SELECT 
  uu.*,
  l.name as location_name
FROM unified_users uu
INNER JOIN user_locations ul ON ul.unified_user_id = uu.id
INNER JOIN locations l ON l.id = ul.location_id
WHERE l.id = 'your-location-uuid'
  AND ul.is_active = true;
```

### Get All Teams at a Location

```sql
SELECT 
  ut.*,
  l.name as location_name
FROM unified_teams ut
INNER JOIN team_locations tl ON tl.unified_team_id = ut.id
INNER JOIN locations l ON l.id = tl.location_id
WHERE l.id = 'your-location-uuid'
  AND tl.is_active = true;
```

### Get Team Members

```sql
SELECT 
  uu.first_name || ' ' || uu.last_name as user_name,
  ut.name as team_name,
  tm.role as team_role
FROM team_members tm
INNER JOIN unified_users uu ON uu.id = tm.unified_user_id
INNER JOIN unified_teams ut ON ut.id = tm.unified_team_id
WHERE tm.is_active = true;
```

### Get All System IDs for a User

```sql
SELECT 
  usm.system_name,
  usm.external_id
FROM user_system_mappings usm
WHERE usm.unified_user_id = 'user-uuid';
```

## Integration with Existing Tables

### Eitje Integration

When syncing Eitje data:
1. Get unified user ID: `SELECT get_unified_user_id('eitje', eitje_user_id)`
2. If NULL, create new unified user and mapping
3. Link to location via `user_locations`

### Bork Integration

When syncing Bork data:
1. Get unified user ID: `SELECT get_unified_user_id('bork', bork_user_id)`
2. If NULL, create new unified user and mapping
3. Link to location via `user_locations`

## Adding New Systems

To add a new system (e.g., "newpos"):

1. Create system mappings when syncing:
```sql
INSERT INTO user_system_mappings (
  unified_user_id,
  system_name,
  external_id,
  raw_data
) VALUES (
  unified_user_uuid,
  'newpos',
  'external_user_id',
  '{}'::jsonb
);
```

2. Use the helper function:
```sql
SELECT get_unified_user_id('newpos', 'external_user_id');
```

## Best Practices

1. **Always use unified UUIDs** in new tables/features
2. **Create mappings immediately** when syncing external data
3. **Link to locations** when user/team is location-specific
4. **Use is_active flags** to track current vs historical relationships
5. **Use helper functions** instead of direct queries when possible

## Maintenance

### Deactivating Users/Teams

```sql
-- Deactivate user
UPDATE unified_users SET is_active = false WHERE id = 'user-uuid';

-- Deactivate user at specific location
UPDATE user_locations SET is_active = false, end_date = CURRENT_DATE 
WHERE unified_user_id = 'user-uuid' AND location_id = 'location-uuid';

-- Deactivate team
UPDATE unified_teams SET is_active = false WHERE id = 'team-uuid';
```

### Merging Duplicate Users

If you find duplicate unified users (same person):

1. Identify the "primary" user UUID
2. Update all system mappings to point to primary:
```sql
UPDATE user_system_mappings 
SET unified_user_id = 'primary-uuid'
WHERE unified_user_id = 'duplicate-uuid';
```

3. Update all location links:
```sql
UPDATE user_locations 
SET unified_user_id = 'primary-uuid'
WHERE unified_user_id = 'duplicate-uuid';
```

4. Delete the duplicate user:
```sql
DELETE FROM unified_users WHERE id = 'duplicate-uuid';
```

## Troubleshooting

### Issue: No mappings found

**Solution**: Run the migration script to create initial mappings

### Issue: Users not linked to locations

**Solution**: Check the location matching logic in `migrate-existing-users-teams.sql` - you may need to adjust the matching criteria

### Issue: Duplicate users

**Solution**: Use the merge procedure above to consolidate duplicates

## Related Files

- Migration: `supabase/migrations/20250103000001_create_unified_users_teams.sql`
- Data Migration: `scripts/migrate-existing-users-teams.sql`
- Roadmap Items: `scripts/add-migration-roadmap-items.sql`


