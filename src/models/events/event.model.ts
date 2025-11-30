/**
 * Event Model
 * Events and promotions with support for single and repeating events
 */

export type RecurrencePattern = 'weekly' | 'monthly' | 'custom';

export interface CustomRecurrencePattern {
  type: 'custom';
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  interval?: number; // Every N weeks/months
  unit?: 'week' | 'month'; // Interval unit
  weekOfMonth?: number; // 1 = first week, 2 = second week, 3 = third week, 4 = fourth week, -1 = last week
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (for monthly patterns with week of month)
}

export interface Event {
  _id?: string;
  title: string;
  startDate: Date;
  endDate?: Date; // Optional for repeating events
  locationId?: string; // Location this event is for
  isRepeating: boolean;
  recurrencePattern?: RecurrencePattern | CustomRecurrencePattern;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventInput {
  title: string;
  startDate: Date;
  endDate?: Date; // Optional for repeating events
  locationId?: string;
  isRepeating: boolean;
  recurrencePattern?: RecurrencePattern | CustomRecurrencePattern;
  notes?: string;
  isActive?: boolean;
}

export interface EventUpdateInput {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
  isRepeating?: boolean;
  recurrencePattern?: RecurrencePattern | CustomRecurrencePattern;
  notes?: string;
  isActive?: boolean;
}

/**
 * Validate event dates
 */
export function validateEventDates(
  startDate: Date,
  endDate?: Date,
  isRepeating?: boolean
): { valid: boolean; error?: string } {
  if (!startDate) {
    return { valid: false, error: 'Start date is required' };
  }

  // For single events, end date should be after start date
  if (!isRepeating && endDate) {
    if (endDate < startDate) {
      return { valid: false, error: 'End date must be after start date' };
    }
  }

  return { valid: true };
}

/**
 * Validate recurrence pattern
 */
export function validateRecurrencePattern(
  pattern: RecurrencePattern | CustomRecurrencePattern | undefined,
  isRepeating: boolean
): { valid: boolean; error?: string } {
  if (isRepeating && !pattern) {
    return { valid: false, error: 'Recurrence pattern is required for repeating events' };
  }

  if (!isRepeating && pattern) {
    return { valid: false, error: 'Recurrence pattern should not be set for single events' };
  }

  // Validate custom pattern
  if (pattern && typeof pattern === 'object' && pattern.type === 'custom') {
    const customPattern = pattern as CustomRecurrencePattern;
    if (customPattern.unit === 'week' && (!customPattern.daysOfWeek || customPattern.daysOfWeek.length === 0)) {
      return { valid: false, error: 'Days of week are required for weekly custom pattern' };
    }
    if (customPattern.interval && customPattern.interval < 1) {
      return { valid: false, error: 'Interval must be at least 1' };
    }
  }

  return { valid: true };
}

