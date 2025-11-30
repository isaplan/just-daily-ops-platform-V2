/**
 * Cron Job Manager for V2
 * 
 * Manages cron jobs for Eitje API sync operations
 * Uses node-cron for scheduling and MongoDB for persistence
 */

import cron from 'node-cron';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { EITJE_DATE_LIMITS } from '@/lib/eitje/v2-types';

export interface CronJobConfig {
  _id?: ObjectId;
  jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard';
  isActive: boolean;
  schedule: string; // Cron expression
  syncInterval?: number; // For daily data (minutes) or master data (seconds)
  enabledEndpoints?: {
    hours?: boolean;
    revenue?: boolean;
    planning?: boolean;
    sales?: boolean; // For Bork
  };
  enabledMasterEndpoints?: {
    // Eitje master endpoints
    environments?: boolean;
    teams?: boolean;
    users?: boolean;
    shiftTypes?: boolean;
    // Bork master endpoints
    product_groups?: boolean;
    payment_methods?: boolean;
    cost_centers?: boolean;
    users?: boolean; // Bork users/employees
  };
  quietHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class CronJobManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private db: any = null;

  async initialize() {
    this.db = await getDatabase();
    await this.loadAndScheduleJobs();
  }

  /**
   * Convert minutes to cron expression
   */
  private minutesToCron(minutes: number): string {
    if (minutes < 60) {
      // Every X minutes: */X * * * *
      return `*/${minutes} * * * *`;
    } else {
      // Every X hours: 0 */X * * *
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  /**
   * Load cron jobs from MongoDB and schedule them
   */
  async loadAndScheduleJobs() {
    if (!this.db) {
      this.db = await getDatabase();
    }

    const jobs = await this.db.collection('cron_jobs').find({ isActive: true }).toArray();
    
    for (const jobConfig of jobs) {
      await this.scheduleJob(jobConfig);
    }
  }

  /**
   * Schedule a cron job
   */
  async scheduleJob(config: CronJobConfig): Promise<void> {
    const jobId = config._id?.toString() || `${config.jobType}-${Date.now()}`;
    
    // Stop existing job if any
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId)?.stop();
      this.jobs.delete(jobId);
    }

    // Validate cron expression
    if (!cron.validate(config.schedule)) {
      throw new Error(`Invalid cron expression: ${config.schedule}`);
    }

    // Create and schedule the job
    const task = cron.schedule(config.schedule, async () => {
      console.log(`[Cron Job] Executing ${config.jobType} job at ${new Date().toISOString()}`);
      
      try {
        await this.executeJob(config);
        
        // Update last run time
        await this.db.collection('cron_jobs').updateOne(
          { _id: config._id },
          { 
            $set: { 
              lastRun: new Date(),
              updatedAt: new Date()
            }
          }
        );
      } catch (error: any) {
        console.error(`[Cron Job] Error executing ${config.jobType}:`, error);
      }
    }, {
      scheduled: config.isActive,
      timezone: 'Europe/Amsterdam', // Adjust to your timezone
    });

    this.jobs.set(jobId, task);
    console.log(`[Cron Job] Scheduled ${config.jobType} with schedule ${config.schedule}, active: ${config.isActive}`);
  }

