/**
 * REAL DATA SYNCHRONIZATION SERVICE
 * 
 * This service handles real-time data synchronization with Eitje API
 * using your actual credentials and implementing robust sync strategies.
 */

import { createClient } from '@supabase/supabase-js';
import { createEitjeApiService, EitjeApiConfig } from '@/lib/eitje/api-service';

export interface SyncConfig {
  enabled: boolean;
  interval: number; // minutes
  batchSize: number;
  retryAttempts: number;
  timeout: number;
  validateData: boolean;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  syncTime: number;
  lastSyncDate?: string;
  nextSyncDate?: string;
}

export class RealDataSyncService {
  private supabase: ReturnType<typeof createClient>;
  private config: SyncConfig;
  private isRunning: boolean = false;
  private lastSyncTime: Date | null = null;

  constructor(config: SyncConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * DEFENSIVE: Start real-time data synchronization
   */
  async startSync(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Sync is already running'
      };
    }

    try {
      console.log('[Real Data Sync] Starting synchronization service...');
      
      // DEFENSIVE: Get Eitje credentials from database
      const credentials = await this.getEitjeCredentials();
      if (!credentials) {
        throw new Error('No active Eitje credentials found');
      }

      // DEFENSIVE: Initialize Eitje API service
      const eitjeConfig: EitjeApiConfig = {
        baseUrl: credentials.base_url,
        apiKey: credentials.api_key,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        enableLogging: true,
        validateData: this.config.validateData
      };

      const eitjeService = createEitjeApiService(eitjeConfig);

      // DEFENSIVE: Test connection before starting sync
      const connectionTest = await eitjeService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Eitje connection failed: ${connectionTest.error}`);
      }

      this.isRunning = true;
      console.log('[Real Data Sync] Service started successfully');

      // DEFENSIVE: Start periodic sync
      this.schedulePeriodicSync(eitjeService);

      return {
        success: true,
        message: 'Real data synchronization started successfully'
      };

    } catch (error) {
      console.error('[Real Data Sync] Failed to start:', error);
      this.isRunning = false;
      return {
        success: false,
        message: `Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * DEFENSIVE: Stop synchronization
   */
  async stopSync(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Sync is not running'
      };
    }

    this.isRunning = false;
    console.log('[Real Data Sync] Service stopped');
    
