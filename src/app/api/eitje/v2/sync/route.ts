/**
 * POST /api/eitje/v2/sync
 * Sync data from Eitje API to MongoDB
 * 
 * Body:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - endpoint: string (optional, defaults to 'time_registration_shifts')
 * 
 * Returns: { success: boolean, recordsSaved: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { getEitjeCredentials } from '@/lib/eitje/v2-credentials';
import {
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjePlanningShifts,
  fetchEitjeRevenueDays,
  fetchEitjeAvailabilityShifts,
  fetchEitjeLeaveRequests,
  fetchEitjeEvents,
} from '@/lib/eitje/v2-api-client';
import { extractEitjeFields } from '@/lib/utils/jsonb-extractor';
import { ObjectId } from 'mongodb';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, endpoint = 'time_registration_shifts' } = body;

    // Master data endpoints don't require date ranges
    const masterDataEndpoints = ['environments', 'teams', 'users', 'shift_types'];
    const requiresDateRange = !masterDataEndpoints.includes(endpoint);

    if (requiresDateRange && (!startDate || !endDate)) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required for this endpoint' },
        { status: 400 }
      );
    }

    // Get credentials
    const creds = await getEitjeCredentials();
    if (!creds) {
      return NextResponse.json(
        { success: false, error: 'No active Eitje credentials found' },
        { status: 404 }
      );
    }

    const db = await getDatabase();
    let recordsSaved = 0;

    // Build environmentId -> locationId mapping
    const locations = await db.collection('locations').find({}).toArray();
    const envToLocationMap = new Map<number, ObjectId>();
    
    for (const loc of locations) {
      if (loc.systemMappings && Array.isArray(loc.systemMappings)) {
        const eitjeMapping = loc.systemMappings.find((m: any) => m.system === 'eitje');
        if (eitjeMapping) {
          envToLocationMap.set(Number(eitjeMapping.externalId), loc._id);
        }
      }
    }

    // Fallback: name-based mapping
    const nameToLocationMap = new Map<string, ObjectId>();
    for (const loc of locations) {
      if (loc.name === 'Van Kinsbergen') nameToLocationMap.set('Van Kinsbergen', loc._id);
      if (loc.name === 'l\'Amour Toujours') nameToLocationMap.set('l\'Amour Toujours', loc._id);
      if (loc.name === 'Bar Bea') nameToLocationMap.set('Bar Bea', loc._id);
    }

    // Get default location for fallback
    const defaultLocation = await db.collection('locations')
      .findOne({ isActive: true }, { sort: { createdAt: 1 } });

    try {
      let apiData: any[] = [];

      // Fetch data from Eitje API based on endpoint
      if (endpoint === 'environments') {
        apiData = await fetchEitjeEnvironments(creds.baseUrl, creds.credentials);
      } else if (endpoint === 'teams') {
        apiData = await fetchEitjeTeams(creds.baseUrl, creds.credentials);
      } else if (endpoint === 'users') {
        apiData = await fetchEitjeUsers(creds.baseUrl, creds.credentials);
      } else if (endpoint === 'shift_types') {
        apiData = await fetchEitjeShiftTypes(creds.baseUrl, creds.credentials);
      } else if (endpoint === 'time_registration_shifts') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for time_registration_shifts' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjeTimeRegistrationShifts(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else if (endpoint === 'planning_shifts') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for planning_shifts' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjePlanningShifts(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else if (endpoint === 'revenue_days') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for revenue_days' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjeRevenueDays(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else if (endpoint === 'availability_shifts') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for availability_shifts' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjeAvailabilityShifts(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else if (endpoint === 'leave_requests') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for leave_requests' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjeLeaveRequests(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else if (endpoint === 'events') {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate are required for events' },
            { status: 400 }
          );
        }
        apiData = await fetchEitjeEvents(
          creds.baseUrl,
          creds.credentials,
          startDate,
          endDate
        );
      } else {
        return NextResponse.json(
          { success: false, error: `Unsupported endpoint: ${endpoint}` },
          { status: 400 }
        );
      }

      if (!Array.isArray(apiData)) {
        return NextResponse.json(
          { success: false, error: 'Invalid API response format' },
          { status: 500 }
        );
      }

      // Process and save each record
      const recordsToInsert = apiData.map((item: any) => {
        // Extract all JSONB fields
        const extracted = extractEitjeFields(item);

        // Determine date from the item (for date-based endpoints)
        let date: Date | undefined = undefined;
        if (masterDataEndpoints.includes(endpoint)) {
          // Master data endpoints don't have dates - use current date or null
          date = undefined;
        } else {
          // Date-based endpoints
          if (item.date) {
            date = new Date(item.date);
          } else if (item.start_time) {
            date = new Date(item.start_time);
          } else if (item.resource_date) {
            date = new Date(item.resource_date);
          } else if (item.start_date) {
            date = new Date(item.start_date);
          } else {
            date = new Date(); // Fallback to today
          }
        }

        // Get environment ID if available
        const environmentId = item.environment_id || item.environment?.id || extracted.environmentId;
        const envIdNum = environmentId ? Number(environmentId) : null;

        // Map environmentId to locationId (only for endpoints with environments)
        let recordLocationId: ObjectId | undefined = undefined;
        if (envIdNum) {
          recordLocationId = envToLocationMap.get(envIdNum);
        }
        
        // Fallback to name-based mapping
        if (!recordLocationId) {
          const envName = item.environment?.name || extracted.environmentName;
          if (envName) {
            recordLocationId = nameToLocationMap.get(envName);
          }
        }
        
        // Final fallback to default location (only for date-based endpoints)
        if (!recordLocationId && defaultLocation && !masterDataEndpoints.includes(endpoint)) {
          recordLocationId = defaultLocation._id;
        }

        return {
          locationId: recordLocationId,
          environmentId: envIdNum,
          date: date,
          endpoint: endpoint,
          rawApiResponse: item, // Store entire raw response
          extracted: extracted, // Store extracted fields for querying
          createdAt: new Date(),
        };
      });

      // Insert records (use upsert to avoid duplicates based on a unique key)
      if (recordsToInsert.length > 0) {
        // Use bulkWrite with upsert to handle duplicates
        const operations = recordsToInsert.map((record) => {
          // Different unique keys for master data vs date-based endpoints
          const filter: any = {
            endpoint: record.endpoint,
            'extracted.id': record.extracted.id, // Use Eitje ID as unique key
          };

          // Add date to filter for date-based endpoints
          if (record.date) {
            filter.date = record.date;
          }

          // For master data endpoints, also match by environmentId if available
          if (masterDataEndpoints.includes(endpoint) && record.environmentId) {
            filter.environmentId = record.environmentId;
          }

          return {
            updateOne: {
              filter,
              update: { $set: record },
              upsert: true,
            },
          };
        });

        const result = await db.collection('eitje_raw_data').bulkWrite(operations);
        recordsSaved = result.upsertedCount + result.modifiedCount;
      }

      // Trigger keuken analyses aggregation after successful sync (non-blocking)
      // Only aggregate for time_registration_shifts endpoint (labor data)
      if (endpoint === 'time_registration_shifts' && startDate && endDate) {
        const { aggregateKeukenAnalysesOnDataSync } = await import('@/lib/services/daily-ops/keuken-analyses-aggregation.service');
        
        // Get locationId from environmentId if available
        let locationId: ObjectId | undefined = undefined;
        if (envToLocationMap.size > 0) {
          // Use first location found (or could aggregate for all)
          locationId = Array.from(envToLocationMap.values())[0];
        }
        
        aggregateKeukenAnalysesOnDataSync(
          locationId,
          new Date(startDate),
          new Date(endDate)
        ).catch((aggError) => {
          console.warn('[Eitje Sync] Keuken analyses aggregation failed (non-blocking):', aggError);
          // Don't fail the sync if aggregation fails
        });
      }

      return NextResponse.json({
        success: true,
        recordsSaved,
        message: `Successfully synced ${recordsSaved} records for ${endpoint}`,
      });

    } catch (apiError: any) {
      console.error('[API /eitje/v2/sync] API error:', apiError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch from Eitje API: ${apiError.message}`,
          recordsSaved: 0,
        },
        { status: 502 }
      );
    }

  } catch (error: any) {
    console.error('[API /eitje/v2/sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync data',
        recordsSaved: 0,
      },
      { status: 500 }
    );
  }
}

