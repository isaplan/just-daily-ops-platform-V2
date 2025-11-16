/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API SERVICE
 * 
 * Main service that orchestrates Eitje API operations using focused modules
 */

import { EitjeApiConfig, EitjeApiResponse, EitjeShiftResponse } from './types';
import { EITJE_ENDPOINTS, EitjeEndpoint, DEFAULT_CONFIG } from './config';
import { EitjeHttpClient } from './client';
import { EitjeValidators } from './validators';
import { EitjeMappers } from './mappers';

export class EitjeApiService {
  private config: EitjeApiConfig;
  private httpClient: EitjeHttpClient;

  constructor(config: EitjeApiConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    EitjeValidators.validateConfig(this.config);
    this.httpClient = new EitjeHttpClient(this.config);
  }

  /**
   * DEFENSIVE: Test connection to Eitje API
   */
  async testConnection(): Promise<EitjeApiResponse> {
    try {
      // Test with environments endpoint (no date filtering required)
      const response = await this.httpClient.makeFetchRequest('/environments');
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          statusCode: response.statusCode,
          responseTime: response.responseTime,
          retryCount: response.retryCount
        };
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        statusCode: 0,
        responseTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * DEFENSIVE: Fetch master data (no date filtering)
   */
  async fetchMasterData(endpoint: EitjeEndpoint): Promise<EitjeApiResponse> {
    const endpointConfig = EITJE_ENDPOINTS[endpoint];
    
    if (!endpointConfig) {
      return {
        success: false,
        error: `Unknown endpoint: ${endpoint}`,
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    if (endpointConfig.requiresDates) {
      return {
        success: false,
        error: `Endpoint ${endpoint} requires date filtering`,
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    return this.httpClient.makeFetchRequest(endpointConfig.path, endpointConfig.method);
  }

  /**
   * DEFENSIVE: Fetch environments (master data)
   */
  async fetchEnvironments(): Promise<EitjeApiResponse> {
    return this.fetchMasterData('environments');
  }

  /**
   * DEFENSIVE: Fetch teams (master data)
   */
  async fetchTeams(): Promise<EitjeApiResponse> {
    return this.fetchMasterData('teams');
  }

  /**
   * DEFENSIVE: Fetch users (master data)
   */
  async fetchUsers(): Promise<EitjeApiResponse> {
    return this.fetchMasterData('users');
  }

  /**
   * DEFENSIVE: Fetch shift types (master data)
   */
  async fetchShiftTypes(): Promise<EitjeApiResponse> {
    return this.fetchMasterData('shift_types');
  }

  /**
   * DEFENSIVE: Fetch time registration shifts (7-day max)
   */
  async fetchTimeRegistrationShifts(
    startDate: string, 
    endDate: string, 
    environmentId?: number
  ): Promise<EitjeApiResponse<EitjeShiftResponse[]>> {
    // DEFENSIVE: Validate date range
    const dateRange = EitjeValidators.validateDateRange(startDate, endDate, 7);
    if (!dateRange.success) {
      return dateRange;
    }
    
    // DEFENSIVE: Build filters as per Eitje API docs (GET with body using axios)
    const filters: any = {
      start_date: startDate,
      end_date: endDate,
      date_filter_type: 'resource_date'
    };
    
    if (environmentId) {
      filters.environment_id = environmentId;
    }
    
    // Use axios for GET with body (Eitje API requires GET with body)
    const response = await this.httpClient.makeAxiosRequest<EitjeShiftResponse[]>('/time_registration_shifts', 'GET', { filters });
    
    if (response.success && response.data) {
      // DEFENSIVE: Apply field mapping
      const mappedData = response.data.map(record => EitjeMappers.mapShiftFields(record));
      return {
        ...response,
        data: mappedData
      };
    }
    
    return response;
  }

  /**
   * DEFENSIVE: Fetch planning shifts (7-day max)
   */
  async fetchPlanningShifts(
    startDate: string, 
    endDate: string, 
    environmentId?: number
  ): Promise<EitjeApiResponse<EitjeShiftResponse[]>> {
    // DEFENSIVE: Validate date range
    const dateRange = EitjeValidators.validateDateRange(startDate, endDate, 7);
    if (!dateRange.success) {
      return dateRange;
    }
    
    // DEFENSIVE: Build filters as per Eitje API docs (GET with body using axios)
    const filters: any = {
      start_date: startDate,
      end_date: endDate,
      date_filter_type: 'resource_date'
    };
    
    if (environmentId) {
      filters.environment_id = environmentId;
    }
    
    // Use axios for GET with body (Eitje API requires GET with body)
    const response = await this.httpClient.makeAxiosRequest<EitjeShiftResponse[]>('/planning_shifts', 'GET', { filters });
    
    if (response.success && response.data) {
      // DEFENSIVE: Apply field mapping
      const mappedData = response.data.map(record => EitjeMappers.mapShiftFields(record));
      return {
        ...response,
        data: mappedData
      };
    }
    
    return response;
  }

  /**
   * DEFENSIVE: Fetch revenue days (90-day max)
   */
  async fetchRevenueDays(
    startDate: string, 
    endDate: string, 
    environmentId?: number
  ): Promise<EitjeApiResponse> {
    // DEFENSIVE: Validate date range
    const dateRange = EitjeValidators.validateDateRange(startDate, endDate, 90);
    if (!dateRange.success) {
      return dateRange;
    }
    
    // DEFENSIVE: Build filters as per Eitje API docs (GET with body using axios)
    const filters: any = {
      start_date: startDate,
      end_date: endDate,
      date_filter_type: 'resource_date'
    };
    
    if (environmentId) {
      filters.environment_id = environmentId;
    }
    
    // Use axios for GET with body (Eitje API requires GET with body)
    const response = await this.httpClient.makeAxiosRequest(`/revenue_days`, 'GET', { filters });
    
    if (response.success && response.data) {
      // DEFENSIVE: Apply field mapping for revenue data
      const mappedData = Array.isArray(response.data) 
        ? response.data.map(record => EitjeMappers.mapRevenueFields(record))
        : response.data;
      
      return {
        ...response,
        data: mappedData
      };
    }
    
    return response;
  }

  /**
   * DEFENSIVE: Test specific endpoint with small date range
   */
  async testEndpoint(
    endpoint: EitjeEndpoint,
    startDate?: string,
    endDate?: string,
    environmentId?: number
  ): Promise<EitjeApiResponse> {
    const endpointConfig = EITJE_ENDPOINTS[endpoint];
    
    if (!endpointConfig) {
      return {
        success: false,
        error: `Unknown endpoint: ${endpoint}`,
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    try {
      let response: EitjeApiResponse;
      
      if (endpointConfig.requiresDates) {
        // DEFENSIVE: Use small date range for testing (1-2 days)
        const testStartDate = startDate || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const testEndDate = endDate || new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        switch (endpoint) {
          case 'time_registration_shifts':
            response = await this.fetchTimeRegistrationShifts(testStartDate, testEndDate, environmentId);
            break;
          case 'planning_shifts':
            response = await this.fetchPlanningShifts(testStartDate, testEndDate, environmentId);
            break;
          case 'revenue_days':
            response = await this.fetchRevenueDays(testStartDate, testEndDate, environmentId);
            break;
          default:
            return {
              success: false,
              error: `Endpoint ${endpoint} requires dates but no handler implemented`,
              statusCode: 400,
              responseTime: 0,
              retryCount: 0
            };
        }
      } else {
        // Master data endpoints
        response = await this.fetchMasterData(endpoint);
      }
      
      return {
        ...response,
        endpoint: endpoint,
        endpointConfig: endpointConfig,
        testMode: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during endpoint test',
        statusCode: 0,
        responseTime: 0,
        retryCount: 0,
        endpoint: endpoint,
        testMode: true
      };
    }
  }

  /**
   * DEFENSIVE: Test all available endpoints
   */
  async testAllEndpoints(): Promise<Record<string, EitjeApiResponse>> {
    const results: Record<string, EitjeApiResponse> = {};
    
    // Test master data endpoints (no dates required)
    const masterEndpoints: EitjeEndpoint[] = ['environments', 'teams', 'users', 'shift_types'];
    
    for (const endpoint of masterEndpoints) {
      results[endpoint] = await this.testEndpoint(endpoint);
    }
    
    // Test labor endpoints with small date range
    const laborEndpoints: EitjeEndpoint[] = ['time_registration_shifts', 'planning_shifts'];
    
    for (const endpoint of laborEndpoints) {
      results[endpoint] = await this.testEndpoint(endpoint);
    }
    
    // Test revenue endpoint with small date range
    results['revenue_days'] = await this.testEndpoint('revenue_days');
    
    return results;
  }

  /**
   * DEFENSIVE: Get service statistics
   */
  getStats() {
    return {
      ...this.httpClient.getStats(),
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        enableLogging: this.config.enableLogging,
        validateData: this.config.validateData
        // Hide sensitive data
      }
    };
  }
}

/**
 * DEFENSIVE: Factory function to create Eitje API service
 */
export function createEitjeApiService(config: EitjeApiConfig): EitjeApiService {
  return new EitjeApiService(config);
}
