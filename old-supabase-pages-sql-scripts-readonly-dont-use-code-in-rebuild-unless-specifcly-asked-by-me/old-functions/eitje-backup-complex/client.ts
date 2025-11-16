/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API HTTP CLIENT
 * 
 * Focused HTTP client for Eitje API requests with axios support
 */

import axios from 'axios';
import { EitjeApiConfig, EitjeApiResponse } from './types';

export class EitjeHttpClient {
  private config: EitjeApiConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly rateLimitDelay = 100; // 100ms between requests

  constructor(config: EitjeApiConfig) {
    this.config = config;
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
  private createAuthHeaders(): Record<string, string> {
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
   * DEFENSIVE: Make axios request for GET with body (Eitje API requirement)
   */
  async makeAxiosRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    retryCount = 0
  ): Promise<EitjeApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // DEFENSIVE: Rate limiting
      await this.enforceRateLimit();
      
      // DEFENSIVE: Create Eitje authentication headers
      const authHeaders = this.createAuthHeaders();
      
      // DEFENSIVE: Log request (if enabled)
      if (this.config.enableLogging) {
        console.log(`[Eitje API] ${method} ${endpoint} (attempt ${retryCount + 1})`);
      }
      
      const response = await axios({
        method,
        url: `${this.config.baseUrl}${endpoint}`,
        headers: {
          ...authHeaders,
          'X-Request-ID': `eitje-${Date.now()}-${retryCount}`,
          'X-Client-Version': '1.0.0',
          'User-Agent': 'JustDailyOps-EitjeIntegration/1.0.0'
        },
        data: body, // Axios supports GET with body
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      // DEFENSIVE: Validate response
      if (this.config.validateData && response.data) {
        if (typeof response.data !== 'object') {
          throw new Error('Invalid response format');
        }
      }
      
      // DEFENSIVE: Handle Eitje API response structure (items array)
      let data = response.data;
      if (data && typeof data === 'object' && data.items && Array.isArray(data.items)) {
        data = data.items; // Extract the items array
      }
      
      return {
        success: true,
        data: data,
        statusCode: response.status,
        responseTime,
        retryCount
      };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // DEFENSIVE: Retry logic
      if (this.shouldRetry(error) && retryCount < this.config.retryAttempts) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeAxiosRequest<T>(endpoint, method, body, retryCount + 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: error.response?.status || 0,
        responseTime,
        retryCount
      };
    }
  }

  /**
   * DEFENSIVE: Make regular fetch request (for master data)
   */
  async makeFetchRequest<T>(
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
      const authHeaders = this.createAuthHeaders();
      
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
        
        throw new Error(`API Error ${response.status}: ${errorMessage}`);
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
        return this.makeFetchRequest<T>(endpoint, method, body, retryCount + 1);
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
   * Get client statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }
}
