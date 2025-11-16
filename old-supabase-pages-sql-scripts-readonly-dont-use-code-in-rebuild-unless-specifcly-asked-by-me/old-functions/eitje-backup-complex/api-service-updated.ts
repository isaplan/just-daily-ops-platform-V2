/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API SERVICE - EXTREME DEFENSIVE MODE
 * 
 * This service implements comprehensive defensive programming for Eitje API integration:
 * - 4-credential header authentication (Partner-Username, Partner-Password, Api-Username, Api-Password)
 * - Timeout protection
 * - Retry logic with exponential backoff
 * - Data validation and sanitization
 * - Error handling and logging
 * - Rate limiting protection
 * - Data quality checks
 */

export interface EitjeApiConfig {
  baseUrl: string;
  apiKey: string; // Keep for compatibility
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
  validateData: boolean;
  additional_config: {
    partner_username: string;
    partner_password: string;
    api_username: string;
    api_password: string;
    content_type?: string;
    accept?: string;
  };
}

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
    method: 'GET', 
    requiresDates: true, 
    maxDays: 7,
    description: 'Actual worked shifts with clock-in/clock-out times',
    table: 'eitje_time_registration_shifts_raw'
  },
  planning_shifts: { 
    path: '/planning_shifts', 
    method: 'GET', 
    requiresDates: true, 
    maxDays: 7,
    description: 'Planned/scheduled shifts',
    table: 'eitje_planning_shifts_raw'
  },
  
  // Revenue data (90-day max)
  revenue_days: { 
    path: '/revenue_days', 
    method: 'GET', 
    requiresDates: true, 
    maxDays: 90,
    description: 'Daily revenue data per environment',
    table: 'eitje_revenue_days_raw'
  }
};

export interface EitjeShiftResponse {
  id: number;
  date: string;
  user_id?: number;
  team_id?: number;
  environment_id?: number;
  
  // Time fields (multiple naming conventions)
  start_time?: string;
  start?: string;
  startDateTime?: string;
  end_time?: string;
  end?: string;
  endDateTime?: string;
  
  // Break fields
  break_minutes?: number;
  breaks?: number;
  breakMinutes?: number;
  
  // Hours fields
  hours_worked?: number;
  hours?: number;
  totalHours?: number;
  
  // Cost fields (may be nested)
  wage_cost?: number;
  costs?: {
    wage?: number;
    [key: string]: any;
  };
  
  // Metadata
  status?: string;
  skill_set?: string;
  shift_type?: string;
}

export interface EitjeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  responseTime: number;
  retryCount: number;
}

export interface DataValidationResult {
  field: string;
  status: 'valid' | 'invalid' | 'missing';
  value: any;
  message: string;
}

export class EitjeApiService {
  private config: EitjeApiConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly rateLimitDelay = 100; // 100ms between requests

  constructor(config: EitjeApiConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * DEFENSIVE: Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new Error('Eitje API baseUrl is required');
    }
    
    if (!this.config.additional_config) {
      throw new Error('Eitje API additional_config is required for 4-credential authentication');
    }
    
    const { partner_username, partner_password, api_username, api_password } = this.config.additional_config;
    
    if (!partner_username || !partner_password || !api_username || !api_password) {
      throw new Error('All 4 Eitje credentials are required: partner_username, partner_password, api_username, api_password');
    }
    
    if (this.config.timeout < 1000 || this.config.timeout > 60000) {
      throw new Error('Timeout must be between 1000ms and 60000ms');
    }
    
