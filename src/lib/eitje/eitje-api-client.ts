// Single responsibility: Call Eitje API - matches Bork's api-client.ts simplicity
import axios from 'axios';
import { EitjeCredentials } from './eitje-types';

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

// EXTREME DEFENSIVE MODE - Validation utilities
function validateCredentials(credentials: EitjeCredentials): void {
  if (!credentials) {
    throw new Error('Credentials object is required');
  }
  
  if (!credentials.partner_username || !credentials.partner_password || 
      !credentials.api_username || !credentials.api_password) {
    throw new Error('Missing required credentials: all 4 Eitje credentials (partner_username, partner_password, api_username, api_password) are required');
  }
}

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

function handleApiError(error: unknown, endpoint: string): never {
  console.error(`[Eitje API] Error in ${endpoint}:`, error);
  
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

// Master data endpoints (simple GET) - EXTREME DEFENSIVE MODE
export async function fetchEitjeEnvironments(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API] Fetching environments');
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/environments`;
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    // DEFENSIVE: Validate response structure
    if (!Array.isArray(items)) {
      console.warn('[Eitje API] Environments response is not an array:', typeof items);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(items) ? items.length : 'not array', 'environments');
    return items;
  } catch (error) {
    handleApiError(error, 'environments');
  }
}

export async function fetchEitjeTeams(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API] Fetching teams');
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/teams`;
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API] Teams response is not an array:', typeof items);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(items) ? items.length : 'not array', 'teams');
    return items;
  } catch (error) {
    handleApiError(error, 'teams');
  }
}

export async function fetchEitjeUsers(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API] Fetching users');
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/users`;
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API] Users response is not an array:', typeof items);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(items) ? items.length : 'not array', 'users');
    return items;
  } catch (error) {
    handleApiError(error, 'users');
  }
}

export async function fetchEitjeShiftTypes(baseUrl: string, credentials: EitjeCredentials) {
  console.log('[Eitje API] Fetching shift types');
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  
  try {
    const url = `${baseUrl}/shift_types`;
    const response = await fetch(url, { 
      headers: createHeaders(credentials),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Eitje API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const items = data.items || data;
    
    if (!Array.isArray(items)) {
      console.warn('[Eitje API] Shift types response is not an array:', typeof items);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(items) ? items.length : 'not array', 'shift types');
    return items;
  } catch (error) {
    handleApiError(error, 'shift_types');
  }
}

// Labor/revenue endpoints (GET with body using axios) - EXTREME DEFENSIVE MODE
export async function fetchEitjeTimeRegistrationShifts(
  baseUrl: string, 
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API] Fetching time registration shifts:', { startDate, endDate });
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, 7); // Max 7 days for shifts
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/time_registration_shifts`,
      headers: createHeaders(credentials),
      data: { filters: { start_date: startDate, end_date: endDate, date_filter_type: 'resource_date' } },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    
    if (!Array.isArray(data)) {
      console.warn('[Eitje API] Time registration shifts response is not an array:', typeof data);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'time registration shifts');
    return data;
  } catch (error) {
    handleApiError(error, 'time_registration_shifts');
  }
}

export async function fetchEitjePlanningShifts(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API] Fetching planning shifts:', { startDate, endDate });
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, 7); // Max 7 days for shifts
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/planning_shifts`,
      headers: createHeaders(credentials),
      data: { filters: { start_date: startDate, end_date: endDate, date_filter_type: 'resource_date' } },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    
    if (!Array.isArray(data)) {
      console.warn('[Eitje API] Planning shifts response is not an array:', typeof data);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'planning shifts');
    return data;
  } catch (error) {
    handleApiError(error, 'planning_shifts');
  }
}

export async function fetchEitjeRevenueDays(
  baseUrl: string,
  credentials: EitjeCredentials,
  startDate: string,
  endDate: string
) {
  console.log('[Eitje API] Fetching revenue days:', { startDate, endDate });
  
  // DEFENSIVE: Validate inputs
  validateBaseUrl(baseUrl);
  validateCredentials(credentials);
  validateDateRange(startDate, endDate, 90); // Max 90 days for revenue
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/revenue_days`,
      headers: createHeaders(credentials),
      data: { filters: { start_date: startDate, end_date: endDate, date_filter_type: 'resource_date' } },
      timeout: 30000
    });
    
    const data = response.data.items || response.data;
    
    if (!Array.isArray(data)) {
      console.warn('[Eitje API] Revenue days response is not an array:', typeof data);
    }
    
    console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'revenue days');
    return data;
  } catch (error) {
    handleApiError(error, 'revenue_days');
  }
}

