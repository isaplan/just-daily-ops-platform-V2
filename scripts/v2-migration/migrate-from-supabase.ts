/**
 * Migration Script: Supabase to MongoDB
 * 
 * Migrates data from Supabase (PostgreSQL) to MongoDB
 * Usage: npx tsx scripts/v2-migration/migrate-from-supabase.ts
 */

import { createClient } from '@/integrations/supabase/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

async function migrateLocations() {
  console.log('📦 Migrating locations...');
  const supabase = await createClient();
  const db = await getDatabase();

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*');

  if (error) throw error;

  if (!locations || locations.length === 0) {
    console.log('⚠️  No locations found in Supabase');
    return;
  }

  const mongoLocations = locations.map((loc: any) => ({
    _id: new ObjectId(loc.id.replace(/-/g, '').substring(0, 24)),
    name: loc.name,
    code: loc.code,
    address: loc.address,
    city: loc.city,
    country: loc.country || 'Netherlands',
    isActive: loc.is_active ?? true,
    createdAt: new Date(loc.created_at),
    updatedAt: new Date(loc.updated_at || loc.created_at),
  }));

  await db.collection('locations').insertMany(mongoLocations);
  console.log(`✅ Migrated ${mongoLocations.length} locations`);
}

async function migrateUnifiedUsers() {
  console.log('📦 Migrating unified users...');
  const supabase = await createClient();
  const db = await getDatabase();

  const { data: users, error } = await supabase
    .from('unified_users')
    .select('*');

  if (error) throw error;

  if (!users || users.length === 0) {
    console.log('⚠️  No unified users found in Supabase');
    return;
  }

  // Get user locations and system mappings
  const { data: userLocations } = await supabase
    .from('user_locations')
    .select('*');

  const { data: systemMappings } = await supabase
    .from('user_system_mappings')
    .select('*');

  const locationMap = new Map(
    (userLocations || []).map((ul: any) => [ul.unified_user_id, ul.location_id])
  );

  const mappingsMap = new Map<string, any[]>();
  (systemMappings || []).forEach((sm: any) => {
    if (!mappingsMap.has(sm.unified_user_id)) {
      mappingsMap.set(sm.unified_user_id, []);
    }
    mappingsMap.get(sm.unified_user_id)!.push({
      system: sm.system_name,
      externalId: sm.external_id,
      rawData: sm.raw_data,
    });
  });

  const mongoUsers = users.map((user: any) => {
    const userId = user.id.replace(/-/g, '').substring(0, 24);
    const locationIds = (userLocations || [])
      .filter((ul: any) => ul.unified_user_id === user.id)
      .map((ul: any) => new ObjectId(ul.location_id.replace(/-/g, '').substring(0, 24)));

    return {
      _id: new ObjectId(userId),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      employeeNumber: user.employee_number,
      hireDate: user.hire_date ? new Date(user.hire_date) : undefined,
      isActive: user.is_active ?? true,
      notes: user.notes,
      locationIds,
      teamIds: [], // Will be populated from team_members
      systemMappings: mappingsMap.get(user.id) || [],
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at),
    };
  });

  await db.collection('unified_users').insertMany(mongoUsers);
  console.log(`✅ Migrated ${mongoUsers.length} unified users`);
}

async function migrateUnifiedTeams() {
  console.log('📦 Migrating unified teams...');
  const supabase = await createClient();
  const db = await getDatabase();

  const { data: teams, error } = await supabase
    .from('unified_teams')
    .select('*');

  if (error) throw error;

  if (!teams || teams.length === 0) {
    console.log('⚠️  No unified teams found in Supabase');
    return;
  }

  // Get team locations, members, and system mappings
  const { data: teamLocations } = await supabase
    .from('team_locations')
    .select('*');

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*');

  const { data: teamSystemMappings } = await supabase
    .from('team_system_mappings')
    .select('*');

  const mappingsMap = new Map<string, any[]>();
  (teamSystemMappings || []).forEach((tsm: any) => {
    if (!mappingsMap.has(tsm.unified_team_id)) {
      mappingsMap.set(tsm.unified_team_id, []);
    }
    mappingsMap.get(tsm.unified_team_id)!.push({
      system: tsm.system_name,
      externalId: tsm.external_id,
      rawData: tsm.raw_data,
    });
  });

  const mongoTeams = teams.map((team: any) => {
    const teamId = team.id.replace(/-/g, '').substring(0, 24);
    const locationIds = (teamLocations || [])
      .filter((tl: any) => tl.unified_team_id === team.id)
      .map((tl: any) => new ObjectId(tl.location_id.replace(/-/g, '').substring(0, 24)));

    const memberIds = (teamMembers || [])
      .filter((tm: any) => tm.unified_team_id === team.id)
      .map((tm: any) => new ObjectId(tm.unified_user_id.replace(/-/g, '').substring(0, 24)));

    return {
      _id: new ObjectId(teamId),
      name: team.name,
      description: team.description,
      teamType: team.team_type,
      isActive: team.is_active ?? true,
      notes: team.notes,
      locationIds,
      memberIds,
      systemMappings: mappingsMap.get(team.id) || [],
      createdAt: new Date(team.created_at),
      updatedAt: new Date(team.updated_at || team.created_at),
    };
  });

  await db.collection('unified_teams').insertMany(mongoTeams);
  console.log(`✅ Migrated ${mongoTeams.length} unified teams`);
}

async function main() {
  try {
    console.log('🚀 Starting migration from Supabase to MongoDB...\n');

    await migrateLocations();
    await migrateUnifiedUsers();
    await migrateUnifiedTeams();

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