    if (this.config.retryAttempts < 1 || this.config.retryAttempts > 10) {
      throw new Error('Retry attempts must be between 1 and 10');
    }
  }

  /**
   * DEFENSIVE: Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * DEFENSIVE: Create Eitje authentication headers
   */
  private createEitjeAuthHeaders(): Record<string, string> {
    const { partner_username, partner_password, api_username, api_password } = this.config.additional_config;
    
    return {
      'Partner-Username': partner_username,
      'Partner-Password': partner_password,
      'Api-Username': api_username,
      'Api-Password': api_password,
      'Content-Type': this.config.additional_config.content_type || 'application/json',
      'Accept': this.config.additional_config.accept || 'application/json'
    };
  }

  /**
   * DEFENSIVE: Make API request with comprehensive error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    retryCount = 0
  ): Promise<EitjeApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // DEFENSIVE: Rate limiting
      await this.enforceRateLimit();
      
      // DEFENSIVE: Build request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      // DEFENSIVE: Create Eitje authentication headers
      const authHeaders = this.createEitjeAuthHeaders();
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          ...authHeaders,
          'X-Request-ID': `eitje-${Date.now()}-${retryCount}`,
          'X-Client-Version': '1.0.0',
          'User-Agent': 'JustDailyOps-EitjeIntegration/1.0.0'
        },
        signal: controller.signal
      };
      
      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }
      
      // DEFENSIVE: Log request (if enabled)
      if (this.config.enableLogging) {
        console.log(`[Eitje API] ${method} ${endpoint} (attempt ${retryCount + 1})`);
      }
      
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, requestOptions);
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      // DEFENSIVE: Handle different response types
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }
      
      // DEFENSIVE: Check for API errors in response
      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data !== null && 'message' in data 
          ? (data as any).message 
          : `HTTP ${response.status}: ${response.statusText}`;
        
        // DEFENSIVE: Handle specific Eitje API errors
        if (response.status === 401) {
          throw new Error(`Authentication failed: ${errorMessage}. Check all 4 credentials.`);
        }
        
        if (response.status === 400 && errorMessage.includes('invalid date range')) {
          throw new Error(`Date range too large: ${errorMessage}. Use smaller date range.`);
        }
        
        if (response.status === 400 && errorMessage.includes('Missing start_date')) {
          throw new Error(`Missing required date filters: ${errorMessage}`);
        }
        
        throw new Error(`API Error ${response.status}: ${errorMessage}`);
      }
      
      // DEFENSIVE: Validate data if enabled
      if (this.config.validateData && Array.isArray(data)) {
        const validationResults = this.validateData(data);
        const hasErrors = validationResults.some(r => r.status === 'invalid' || r.status === 'missing');
        
        if (hasErrors) {
          console.warn('[Eitje API] Data validation warnings:', validationResults);
        }
      }
      
      return {
        success: true,
        data,
        statusCode: response.status,
        responseTime,
        retryCount
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // DEFENSIVE: Retry logic with exponential backoff
      if (retryCount < this.config.retryAttempts && this.shouldRetry(error)) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[Eitje API] Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.retryAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest<T>(endpoint, method, body, retryCount + 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 0,
        responseTime,
        retryCount
      };
    }
  }

  /**
   * DEFENSIVE: Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    if (error.name === 'AbortError') return true; // Timeout
    if (error.message?.includes('fetch failed')) return true; // Network error
    if (error.message?.includes('timeout')) return true; // Timeout error
    return false;
  }

  /**
   * DEFENSIVE: Validate data quality
   */
  private validateData(data: any[]): DataValidationResult[] {
    const results: DataValidationResult[] = [];
    
    if (!Array.isArray(data)) {
      results.push({
        field: 'data',
        status: 'invalid',
        value: data,
        message: 'Expected array of records'
      });
      return results;
    }
    
    data.forEach((record, index) => {
      if (!record || typeof record !== 'object') {
        results.push({
          field: `record[${index}]`,
          status: 'invalid',
          value: record,
          message: 'Record must be an object'
        });
        return;
      }
      
      // Check for required fields
      if (!record.id) {
        results.push({
          field: `record[${index}].id`,
          status: 'missing',
          value: record.id,
          message: 'Record ID is required'
        });
      }
    });
    
    return results;
  }

  /**
   * DEFENSIVE: Test connection to Eitje API
   */
  async testConnection(): Promise<EitjeApiResponse> {
    try {
      // Test with environments endpoint (no date filtering required)
      const response = await this.makeRequest('/environments');
      
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
  async fetchMasterData(endpoint: keyof typeof EITJE_ENDPOINTS): Promise<EitjeApiResponse> {
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
    
    return this.makeRequest(endpointConfig.path, endpointConfig.method);
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
    const dateRange = this.validateDateRange(startDate, endDate, 7);
    if (!dateRange.success) {
      return dateRange;
    }
    
    // DEFENSIVE: Build filters
    const filters: any = {
      start_date: startDate,
      end_date: endDate,
      date_filter_type: 'resource_date'
    };
    
    if (environmentId) {
      filters.environment_id = environmentId;
    }
    
    const response = await this.makeRequest<EitjeShiftResponse[]>('/time_registration_shifts', 'GET');
    
    if (response.success && response.data) {
      // DEFENSIVE: Apply field mapping
      const mappedData = response.data.map(record => this.mapShiftFields(record));
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
    const dateRange = this.validateDateRange(startDate, endDate, 7);
    if (!dateRange.success) {
      return dateRange;
    }
    
    // DEFENSIVE: Build filters
    const filters: any = {
      start_date: startDate,
      end_date: endDate,
      date_filter_type: 'resource_date'
    };
    
    if (environmentId) {
      filters.environment_id = environmentId;
    }
    
    const response = await this.makeRequest<EitjeShiftResponse[]>('/planning_shifts', 'GET');
    
    if (response.success && response.data) {
      // DEFENSIVE: Apply field mapping
      const mappedData = response.data.map(record => this.mapShiftFields(record));
      return {
        ...response,
        data: mappedData
      };
    }
    
    return response;
  }

  /**
   * DEFENSIVE: Validate date range against endpoint limits
   */
  private validateDateRange(startDate: string, endDate: string, maxDays: number): EitjeApiResponse {
    // DEFENSIVE: Validate date format
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    // DEFENSIVE: Check date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > maxDays) {
      return {
        success: false,
        error: `Date range too large: ${daysDiff} days. Maximum allowed: ${maxDays} days`,
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    if (start > end) {
      return {
        success: false,
        error: 'Start date cannot be after end date',
        statusCode: 400,
        responseTime: 0,
        retryCount: 0
      };
    }
    
    return {
      success: true,
      statusCode: 200,
      responseTime: 0,
      retryCount: 0
    };
  }

  /**
   * DEFENSIVE: Validate date format
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  /**
   * DEFENSIVE: Map shift fields with fallbacks
   */
  private mapShiftFields(record: any): EitjeShiftResponse {
    return {
      id: record.id,
      date: record.date,
      user_id: record.user_id,
      team_id: record.team_id,
      environment_id: record.environment_id,
      
      // Time fields with fallbacks
      start_time: record.start_time || record.start || record.startDateTime,
      end_time: record.end_time || record.end || record.endDateTime,
      
      // Break fields with fallbacks
      break_minutes: record.break_minutes || record.breaks || record.breakMinutes,
      
      // Hours fields with fallbacks
      hours_worked: record.hours_worked || record.hours || record.totalHours,
      
      // Cost fields with fallbacks
      wage_cost: record.wage_cost || record.costs?.wage || record.wageCost,
      costs: record.costs,
      
      // Metadata
      status: record.status,
      skill_set: record.skill_set,
      shift_type: record.shift_type
    };
  }

  /**
   * DEFENSIVE: Get service statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
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
