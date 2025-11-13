/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API CONFIGURATION
 * 
 * Centralized configuration for Eitje API endpoints and settings
 */

// Endpoint configuration based on Eitje API documentation
export const EITJE_ENDPOINTS = {
  // Master data (no date filtering)
  environments: { 
    path: '/environments', 
    method: 'GET', 
    requiresDates: false,
    description: 'Lists all environments (locations/venues) in the organization'
  },
  teams: { 
    path: '/teams', 
    method: 'GET', 
    requiresDates: false,
    description: 'Lists all teams within environments (e.g., kitchen, bar)'
  },
  users: { 
    path: '/users', 
    method: 'GET', 
    requiresDates: false,
    description: 'Lists all users in the organization'
  },
  shift_types: { 
    path: '/shift_types', 
    method: 'GET', 
    requiresDates: false,
    description: 'Lists available shift types'
  },
  
  // Labor/hours data (7-day max)
  time_registration_shifts: { 
    path: '/time_registration_shifts', 
    method: 'GET', // GET with body using axios
    requiresDates: true, 
    maxDays: 7,
    description: 'Actual worked shifts with clock-in/clock-out times',
    table: 'eitje_time_registration_shifts_raw'
  },
  planning_shifts: { 
    path: '/planning_shifts', 
    method: 'GET', // GET with body using axios
    requiresDates: true, 
    maxDays: 7,
    description: 'Planned/scheduled shifts',
    table: 'eitje_planning_shifts_raw'
  },
  
  // Revenue data (90-day max)
  revenue_days: { 
    path: '/revenue_days', 
    method: 'GET', // GET with body using axios
    requiresDates: true, 
    maxDays: 90,
    description: 'Daily revenue data per environment',
    table: 'eitje_revenue_days_raw'
  }
} as const;

export type EitjeEndpoint = keyof typeof EITJE_ENDPOINTS;

// Default configuration values
export const DEFAULT_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true,
  validateData: true,
  rateLimitDelay: 100 // 100ms between requests
} as const;