// NOT NEEDED - Commented out per user request
// These endpoints are not used in MonthCard and are not needed

// export async function fetchEitjeAvailabilityShifts(
//   baseUrl: string,
//   credentials: EitjeCredentials,
//   startDate: string,
//   endDate: string
// ) {
//   console.log('[Eitje API] Fetching availability shifts:', { startDate, endDate });
//   
//   // DEFENSIVE: Validate inputs
//   validateBaseUrl(baseUrl);
//   validateCredentials(credentials);
//   validateDateRange(startDate, endDate, 7); // Max 7 days for shifts
//   
//   try {
//     const response = await axios({
//       method: 'GET',
//       url: `${baseUrl}/availability_shifts`,
//       headers: createHeaders(credentials),
//       data: { 
//         filters: { 
//           start_date: startDate, 
//           end_date: endDate, 
//           date_filter_type: 'resource_date' 
//         } 
//       },
//       timeout: 30000
//     });
//     
//     const data = response.data.items || response.data;
//     
//     if (!Array.isArray(data)) {
//       console.warn('[Eitje API] Availability shifts response is not an array:', typeof data);
//     }
//     
//     console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'availability shifts');
//     return data;
//   } catch (error) {
//     handleApiError(error, 'availability_shifts');
//   }
// }

// export async function fetchEitjeLeaveRequests(
//   baseUrl: string,
//   credentials: EitjeCredentials,
//   startDate: string,
//   endDate: string
// ) {
//   console.log('[Eitje API] Fetching leave requests:', { startDate, endDate });
//   
//   // DEFENSIVE: Validate inputs
//   validateBaseUrl(baseUrl);
//   validateCredentials(credentials);
//   validateDateRange(startDate, endDate, 7); // Max 7 days for shifts
//   
//   try {
//     const response = await axios({
//       method: 'GET',
//       url: `${baseUrl}/leave_requests`,
//       headers: createHeaders(credentials),
//       data: { 
//         filters: { 
//           start_date: startDate, 
//           end_date: endDate, 
//           date_filter_type: 'resource_date' 
//         } 
//       },
//       timeout: 30000
//     });
//     
//     const data = response.data.items || response.data;
//     
//     if (!Array.isArray(data)) {
//       console.warn('[Eitje API] Leave requests response is not an array:', typeof data);
//     }
//     
//     console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'leave requests');
//     return data;
//   } catch (error) {
//     handleApiError(error, 'leave_requests');
//   }
// }

// export async function fetchEitjeEvents(
//   baseUrl: string,
//   credentials: EitjeCredentials,
//   startDate: string,
//   endDate: string
// ) {
//   console.log('[Eitje API] Fetching events:', { startDate, endDate });
//   
//   // DEFENSIVE: Validate inputs
//   validateBaseUrl(baseUrl);
//   validateCredentials(credentials);
//   validateDateRange(startDate, endDate, 90); // Max 90 days for events
//   
//   try {
//     // DEFENSIVE: Events endpoint uses POST method
//     const response = await axios({
//       method: 'POST',
//       url: `${baseUrl}/events`,
//       headers: createHeaders(credentials),
//       data: { 
//         filters: { 
//           start_date: startDate, 
//           end_date: endDate, 
//           date_filter_type: 'resource_date' 
//         } 
//       },
//       timeout: 30000
//     });
//     
//     const data = response.data.items || response.data;
//     
//     if (!Array.isArray(data)) {
//       console.warn('[Eitje API] Events response is not an array:', typeof data);
//     }
//     
//     console.log('[Eitje API] Fetched', Array.isArray(data) ? data.length : 'not array', 'events');
//     return data;
//   } catch (error) {
//     handleApiError(error, 'events');
//   }
// }