  /**
   * Execute a cron job
   */
  private async executeJob(config: CronJobConfig): Promise<void> {
    // Get base URL for internal API calls
    // Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL (with https) > localhost
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      // Vercel automatically sets VERCEL_URL (e.g., "your-app.vercel.app")
      // We need to add https:// protocol
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        baseUrl = `https://${vercelUrl}`;
      } else {
        // Fallback to localhost for development
        baseUrl = 'http://localhost:3000';
      }
    }
    
    // Ensure baseUrl doesn't have trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    console.log(`[Cron Job] Executing ${config.jobType} job with baseUrl: ${baseUrl}`);
    
    if (config.jobType === 'daily-data') {
      // Execute daily data sync
      const enabledEndpoints = config.enabledEndpoints || {};
      const endpointMap: Record<string, string> = {
        hours: 'time_registration_shifts',
        revenue: 'revenue_days',
        planning: 'planning_shifts',
      };

      // Get today's date for sync (to include partial data from today for hourly updates)
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Check quiet hours
      if (config.quietHours) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        const [startHour, startMin] = config.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = config.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        if (currentTimeMinutes >= startTime && currentTimeMinutes <= endTime) {
          console.log(`[Cron Job] Skipping sync during quiet hours (${config.quietHours.start} - ${config.quietHours.end})`);
          return;
        }
      }

      // Sync each enabled endpoint
      for (const [key, enabled] of Object.entries(enabledEndpoints)) {
        if (enabled && endpointMap[key]) {
          try {
            const syncUrl = `${baseUrl}/api/eitje/v2/sync`;
            console.log(`[Cron Job] Syncing ${endpointMap[key]} via ${syncUrl}`);
            
            const response = await fetch(syncUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startDate,
                endDate,
                endpoint: endpointMap[key],
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`[Cron Job] Synced ${endpointMap[key]}: ${result.recordsSaved || 0} records`);
          } catch (error: any) {
            console.error(`[Cron Job] Error syncing ${endpointMap[key]}:`, error.message);
            console.error(`[Cron Job] Base URL used: ${baseUrl}`);
            console.error(`[Cron Job] Full error:`, error);
          }
        }
      }
    } else if (config.jobType === 'master-data') {
      // Execute master data sync
      const enabledEndpoints = config.enabledMasterEndpoints || {};
      const endpointMap: Record<string, string> = {
        environments: 'environments',
        teams: 'teams',
        users: 'users',
        shiftTypes: 'shift_types',
      };

      // Sync each enabled master endpoint
      for (const [key, enabled] of Object.entries(enabledEndpoints)) {
        if (enabled && endpointMap[key]) {
          try {
            const syncUrl = `${baseUrl}/api/eitje/v2/sync`;
            console.log(`[Cron Job] Syncing master data ${endpointMap[key]} via ${syncUrl}`);
            
            const response = await fetch(syncUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint: endpointMap[key],
                // Master endpoints don't require dates
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`[Cron Job] Synced ${endpointMap[key]}: ${result.recordsSaved || 0} records`);
          } catch (error: any) {
            console.error(`[Cron Job] Error syncing ${endpointMap[key]}:`, error.message);
            console.error(`[Cron Job] Base URL used: ${baseUrl}`);
            console.error(`[Cron Job] Full error:`, error);
          }
        }
      }
    } else if (config.jobType === 'historical-data') {
      // Execute historical data sync (last 30 days to catch any missed changes)
      const enabledEndpoints = config.enabledEndpoints || {};
      const endpointMap: Record<string, string> = {
        hours: 'time_registration_shifts',
        revenue: 'revenue_days',
        planning: 'planning_shifts',
      };

      // Get last 30 days date range
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const overallStartDate = thirtyDaysAgo.toISOString().split('T')[0];
      const overallEndDate = today.toISOString().split('T')[0];

      console.log(`[Cron Job] Historical sync: fetching last 30 days (${overallStartDate} to ${overallEndDate})`);

      // Helper function to split date range into chunks
      const splitDateRange = (startDate: string, endDate: string, maxDays: number): Array<{ startDate: string; endDate: string }> => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        if (totalDays <= maxDays) {
          return [{ startDate, endDate }];
        }

        const chunks: Array<{ startDate: string; endDate: string }> = [];
        let currentStart = new Date(start);
        
        while (currentStart < end) {
          const currentEnd = new Date(currentStart);
          currentEnd.setDate(currentEnd.getDate() + maxDays - 1); // -1 because we include both start and end
          
          if (currentEnd > end) {
            currentEnd.setTime(end.getTime());
          }
          
          chunks.push({
            startDate: currentStart.toISOString().split('T')[0],
            endDate: currentEnd.toISOString().split('T')[0],
          });
          
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + 1); // Move to next day
        }
        
        return chunks;
      };

      // Sync each enabled endpoint
      for (const [key, enabled] of Object.entries(enabledEndpoints)) {
        if (enabled && endpointMap[key]) {
          const endpoint = endpointMap[key];
          const maxDays = (EITJE_DATE_LIMITS as any)[endpoint] || 7; // Default to 7 days if not found
          
          // Split into chunks if needed
          const dateChunks = splitDateRange(overallStartDate, overallEndDate, maxDays);
          
          console.log(`[Cron Job] Historical sync ${endpoint}: splitting into ${dateChunks.length} chunk(s) (max ${maxDays} days per chunk)`);
          
          let totalRecords = 0;
          
          for (const chunk of dateChunks) {
            try {
              const syncUrl = `${baseUrl}/api/eitje/v2/sync`;
              console.log(`[Cron Job] Historical sync ${endpoint} (${chunk.startDate} to ${chunk.endDate}) via ${syncUrl}`);
              
              const response = await fetch(syncUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  startDate: chunk.startDate,
                  endDate: chunk.endDate,
                  endpoint,
                }),
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
              
              const result = await response.json();
              const recordsSaved = result.recordsSaved || 0;
              totalRecords += recordsSaved;
              console.log(`[Cron Job] Historical sync ${endpoint} (${chunk.startDate} to ${chunk.endDate}): ${recordsSaved} records`);
            } catch (error: any) {
              console.error(`[Cron Job] Error in historical sync ${endpoint} (${chunk.startDate} to ${chunk.endDate}):`, error.message);
              console.error(`[Cron Job] Base URL used: ${baseUrl}`);
              console.error(`[Cron Job] Full error:`, error);
            }
          }
          
          console.log(`[Cron Job] Historical sync ${endpoint} completed: ${totalRecords} total records`);
        }
      }
    } else if (config.jobType === 'bork-master-data') {
      // Execute Bork master data sync (product groups, payment methods, cost centers, users)
      const enabledEndpoints = config.enabledMasterEndpoints || {};
      
      // Get all active Bork connections
      const connections = await this.db.collection('api_credentials').find({
        provider: 'bork',
        isActive: true,
      }).toArray();

      if (connections.length === 0) {
        console.log('[Cron Job] No active Bork connections found for master data sync');
        return;
      }

      // Master data endpoints mapping
      const endpointMap: Record<string, string> = {
        product_groups: 'product_groups',
        payment_methods: 'payment_methods',
        cost_centers: 'cost_centers',
        users: 'users', // Map users to 'users' endpoint
      };

      // Sync each enabled master endpoint for each location
      for (const connection of connections) {
        for (const [key, enabled] of Object.entries(enabledEndpoints)) {
          if (enabled && endpointMap[key]) {
            try {
              const response = await fetch(`${baseUrl}/api/bork/v2/master-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  locationId: connection.locationId,
                  endpoint: endpointMap[key],
                  baseUrl: connection.baseUrl || connection.config?.baseUrl,
                  apiKey: connection.apiKey || connection.config?.apiKey,
                }),
              });
              
              const result = await response.json();
              console.log(`[Cron Job] Bork master data sync ${endpointMap[key]} for location ${connection.locationId}: ${result.recordsSaved || 0} records`);
            } catch (error: any) {
              console.error(`[Cron Job] Error syncing Bork master data ${endpointMap[key]} for location ${connection.locationId}:`, error.message);
            }
          }
        }
      }
    } else if (config.jobType === 'bork-daily-data') {
      // Execute Bork daily data sync (incremental - sync today's data hourly, same as Eitje)
      const enabledEndpoints = config.enabledEndpoints || {};
      
      // Get today's date for sync in Amsterdam timezone (to include partial data from today for hourly updates)
      // This is incremental because we sync today's date every hour, updating as new data comes in
      // Use Amsterdam timezone to ensure we sync the correct "today" date
      const now = new Date();
      const amsterdamDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
      const startDate = amsterdamDate.toISOString().split('T')[0];
      const endDate = amsterdamDate.toISOString().split('T')[0];

      // Check quiet hours
      if (config.quietHours) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        const [startHour, startMin] = config.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = config.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        if (currentTimeMinutes >= startTime && currentTimeMinutes <= endTime) {
          console.log(`[Cron Job] Skipping Bork sync during quiet hours (${config.quietHours.start} - ${config.quietHours.end})`);
          return;
        }
      }

      // Get all active Bork connections from MongoDB
      const connections = await this.db.collection('api_credentials').find({
        provider: 'bork',
        isActive: true,
      }).toArray();

      if (connections.length === 0) {
        console.log('[Cron Job] No active Bork connections found');
        return;
      }

      // Sync each active connection
      for (const connection of connections) {
        try {
          const response = await fetch(`${baseUrl}/api/bork/v2/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locationId: connection.locationId,
              startDate,
              endDate,
              baseUrl: connection.baseUrl || connection.config?.baseUrl,
              apiKey: connection.apiKey || connection.config?.apiKey,
            }),
          });
          
          const result = await response.json();
          console.log(`[Cron Job] Bork sync for location ${connection.locationId}: ${result.recordsSaved || 0} records`);
          
          // ✅ Trigger products aggregation after successful sync (non-blocking)
          if (result.recordsSaved > 0) {
            try {
              const aggregateResponse = await fetch(`${baseUrl}/api/bork/v2/products/aggregate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  startDate,
                  endDate,
                  locationId: connection.locationId?.toString(),
                }),
              });
              
              const aggregateResult = await aggregateResponse.json();
              if (aggregateResult.success) {
                console.log(`[Cron Job] Products aggregated for location ${connection.locationId}: ${aggregateResult.productsAggregated || 0} products`);
              }
            } catch (aggError: any) {
              console.warn(`[Cron Job] Products aggregation failed for location ${connection.locationId} (non-blocking):`, aggError.message);
            }
          }
        } catch (error: any) {
          console.error(`[Cron Job] Error syncing Bork location ${connection.locationId}:`, error.message);
        }
      }
    } else if (config.jobType === 'bork-historical-data') {
      // Execute Bork historical data sync (last 30 days)
      const enabledEndpoints = config.enabledEndpoints || {};
      
      // Calculate 30-day date range
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const overallStartDate = thirtyDaysAgo.toISOString().split('T')[0];
      const overallEndDate = today.toISOString().split('T')[0];

      // Get all active Bork connections
      const connections = await this.db.collection('api_credentials').find({
        provider: 'bork',
        isActive: true,
      }).toArray();

      if (connections.length === 0) {
        console.log('[Cron Job] No active Bork connections found for historical sync');
        return;
      }

      // Sync each active connection for the last 30 days
      for (const connection of connections) {
        try {
          const response = await fetch(`${baseUrl}/api/bork/v2/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locationId: connection.locationId,
              startDate: overallStartDate,
              endDate: overallEndDate,
              baseUrl: connection.baseUrl || connection.config?.baseUrl,
              apiKey: connection.apiKey || connection.config?.apiKey,
            }),
          });
          
          const result = await response.json();
          console.log(`[Cron Job] Bork historical sync for location ${connection.locationId}: ${result.recordsSaved || 0} records`);
          
          // ✅ Trigger products aggregation after successful historical sync (non-blocking)
          if (result.recordsSaved > 0) {
            try {
              const aggregateResponse = await fetch(`${baseUrl}/api/bork/v2/products/aggregate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  startDate: overallStartDate,
                  endDate: overallEndDate,
                  locationId: connection.locationId?.toString(),
                }),
              });
              
              const aggregateResult = await aggregateResponse.json();
              if (aggregateResult.success) {
                console.log(`[Cron Job] Products aggregated (historical) for location ${connection.locationId}: ${aggregateResult.productsAggregated || 0} products`);
              }
            } catch (aggError: any) {
              console.warn(`[Cron Job] Products aggregation failed (historical) for location ${connection.locationId} (non-blocking):`, aggError.message);
            }
          }
        } catch (error: any) {
          console.error(`[Cron Job] Error in Bork historical sync for location ${connection.locationId}:`, error.message);
        }
      }
    } else if (config.jobType === 'data-archival') {
      // Execute data archival (weekly, archives data older than 1 month / 4 weeks)
      // Rationale: Financial data updates happen within max 4 weeks, so data older than 1 month is final
      console.log('[Cron Job] Starting data archival process...');
      
      try {
        const response = await fetch(`${baseUrl}/api/admin/archive-data?months=1&dryRun=false&provider=all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log(`[Cron Job] Data archival completed: ${result.message}`);
          console.log(`[Cron Job] Space freed: ${result.totalSpaceFreedMB} MB`);
        } else {
          console.error(`[Cron Job] Data archival failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[Cron Job] Error executing data archival:`, error.message);
      }
    } else if (config.jobType === 'kitchen-daily-dashboard') {
      // Execute daily dashboard kitchen aggregation (hourly)
      // Aggregates kitchen workload, product production, and worker activity
      console.log('[Cron Job] Starting daily_dashboard_kitchen aggregation...');
      
      try {
        // Get today's date (for incremental hourly updates)
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        const response = await fetch(`${baseUrl}/api/admin/keuken-analyses/aggregate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate,
            locationId: 'all', // Aggregate for all locations
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log(`[Cron Job] daily_dashboard_kitchen aggregation completed: ${result.aggregated} day(s) aggregated`);
        } else {
          console.error(`[Cron Job] daily_dashboard_kitchen aggregation failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[Cron Job] Error executing daily_dashboard_kitchen aggregation:`, error.message);
      }
    }
  }

  /**
   * Start a cron job
   */
  async startJob(jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard'): Promise<void> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    const job = await this.db.collection('cron_jobs').findOne({ jobType });
    
    if (!job) {
      throw new Error(`Cron job ${jobType} not found`);
    }

    await this.db.collection('cron_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          isActive: true,
          updatedAt: new Date()
        }
      }
    );

    job.isActive = true;
    await this.scheduleJob(job);
  }

  /**
   * Stop a cron job
   */
  async stopJob(jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard'): Promise<void> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    const job = await this.db.collection('cron_jobs').findOne({ jobType });
    
    if (!job) {
      throw new Error(`Cron job ${jobType} not found`);
    }

    await this.db.collection('cron_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    // Stop the scheduled task
    const jobId = job._id.toString();
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId)?.stop();
      this.jobs.delete(jobId);
    }
  }

  /**
   * Update cron job configuration
   */
  async updateJob(config: Partial<CronJobConfig> & { jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard' }): Promise<void> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    const existing = await this.db.collection('cron_jobs').findOne({ jobType: config.jobType });
    
    if (existing) {
      // Update existing
      const updateData: any = {
        ...config,
        updatedAt: new Date(),
      };
      delete updateData._id;

      await this.db.collection('cron_jobs').updateOne(
        { _id: existing._id },
        { $set: updateData }
      );

      // Reschedule if active
      if (updateData.isActive !== false) {
        const updated = await this.db.collection('cron_jobs').findOne({ _id: existing._id });
        await this.scheduleJob(updated);
      }
    } else {
      // Create new
      const newJob: CronJobConfig = {
        jobType: config.jobType,
        isActive: config.isActive ?? false,
        schedule: config.schedule || (
          config.jobType === 'master-data' ? '0 0 * * *' : 
          config.jobType === 'historical-data' ? '0 1 * * *' : 
          config.jobType === 'bork-historical-data' ? '0 1 * * *' :
          config.jobType === 'bork-master-data' ? '0 2 * * *' : // Daily at 2 AM
          config.jobType === 'data-archival' ? '0 2 * * 0' : // Weekly on Sunday at 02:00
          config.jobType === 'kitchen-daily-dashboard' ? '0 * * * *' : // Hourly
          '0 * * * *'
        ),
        syncInterval: config.syncInterval,
        enabledEndpoints: config.enabledEndpoints,
        enabledMasterEndpoints: config.enabledMasterEndpoints,
        quietHours: config.quietHours,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.db.collection('cron_jobs').insertOne(newJob);
      newJob._id = result.insertedId;

      if (newJob.isActive) {
        await this.scheduleJob(newJob);
      }
    }
  }

  /**
   * Get cron job status
   */
  async getJobStatus(jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard'): Promise<CronJobConfig | null> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    return await this.db.collection('cron_jobs').findOne({ jobType });
  }

  /**
   * Get all cron jobs
   */
  async getAllJobs(): Promise<CronJobConfig[]> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    return await this.db.collection('cron_jobs').find({}).toArray();
  }

  /**
   * Manually execute a cron job immediately (for testing)
   */
  async runJobNow(jobType: 'daily-data' | 'master-data' | 'historical-data' | 'bork-daily-data' | 'bork-historical-data' | 'bork-master-data' | 'data-archival' | 'kitchen-daily-dashboard'): Promise<void> {
    if (!this.db) {
      this.db = await getDatabase();
    }

    const job = await this.db.collection('cron_jobs').findOne({ jobType });
    
    if (!job) {
      throw new Error(`Cron job ${jobType} not found. Please save configuration first.`);
    }

    console.log(`[Cron Job] Manually executing ${jobType} job at ${new Date().toISOString()}`);
    
    try {
      await this.executeJob(job);
      
      // Update last run time
      await this.db.collection('cron_jobs').updateOne(
        { _id: job._id },
        { 
          $set: { 
            lastRun: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`[Cron Job] Successfully executed ${jobType} job`);
    } catch (error: any) {
      console.error(`[Cron Job] Error executing ${jobType}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let cronManager: CronJobManager | null = null;

export function getCronManager(): CronJobManager {
  if (!cronManager) {
    cronManager = new CronJobManager();
    // Initialize on first access (will be called in API routes)
    cronManager.initialize().catch(console.error);
  }
  return cronManager;
}

