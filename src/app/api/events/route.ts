import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { validateEventDates, validateRecurrencePattern } from '@/models/events/event.model';

/**
 * GET /api/events
 * Get all events, optionally filtered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const locationId = searchParams.get('locationId');
    
    const db = await getDatabase();
    const query: any = {};
    
    if (activeOnly) {
      query.isActive = true;
    }
    
    if (locationId) {
      query.locationId = new ObjectId(locationId);
    }
    
    const events = await db
      .collection('events')
      .find(query)
      .sort({ startDate: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      events: events.map((event) => {
        const serialized: any = {
          ...event,
          _id: event._id.toString(),
        };
        
        // Serialize dates safely
        if (event.startDate) {
          serialized.startDate = event.startDate instanceof Date 
            ? event.startDate.toISOString() 
            : new Date(event.startDate).toISOString();
        }
        if (event.endDate) {
          serialized.endDate = event.endDate instanceof Date 
            ? event.endDate.toISOString() 
            : new Date(event.endDate).toISOString();
        }
        if (event.createdAt) {
          serialized.createdAt = event.createdAt instanceof Date 
            ? event.createdAt.toISOString() 
            : new Date(event.createdAt).toISOString();
        }
        if (event.updatedAt) {
          serialized.updatedAt = event.updatedAt instanceof Date 
            ? event.updatedAt.toISOString() 
            : new Date(event.updatedAt).toISOString();
        }
        
        // Serialize locationId
        if (event.locationId) {
          serialized.locationId = event.locationId instanceof ObjectId 
            ? event.locationId.toString() 
            : event.locationId;
        }
        
        return serialized;
      }),
    });
  } catch (error) {
    console.error('[API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event (single or repeating)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, startDate, endDate, locationId, isRepeating, recurrencePattern, notes, isActive } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startDate' },
        { status: 400 }
      );
    }

    // Validate dates
    const dateValidation = validateEventDates(new Date(startDate), endDate ? new Date(endDate) : undefined, isRepeating);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Validate recurrence pattern
    const patternValidation = validateRecurrencePattern(recurrencePattern, isRepeating);
    if (!patternValidation.valid) {
      return NextResponse.json(
        { error: patternValidation.error },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Parse dates
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : undefined;
    
    // For repeating events, endDate is optional
    // For single events, endDate should be after startDate
    if (!isRepeating && !end) {
      return NextResponse.json(
        { error: 'End date is required for single events' },
        { status: 400 }
      );
    }

    // Create event
    const event: any = {
      title,
      startDate: start,
      isRepeating: isRepeating || false,
      isActive: isActive !== undefined ? isActive : true,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (end) {
      event.endDate = end;
    }

    if (locationId) {
      event.locationId = new ObjectId(locationId);
    }

    if (isRepeating && recurrencePattern) {
      event.recurrencePattern = recurrencePattern;
    }
    
    const result = await db.collection('events').insertOne(event);
    
    return NextResponse.json({
      success: true,
      event: {
        ...event,
        _id: result.insertedId.toString(),
        locationId: event.locationId ? event.locationId.toString() : undefined,
      },
    });
  } catch (error) {
    console.error('[API] Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}













