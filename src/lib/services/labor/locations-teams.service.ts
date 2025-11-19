/**
 * Locations & Teams Service
 * GraphQL/MongoDB data fetching for worker profiles with location/team filtering
 */

import { executeGraphQL } from '@/lib/services/graphql/client';
import {
  WorkerProfile,
  WorkersFilteredResponse,
  Location,
  Team,
  FilterState,
} from '@/models/labor/locations-teams.model';

// Fetch workers with filters (location, team, contract type, date range)
export async function fetchWorkersWithFilters(
  filters: FilterState,
  page: number = 1,
  limit: number = 50
): Promise<WorkersFilteredResponse> {
  const query = `
    query FetchWorkerProfiles(
      $year: Int!
      $month: Int
      $page: Int!
      $limit: Int!
      $filters: WorkerProfileFilters
    ) {
      workerProfiles(
        year: $year
        month: $month
        page: $page
        limit: $limit
        filters: $filters
      ) {
        success
        records {
          id
          eitjeUserId
          userName
          teamName
          teams {
            team_id
            team_name
            team_type
            is_active
          }
          locationId
          locationName
          contractType
          contractHours
          hourlyWage
          wageOverride
          effectiveFrom
          effectiveTo
          notes
          isActive
          createdAt
          updatedAt
        }
        total
        page
        totalPages
        error
      }
    }
  `;

  const workerFilters: any = {};
  if (filters.location && filters.location !== 'all') {
    workerFilters.locationId = filters.location;
  }
  if (filters.team && filters.team !== 'all') {
    workerFilters.teamId = filters.team;
  }
  if (filters.contractType && filters.contractType !== 'all') {
    workerFilters.contractType = filters.contractType;
  }

  const variables = {
    year: filters.year,
    month: filters.month,
    page,
    limit,
    filters: workerFilters,
  };

  try {
    const response = await executeGraphQL<{ workerProfiles: any }>(
      query,
      variables
    );
    
    if (response.data?.workerProfiles) {
      const workerProfilesResponse = response.data.workerProfiles;
      
      // Transform to match WorkersFilteredResponse format
      return {
        records: workerProfilesResponse.records.map((record: any, index: number) => ({
          id: record.id, // Keep as string (MongoDB ObjectId)
          eitje_user_id: record.eitjeUserId,
          user_name: record.userName,
          location_id: record.locationId,
          location_name: record.locationName,
          contract_type: record.contractType,
          contract_hours: record.contractHours,
          hourly_wage: record.hourlyWage,
          wage_override: record.wageOverride,
          effective_from: record.effectiveFrom,
          effective_to: record.effectiveTo,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
          teams: record.teams,
        })),
        total: workerProfilesResponse.total,
        page: workerProfilesResponse.page,
        limit,
      };
    }
    
    throw new Error('No data returned from GraphQL query');
  } catch (error) {
    console.error('Error fetching workers with filters:', error);
    throw new Error('Failed to fetch workers with filters');
  }
}

// Fetch all active locations
export async function fetchLocations(): Promise<Location[]> {
  const query = `
    query FetchLocations {
      locations {
        id
        name
        code
        city
        country
        isActive
      }
    }
  `;

  try {
    const response = await executeGraphQL<{ locations: any[] }>(query);
    
    if (response.data?.locations) {
      // Transform from GraphQL schema to our model
      return response.data.locations
        .filter((loc) => loc.isActive)
        .map((loc) => ({
          id: loc.id,
          eitje_id: loc.code || undefined,
          name: loc.name,
          description: undefined,
          city: loc.city || undefined,
          country: loc.country || undefined,
          is_active: loc.isActive,
        }));
    }
    
    throw new Error('No data returned from GraphQL query');
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }
}

// Fetch all active teams (optionally filtered by location)
export async function fetchTeams(locationId?: string): Promise<Team[]> {
  const query = `
    query FetchTeams($locationId: ID) {
      teams(locationId: $locationId) {
        id
        name
        description
        teamType
        isActive
      }
    }
  `;

  const variables = locationId ? { locationId } : {};

  try {
    const response = await executeGraphQL<{ teams: any[] }>(query, variables);
    
    if (response.data?.teams) {
      // Transform from GraphQL schema to our model
      return response.data.teams
        .filter((team) => team.isActive)
        .map((team) => ({
          id: team.id,
          eitje_id: undefined,
          name: team.name,
          description: team.description || undefined,
          environment_id: undefined,
          team_type: team.teamType || undefined,
          is_active: team.isActive,
        }));
    }
    
    throw new Error('No data returned from GraphQL query');
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw new Error('Failed to fetch teams');
  }
}

// Fetch teams by location (helper for cascading filters)
export async function fetchTeamsByLocation(locationId: string): Promise<Team[]> {
  return fetchTeams(locationId);
}

