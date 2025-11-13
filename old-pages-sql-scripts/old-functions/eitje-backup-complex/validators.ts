/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/lib/eitje/_backup_complex
 */

/**
 * EITJE API VALIDATORS
 * 
 * Focused validation logic for Eitje API data and configuration
 */

import { EitjeApiConfig, EitjeApiResponse, DataValidationResult } from './types';

export class EitjeValidators {
  /**
   * DEFENSIVE: Validate configuration
   */
  static validateConfig(config: EitjeApiConfig): void {
    if (!config.baseUrl) {
      throw new Error('Eitje API baseUrl is required');
    }
    
    if (!config.additional_config) {
      throw new Error('Eitje API additional_config is required for 4-credential authentication');
    }
    
    const { partner_username, partner_password, api_username, api_password } = config.additional_config;
    
    if (!partner_username || !partner_password || !api_username || !api_password) {
      throw new Error('All 4 Eitje credentials are required: partner_username, partner_password, api_username, api_password');
    }
    
    if (config.timeout < 1000 || config.timeout > 60000) {
      throw new Error('Timeout must be between 1000ms and 60000ms');
    }
    
    if (config.retryAttempts < 1 || config.retryAttempts > 10) {
      throw new Error('Retry attempts must be between 1 and 10');
    }
  }

  /**
   * DEFENSIVE: Validate date range against endpoint limits
   */
  static validateDateRange(startDate: string, endDate: string, maxDays: number): EitjeApiResponse {
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
    
    // DEFENSIVE: Use safety margin (1 day less than max)
    const safeMaxDays = maxDays - 1;
    
    if (daysDiff > safeMaxDays) {
      return {
        success: false,
        error: `Date range too large: ${daysDiff} days. Maximum safe range: ${safeMaxDays} days (${maxDays} max with safety margin)`,
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
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  /**
   * DEFENSIVE: Validate data quality
   */
  static validateData(data: any[]): DataValidationResult[] {
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
}
