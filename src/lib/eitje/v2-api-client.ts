/**
 * Eitje V2 API Client
 * 
 * Client for calling Eitje API endpoints
 * Adapted from V1 for MongoDB/GraphQL backend
 * 
 * Features:
 * - Custom header authentication (4 credentials)
 * - Comprehensive validation
 * - Error handling
 * - Support for GET and GET-with-body endpoints (using axios)
 */

import axios from 'axios';
import { EitjeCredentials, EITJE_DATE_LIMITS } from './v2-types';

/**
 * Create authentication headers for Eitje API
 */
function createHeaders(credentials: EitjeCredentials) {
  return {
    'Partner-Username': credentials.partner_username,
    'Partner-Password': credentials.partner_password,
    'Api-Username': credentials.api_username,
    'Api-Password': credentials.api_password,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Validate Eitje credentials
 */
function validateCredentials(credentials: EitjeCredentials): void {
  if (!credentials) {
    throw new Error('Credentials object is required');
  }
  
  if (!credentials.partner_username || !credentials.partner_password || 
      !credentials.api_username || !credentials.api_password) {
    throw new Error('Missing required credentials: all 4 Eitje credentials (partner_username, partner_password, api_username, api_password) are required');
  }
}

/**
 * Validate base URL format
 */
function validateBaseUrl(baseUrl: string): void {
  if (!baseUrl) {
    throw new Error('Base URL is required');
  }
  
  try {
    new URL(baseUrl);
  } catch {
    throw new Error('Invalid base URL format');
  }
}

/**
 * Validate date range
 */
function validateDateRange(startDate: string, endDate: string, maxDays: number): void {
  if (!startDate || !endDate) {
    throw new Error('Both startDate and endDate are required');
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    throw new Error('startDate cannot be after endDate');
  }
  
  if (daysDiff > maxDays) {
    throw new Error(`Date range too large: ${daysDiff} days. Maximum ${maxDays} days allowed`);
  }
}

/**
 * Handle API errors with specific error messages
 */
function handleApiError(error: unknown, endpoint: string): never {
  console.error(`[Eitje API V2] Error in ${endpoint}:`, error);
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('timeout')) {
      throw new Error(`Request timeout for ${endpoint}. The API may be slow or unavailable.`);
    }
    if (error.message.includes('401')) {
      throw new Error(`Authentication failed for ${endpoint}. Check your Eitje credentials.`);
    }
    if (error.message.includes('403')) {
      throw new Error(`Access forbidden for ${endpoint}. Check your API permissions.`);
    }
    if (error.message.includes('429')) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Please wait before retrying.`);
    }
    if (error.message.includes('500')) {
      throw new Error(`Server error for ${endpoint}. The Eitje API may be experiencing issues.`);
    }
    
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
  }
  
  throw new Error(`Failed to fetch ${endpoint}: Unknown error occurred`);
}

// ============================================
// MASTER DATA ENDPOINTS (Simple GET)
// ============================================

/**
 * Fetch Eitje environments
 */
export async function fetchEitjeEnvironments(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API V2] Fetching environments');
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/environments`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Environments response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'environments');
    return items;
  } catch (error) {
    handleApiError(error, 'environments');
  }
}

/**
 * Fetch Eitje teams
 */
export async function fetchEitjeTeams(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API V2] Fetching teams');
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/teams`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Teams response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'teams');
    return items;
  } catch (error) {
    handleApiError(error, 'teams');
  }
}

/**
 * Fetch Eitje users
 */
export async function fetchEitjeUsers(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API V2] Fetching users');
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/users`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Users response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'users');
    return items;
  } catch (error) {
    handleApiError(error, 'users');
  }
}

/**
 * Fetch Eitje shift types
 */
export async function fetchEitjeShiftTypes(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API V2] Fetching shift types');
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/shift_types`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Shift types response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'shift types');
    return items;
  } catch (error) {
    handleApiError(error, 'shift_types');
  }
}

// ============================================
// LABOR/REVENUE ENDPOINTS (GET with body)
// ============================================

/**
 * Fetch Eitje time registration shifts
 * Note: Eitje API uses GET method with body (unusual but required)
 */
export async function fetchEitjeTimeRegistrationShifts(
  baseUrl: string, 
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching time registration shifts:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.time_registration_shifts);
  
  try {
    // Eitje API requires GET with body - use axios (fetch doesn't support GET with body)
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/time_registration_shifts`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Time registration shifts response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'time registration shifts');
    return items;
  } catch (error) {
    handleApiError(error, 'time_registration_shifts');
  }
}

/**
 * Fetch Eitje planning shifts
 * Note: Eitje API uses GET method with body (unusual but required)
 */
export async function fetchEitjePlanningShifts(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching planning shifts:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.planning_shifts);
  
  try {
    // Eitje API requires GET with body - use axios (fetch doesn't support GET with body)
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/planning_shifts`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Planning shifts response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'planning shifts');
    return items;
  } catch (error) {
    handleApiError(error, 'planning_shifts');
  }
}

/**
 * Fetch Eitje revenue days
 */
export async function fetchEitjeRevenueDays(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching revenue days:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.revenue_days);
  
  try {
    // Eitje API requires GET with body - use axios (fetch doesn't support GET with body)
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/revenue_days`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Revenue days response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'revenue days');
    return items;
  } catch (error) {
    handleApiError(error, 'revenue_days');
  }
}

/**
 * Fetch Eitje availability shifts
 * Note: Eitje API uses GET method with body (unusual but required)
 */
export async function fetchEitjeAvailabilityShifts(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching availability shifts:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.availability_shifts);
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/availability_shifts`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Availability shifts response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'availability shifts');
    return items;
  } catch (error) {
    handleApiError(error, 'availability_shifts');
  }
}

/**
 * Fetch Eitje leave requests
 * Note: Eitje API uses GET method with body (unusual but required)
 */
export async function fetchEitjeLeaveRequests(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching leave requests:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.leave_requests);
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/leave_requests`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Leave requests response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'leave requests');
    return items;
  } catch (error) {
    handleApiError(error, 'leave_requests');
  }
}

/**
 * Fetch Eitje events
 * Note: Eitje API uses GET method with body (unusual but required)
 */
export async function fetchEitjeEvents(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API V2] Fetching events:', { startDate, endDate });
  
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, EITJE_DATE_LIMITS.events);
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/events`,
      headers: createHeaders(credentials),
      data: {
        filters: {
          start_date: startDate,
          end_date: endDate,
          date_filter_type: 'resource_date'
        }
      },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    const items = data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API V2] Events response is not an array:', typeof items);
    }
    
    console.log('[Eitje API V2] Fetched', Array.isArray(items) ? items.length : 'not array', 'events');
    return items;
  } catch (error) {
    handleApiError(error, 'events');
  }
}