    return {
      success: true,
      message: 'Real data synchronization stopped'
    };
  }

  /**
   * DEFENSIVE: Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSyncTime: Date | null;
    config: SyncConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      config: this.config
    };
  }

  /**
   * DEFENSIVE: Manual sync trigger
   */
  async triggerManualSync(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      console.log('[Real Data Sync] Manual sync triggered');

      // DEFENSIVE: Get credentials
      const credentials = await this.getEitjeCredentials();
      if (!credentials) {
        throw new Error('No active Eitje credentials found');
      }

      // DEFENSIVE: Initialize service
      const eitjeConfig: EitjeApiConfig = {
        baseUrl: credentials.base_url,
        apiKey: credentials.api_key,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        enableLogging: true,
        validateData: this.config.validateData
      };

      const eitjeService = createEitjeApiService(eitjeConfig);

      // DEFENSIVE: Fetch data with date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const dataResult = await eitjeService.fetchSalesData(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (!dataResult.success) {
        throw new Error(`Data fetch failed: ${dataResult.error}`);
      }

      // DEFENSIVE: Process and store data
      const syncResult = await this.processAndStoreData(dataResult.data || []);

      this.lastSyncTime = new Date();
      
      console.log('[Real Data Sync] Manual sync completed:', syncResult);
      
      return {
        success: true,
        recordsProcessed: syncResult.recordsProcessed,
        recordsAdded: syncResult.recordsAdded,
        recordsUpdated: syncResult.recordsUpdated,
        errors: syncResult.errors,
        syncTime: Date.now() - startTime,
        lastSyncDate: this.lastSyncTime.toISOString(),
        nextSyncDate: new Date(Date.now() + this.config.interval * 60000).toISOString()
      };

    } catch (error) {
      console.error('[Real Data Sync] Manual sync failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        errors: 1,
        syncTime: Date.now() - startTime
      };
    }
  }

  /**
   * DEFENSIVE: Get Eitje credentials from database
   */
  private async getEitjeCredentials(): Promise<any> {
    const { data, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('No active Eitje credentials found');
    }

    return data;
  }

  /**
   * DEFENSIVE: Schedule periodic synchronization
   */
  private schedulePeriodicSync(eitjeService: ReturnType<typeof createEitjeApiService>): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      if (this.isRunning) {
        try {
          console.log('[Real Data Sync] Running periodic sync...');
          await this.performSync(eitjeService);
        } catch (error) {
          console.error('[Real Data Sync] Periodic sync failed:', error);
        }
        
        // Schedule next sync
        this.schedulePeriodicSync(eitjeService);
      }
    }, this.config.interval * 60000); // Convert minutes to milliseconds
  }

  /**
   * DEFENSIVE: Perform actual synchronization
   */
  private async performSync(eitjeService: ReturnType<typeof createEitjeApiService>): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Last 24 hours

      const dataResult = await eitjeService.fetchSalesData(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (dataResult.success && dataResult.data) {
        await this.processAndStoreData(dataResult.data);
        this.lastSyncTime = new Date();
        console.log('[Real Data Sync] Periodic sync completed successfully');
      }
    } catch (error) {
      console.error('[Real Data Sync] Periodic sync failed:', error);
    }
  }

  /**
   * DEFENSIVE: Process and store synchronized data
   */
  private async processAndStoreData(data: any[]): Promise<{
    recordsProcessed: number;
    recordsAdded: number;
    recordsUpdated: number;
    errors: number;
  }> {
    let recordsProcessed = 0;
    let recordsAdded = 0;
    const recordsUpdated = 0;
    let errors = 0;

    try {
      // DEFENSIVE: Process data in batches
      for (let i = 0; i < data.length; i += this.config.batchSize) {
        const batch = data.slice(i, i + this.config.batchSize);
        
        for (const record of batch) {
          try {
            // DEFENSIVE: Validate record structure
            if (!this.validateRecord(record)) {
              errors++;
              continue;
            }

            // DEFENSIVE: Transform record for storage
            const transformedRecord = this.transformRecord(record);
            
            // DEFENSIVE: Store in database
            const { error } = await this.supabase
              .from('eitje_sales_data')
              .upsert(transformedRecord, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              });

            if (error) {
              console.error('[Real Data Sync] Database error:', error);
              errors++;
            } else {
              recordsProcessed++;
              // Note: We can't easily determine if it was insert or update with upsert
              recordsAdded++; // Simplified for now
            }

          } catch (recordError) {
            console.error('[Real Data Sync] Record processing error:', recordError);
            errors++;
          }
        }
      }

      console.log(`[Real Data Sync] Processed ${recordsProcessed} records, ${errors} errors`);
      
      return {
        recordsProcessed,
        recordsAdded,
        recordsUpdated,
        errors
      };

    } catch (error) {
      console.error('[Real Data Sync] Data processing failed:', error);
      throw error;
    }
  }

  /**
   * DEFENSIVE: Validate record structure
   */
  private validateRecord(record: unknown): boolean {
    return !!(
      record &&
      typeof record === 'object' &&
      record !== null &&
      'id' in record &&
      'date' in record &&
      'revenue' in record
    );
  }

  /**
   * DEFENSIVE: Transform record for storage
   */
  private transformRecord(record: unknown): Record<string, unknown> {
    const rec = record as Record<string, unknown>;
    return {
      id: rec.id || '',
      location_id: rec.location_id || null,
      date: rec.date || '',
      product_name: rec.product_name || 'Unknown',
      category: rec.category || null,
      quantity: rec.quantity || 0,
      price: rec.price || 0,
      revenue: rec.revenue || 0,
      raw_data: record,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * DEFENSIVE: Create sync service instance
 */
export function createRealDataSyncService(config: SyncConfig): RealDataSyncService {
  return new RealDataSyncService(config);
}

/**
 * DEFENSIVE: Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  interval: 15, // 15 minutes
  batchSize: 100,
  retryAttempts: 3,
  timeout: 30000,
  validateData: true
};
