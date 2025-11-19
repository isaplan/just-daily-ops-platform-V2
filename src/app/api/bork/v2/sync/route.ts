/**
 * POST /api/bork/v2/sync
 * Sync data from Bork API to MongoDB
 * 
 * Body:
 * - locationId: string (required) - Location UUID
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * 
 * Returns: { success: boolean, recordsSaved: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { fetchBorkDataForDateRange } from '@/lib/bork/v2-api-client';
import { optimizeBorkTickets, calculateStorageReduction } from '@/lib/bork/v2-data-optimizer';
import { ObjectId } from 'mongodb';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

type SyncTarget = {
  location: any;
  locationObjectId: ObjectId;
  baseUrl: string;
  apiKey: string;
};

export async function POST(request: NextRequest) {
  let totalRecordsSaved = 0;
  let totalTicketsProcessed = 0;
  let totalTicketsSkipped = 0;

  try {
    const body = await request.json();
    const { locationId, startDate, endDate, baseUrl, apiKey, locationName } = body;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const syncTargets: SyncTarget[] = [];
    const normalizedLocationId = typeof locationId === 'string' ? locationId.trim() : locationId;
    const isAllLocations = typeof normalizedLocationId === 'string' && normalizedLocationId.toLowerCase() === 'all';
    const requestedLocationId = typeof normalizedLocationId === 'string' ? normalizedLocationId : locationId;

    if (isAllLocations) {
      const credentials = await db.collection('api_credentials')
        .find({ provider: 'bork', isActive: true })
        .toArray();

      for (const credential of credentials) {
        if (!credential.locationId) {
          console.warn(`[Bork API Sync] Skipping credential ${credential._id}: missing locationId`);
          continue;
        }

        let credentialLocationId: ObjectId | null = null;
        if (credential.locationId instanceof ObjectId) {
          credentialLocationId = credential.locationId;
        } else if (typeof credential.locationId === 'string') {
          try {
            credentialLocationId = new ObjectId(credential.locationId);
          } catch {
            console.warn(`[Bork API Sync] Skipping credential ${credential._id}: invalid locationId format`);
            continue;
          }
        }

        if (!credentialLocationId) {
          console.warn(`[Bork API Sync] Skipping credential ${credential._id}: unresolved locationId`);
          continue;
        }

        const credentialBaseUrl = credential.baseUrl || credential.config?.baseUrl;
        const credentialApiKey = credential.apiKey || credential.config?.apiKey;

        if (!credentialBaseUrl || !credentialApiKey) {
          console.warn(`[Bork API Sync] Skipping credential ${credential._id}: missing baseUrl/apiKey`);
          continue;
        }

        const targetLocation = await db.collection('locations').findOne({ _id: credentialLocationId });
        if (!targetLocation) {
          console.warn(`[Bork API Sync] Skipping credential ${credential._id}: location not found`);
          continue;
        }

        syncTargets.push({
          location: targetLocation,
          locationObjectId: credentialLocationId,
          baseUrl: credentialBaseUrl,
          apiKey: credentialApiKey,
        });
      }

      if (syncTargets.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No active Bork credentials found for any location' },
          { status: 400 }
        );
      }
    } else {
      // Get single location - try multiple methods
      let location;
      let locationObjectId: ObjectId | null = null;
    
    // Method 1: Try ObjectId
      try {
        locationObjectId = new ObjectId(requestedLocationId);
      location = await db.collection('locations').findOne({
        _id: locationObjectId,
      });
    } catch (error) {
      // Not a valid ObjectId, continue to other methods
    }

    // Method 2: Try to find by systemMappings (for UUID locationIds)
    if (!location) {
      location = await db.collection('locations').findOne({
        'systemMappings.externalId': requestedLocationId,
        'systemMappings.system': 'bork',
      });
      
      if (location) {
        locationObjectId = location._id;
      }
    }

    // Method 3: Try to find by name (if locationName provided) - handle apostrophes and case-insensitive
    if (!location && locationName) {
      // Try exact match first
      location = await db.collection('locations').findOne({
        name: locationName,
        isActive: true,
      });
      
      // Try case-insensitive match if exact match fails
      if (!location) {
        location = await db.collection('locations').findOne({
          name: { $regex: new RegExp(`^${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        });
      }
      
      if (location) {
        locationObjectId = location._id;
        
        // Update location with systemMapping if it doesn't have one
        if (!location.systemMappings || !location.systemMappings.some((m: any) => m.system === 'bork' && m.externalId === requestedLocationId)) {
          await db.collection('locations').updateOne(
            { _id: locationObjectId },
            {
              $push: {
                systemMappings: {
                  system: 'bork',
                  externalId: requestedLocationId,
                },
              },
            }
          );
        }
        console.log(`[Bork API Sync] ✅ Found location by name: ${location.name} (${locationObjectId})`);
      }
    }

    // Method 4: Try common location names as fallback (case-insensitive, handle apostrophes)
    if (!location) {
      const commonNames = ['Bar Bea', 'Van Kinsbergen', 'L\'Amour Toujours', 'l\'Amour Toujours', 'LAmour Toujours'];
      for (const name of commonNames) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        location = await db.collection('locations').findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          isActive: true,
        });
        
        if (location) {
          locationObjectId = location._id;
          console.log(`[Bork API Sync] ✅ Found location by common name: ${location.name} (${locationObjectId})`);
          break;
        }
      }
    }

    // If credentials provided in request body, use them (for UI-managed credentials)
    let finalBaseUrl = baseUrl;
    let finalApiKey = apiKey;

    // Otherwise, try to get from MongoDB
    if (!finalBaseUrl || !finalApiKey) {
      if (!locationObjectId) {
        return NextResponse.json(
          { success: false, error: 'Cannot fetch credentials: location not resolved' },
          { status: 400 }
        );
      }
      const credentials = await db.collection('api_credentials').findOne({
        provider: 'bork',
        locationId: locationObjectId,
        isActive: true,
      });

      if (credentials) {
        finalBaseUrl = credentials.baseUrl || credentials.config?.baseUrl;
        finalApiKey = credentials.apiKey || credentials.config?.apiKey;
      }
    }

    if (!finalBaseUrl || !finalApiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing baseUrl or apiKey. Please provide credentials in request body or save them in MongoDB.' },
        { status: 400 }
      );
    }

    // Ensure we have a location before proceeding - create if needed
    if (!location || !locationObjectId) {
      console.log(`[Bork API Sync] ⚠️ Location not found after all lookup methods. Creating new location...`);
      console.log(`[Bork API Sync]   - locationId: ${locationId}`);
      console.log(`[Bork API Sync]   - locationName: ${locationName || 'not provided'}`);
      
      // Create a new location with the UUID as reference
      const newLocation = {
        name: locationName || `Location ${locationId.substring(0, 8)}`,
        code: locationId.substring(0, 8).toUpperCase(),
        isActive: true,
        systemMappings: [{
          system: 'bork',
          externalId: requestedLocationId,
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      try {
        const insertResult = await db.collection('locations').insertOne(newLocation);
        locationObjectId = insertResult.insertedId;
        location = { ...newLocation, _id: locationObjectId };
        
        console.log(`[Bork API Sync] ✅ Successfully created new location: "${location.name}" (${locationObjectId})`);
      } catch (insertError: any) {
        console.error(`[Bork API Sync] ❌ Error creating location:`, insertError);
        console.error(`[Bork API Sync]   Error details:`, insertError.message);
        
        // If insert fails (e.g., duplicate key), try to find it again
        const foundLocation = await db.collection('locations').findOne({
          'systemMappings.externalId': locationId,
          'systemMappings.system': 'bork',
        });
        
        if (foundLocation) {
          location = foundLocation;
          locationObjectId = foundLocation._id;
          console.log(`[Bork API Sync] ✅ Found existing location after insert error: "${location.name}" (${locationObjectId})`);
        } else {
          // Try one more time with name match
          const nameMatchLocation = await db.collection('locations').findOne({
            name: locationName,
            isActive: true,
          });
          
          if (nameMatchLocation) {
            location = nameMatchLocation;
            locationObjectId = nameMatchLocation._id;
            console.log(`[Bork API Sync] ✅ Found location by name after insert error: "${location.name}" (${locationObjectId})`);
          } else {
            // Last resort: return error with helpful message
            console.error(`[Bork API Sync] ❌ All location lookup methods failed`);
            return NextResponse.json(
              { 
                success: false, 
                error: `Unable to create or find location. LocationId: ${locationId}, Name: ${locationName || 'not provided'}. Error: ${insertError.message || 'Unknown error'}` 
              },
              { status: 500 }
            );
          }
        }
      }
    }

    // Final validation - ensure we have a valid locationObjectId
    if (!locationObjectId) {
      console.error(`[Bork API Sync] locationObjectId is still null after all attempts`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Unable to resolve location for locationId: ${requestedLocationId}. Location: ${locationName || 'unknown'}` 
        },
        { status: 500 }
      );
    }

    syncTargets.push({
      location,
      locationObjectId,
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
    });
  }

    if (syncTargets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sync targets resolved for the provided locationId' },
        { status: 400 }
      );
    }

    for (const target of syncTargets) {
      const { location, locationObjectId, baseUrl, apiKey } = target;

      const finalLocationName = location?.name || locationName || locationId;
      console.log(`[Bork API Sync] ✅ Using location: ${finalLocationName} (${locationObjectId})`);
      console.log(`[Bork API Sync] Syncing ${finalLocationName} from ${startDate} to ${endDate}`);

    // Fetch data from Bork API
    const apiData = await fetchBorkDataForDateRange(baseUrl, apiKey, startDate, endDate);

    if (!Array.isArray(apiData) || apiData.length === 0) {
      return NextResponse.json({
        success: true,
        recordsSaved: 0,
        message: 'No data found for the specified date range',
      });
    }
    
    // Debug: Log sample ticket structure to understand date format
    if (apiData.length > 0) {
      const sampleTicket = apiData[0];
      console.log(`[Bork API Sync] Sample ticket structure:`, {
        hasActualDate: !!sampleTicket.ActualDate,
        actualDateType: typeof sampleTicket.ActualDate,
        actualDateValue: sampleTicket.ActualDate,
        sampleKeys: Object.keys(sampleTicket).slice(0, 10), // First 10 keys
      });
    }
    
      let recordsSaved = 0;

    // Group tickets by date for efficient storage
    const ticketsByDate = new Map<string, any[]>();
    let skippedTickets = 0;
    
    for (const ticket of apiData) {
      // Extract date from ticket (ActualDate is in YYYYMMDD format)
      const actualDate = ticket.ActualDate;
      if (!actualDate) {
        skippedTickets++;
        continue;
      }

      // Convert to string and validate format
      const dateStr = String(actualDate);
      
      // Validate format (should be 8 digits: YYYYMMDD)
      if (dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
        console.warn(`[Bork API Sync] Invalid date format: ${actualDate} (expected YYYYMMDD), skipping ticket`);
        skippedTickets++;
        continue;
      }

      // Parse date components
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8), 10);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn(`[Bork API Sync] Invalid date values: year=${year}, month=${month}, day=${day} (from ${actualDate}), skipping ticket`);
        skippedTickets++;
        continue;
      }
      
      // Validate date range
      if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
        console.warn(`[Bork API Sync] Date out of valid range: ${year}-${month + 1}-${day} (from ${actualDate}), skipping ticket`);
        skippedTickets++;
        continue;
      }
      
      // Create Date object in UTC to avoid timezone shifts
      // Use UTC date constructor to ensure the date stays as YYYY-MM-DD regardless of server timezone
      const date = new Date(Date.UTC(year, month, day));
      
      // Validate Date object is valid
      if (isNaN(date.getTime())) {
        console.warn(`[Bork API Sync] Invalid date object created from ${actualDate} (${year}-${month + 1}-${day}), skipping ticket`);
        skippedTickets++;
        continue;
      }
      
      // Convert to ISO string and extract date part (YYYY-MM-DD)
      // Using UTC ensures the date doesn't shift due to timezone
      const dateKey = date.toISOString().split('T')[0];

      if (!ticketsByDate.has(dateKey)) {
        ticketsByDate.set(dateKey, []);
      }
      ticketsByDate.get(dateKey)!.push(ticket);
    }
    
    if (skippedTickets > 0) {
      console.warn(`[Bork API Sync] Skipped ${skippedTickets} ticket(s) due to invalid dates`);
    }

    // Insert or update records for each date
    for (const [dateKey, tickets] of ticketsByDate.entries()) {
      // dateKey is already validated YYYY-MM-DD format from above
      // Create Date object at midnight UTC for consistent storage
      const date = new Date(dateKey + 'T00:00:00.000Z');
      
      // Validate date is still valid (should always be, but double-check)
      if (isNaN(date.getTime())) {
        console.error(`[Bork API Sync] Invalid date key: ${dateKey}, skipping`);
        continue;
      }

      // Optimize tickets: extract only essential fields (reduces storage by ~70-80%)
      const optimizedTickets = optimizeBorkTickets(tickets);
      const storageReduction = calculateStorageReduction(tickets, optimizedTickets);
      
      if (storageReduction > 0) {
        console.log(`[Bork API Sync] Optimized ${tickets.length} tickets for ${dateKey}: ${storageReduction}% storage reduction`);
      }

      // Check if record already exists for this date and location
      const existingRecord = await db.collection('bork_raw_data').findOne({
        locationId: locationObjectId,
        date: date,
      });

      try {
        if (existingRecord) {
          // Update existing record with optimized data
          await db.collection('bork_raw_data').updateOne(
            { _id: existingRecord._id },
            {
              $set: {
                rawApiResponse: optimizedTickets, // Store only essential fields
                updatedAt: new Date(),
              },
            }
          );
          recordsSaved++;
        } else {
          // Insert new record with optimized data
          await db.collection('bork_raw_data').insertOne({
            locationId: locationObjectId,
            date: date,
            rawApiResponse: optimizedTickets, // Store only essential fields
            extracted: {}, // Will be populated by aggregation
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          recordsSaved++;
        }
      } catch (dbError: any) {
        // Check for MongoDB quota/storage errors
        if (dbError.message?.includes('space quota') || 
            dbError.message?.includes('quota') ||
            dbError.code === 12501 || // MongoDB quota exceeded error code
            dbError.codeName === 'ExceededMemoryLimit') {
          console.error(`[Bork API Sync] MongoDB storage quota exceeded for ${finalLocationName} on ${dateKey}`);
          throw new Error(`MongoDB storage quota exceeded (using 514 MB of 512 MB). Please upgrade your MongoDB plan or clean up old data before continuing.`);
        }
        // Re-throw other errors
        throw dbError;
      }
    }

    const finalLocationNameForResponse = location?.name || locationName || locationId;
    console.log(`[Bork API Sync] Saved ${recordsSaved} date records for ${finalLocationNameForResponse}`);
    if (skippedTickets > 0) {
      console.log(`[Bork API Sync] Note: ${skippedTickets} ticket(s) were skipped due to invalid dates`);
    }

      totalRecordsSaved += recordsSaved;
      totalTicketsProcessed += apiData.length;
      totalTicketsSkipped += skippedTickets;
    }

    // Trigger keuken analyses aggregation after successful sync (non-blocking)
    const { aggregateKeukenAnalysesOnDataSync } = await import('@/lib/services/daily-ops/keuken-analyses-aggregation.service');
    aggregateKeukenAnalysesOnDataSync(
      isAllLocations ? undefined : (typeof requestedLocationId === 'string' ? requestedLocationId : requestedLocationId.toString()),
      new Date(startDate),
      new Date(endDate)
    ).catch((aggError) => {
      console.warn('[Bork Sync] Keuken analyses aggregation failed (non-blocking):', aggError);
      // Don't fail the sync if aggregation fails
    });

    return NextResponse.json({
      success: true,
      recordsSaved: totalRecordsSaved,
      ticketsProcessed: totalTicketsProcessed,
      ticketsSkipped: totalTicketsSkipped,
      message: syncTargets.length > 1
        ? `Successfully synced ${totalRecordsSaved} date record(s) across ${syncTargets.length} location(s)`
        : `Successfully synced ${totalRecordsSaved} date record(s)`,
    });
  } catch (error: any) {
    console.error('[Bork API Sync] Error:', error);
    
    // Provide helpful error messages for quota issues
    let errorMessage = error.message || 'Failed to sync Bork API data';
    let statusCode = 500;
    
    if (error.message?.includes('space quota') || error.message?.includes('quota')) {
      statusCode = 507; // 507 Insufficient Storage
      errorMessage = `MongoDB storage quota exceeded. Current usage: 514 MB / 512 MB limit. Solutions: 1) Upgrade MongoDB plan, 2) Delete old data, 3) Optimize data storage.`;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        recordsSaved: totalRecordsSaved,
        ticketsProcessed: totalTicketsProcessed,
        ticketsSkipped: totalTicketsSkipped,
      },
      { status: statusCode }
    );
  }
}

