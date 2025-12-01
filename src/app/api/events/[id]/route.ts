import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { validateEventDates, validateRecurrencePattern } from '@/models/events/event.model';

/**
 * GET /api/events/[id]
 * Get a single event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    const serialized: any = {
      ...event,
      _id: event._id.toString(),
    };
    
    // Serialize dates
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
    
    return NextResponse.json({
      success: true,
      event: serialized,
    });
  } catch (error) {
    console.error('[API] Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 * Update an event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { title, startDate, endDate, locationId, isRepeating, recurrencePattern, notes, isActive } = body;
    
    const db = await getDatabase();
    
    // Get current event to validate updates
    const currentEvent = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!currentEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Determine values for validation
    const newStartDate = startDate ? new Date(startDate) : currentEvent.startDate;
    const newEndDate = endDate ? new Date(endDate) : currentEvent.endDate;
    const newIsRepeating = isRepeating !== undefined ? isRepeating : currentEvent.isRepeating;
    const newRecurrencePattern = recurrencePattern !== undefined ? recurrencePattern : currentEvent.recurrencePattern;
    
    // Validate dates
    const dateValidation = validateEventDates(newStartDate, newEndDate, newIsRepeating);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Validate recurrence pattern
    const patternValidation = validateRecurrencePattern(newRecurrencePattern, newIsRepeating);
    if (!patternValidation.valid) {
      return NextResponse.json(
        { error: patternValidation.error },
        { status: 400 }
      );
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isRepeating !== undefined) updateData.isRepeating = isRepeating;
    if (recurrencePattern !== undefined) updateData.recurrencePattern = recurrencePattern;
    
    // Handle date updates
    if (startDate !== undefined) {
      updateData.startDate = newStartDate;
    }
    if (endDate !== undefined) {
      updateData.endDate = newEndDate;
    } else if (isRepeating === false && !endDate && currentEvent.isRepeating) {
      // If changing from repeating to single, endDate becomes required
      return NextResponse.json(
        { error: 'End date is required for single events' },
        { status: 400 }
      );
    }
    
    // Handle locationId
    if (locationId !== undefined) {
      if (locationId === '' || locationId === null) {
        updateData.locationId = null;
      } else {
        updateData.locationId = new ObjectId(locationId);
      }
    }
    
    const result = await db.collection('events').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('[API] Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const result = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error('[API] Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}













