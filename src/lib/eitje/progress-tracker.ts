// Eitje Monthly Progress Tracker
// Tracks sync progress and detects data changes for Eitje endpoints

import { createClient } from '@/integrations/supabase/server';

export interface EitjeSyncProgress {
  endpoint: string;
  year: number;
  month: number;
  totalDays: number;
  syncedDays: number;
  lastSyncDate: string;
  lastCheckDate: string;
  isComplete: boolean;
  hasChanges: boolean;
}

export interface EitjeDateRange {
  startDate: string;
  endDate: string;
  days: number;
}

/**
 * Get monthly progress for a specific endpoint and month
 */
export async function getEitjeMonthlyProgress(
  endpoint: string,
  year: number,
  month: number
): Promise<EitjeSyncProgress> {
  const supabase = await createClient();
  
  // Get all records for this endpoint in the specified month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); // Last day of month
  
  const tableName = getTableName(endpoint);
  console.log(`[Eitje Progress] Checking table: ${tableName} for ${year}-${month}`);
  console.log(`[Eitje Progress] Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
  
  // DEFENSIVE: Handle master data differently from data endpoints
  const isMasterData = ['environments', 'teams', 'users', 'shift_types'].includes(endpoint);
  
  let records: any[] = [];
  
  if (isMasterData) {
    // For master data, get all records with pagination
    let allMasterRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: masterRecords, error } = await supabase
        .from(tableName)
        .select('id, created_at, updated_at, raw_data')
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('[Eitje Progress] Error fetching master records:', error);
        throw error;
      }

      if (masterRecords && masterRecords.length > 0) {
        allMasterRecords = [...allMasterRecords, ...masterRecords];
        page++;
        hasMore = masterRecords.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    records = allMasterRecords;
  } else {
    // For data endpoints, filter by date range with pagination
    let allDataRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      console.log(`[Eitje Progress] Date range: ${startDate} to ${endDate}`);
      
      const { data: dataRecords, error } = await supabase
        .from(tableName)
        .select('id, created_at, updated_at, raw_data, date')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('[Eitje Progress] Error fetching data records:', error);
        throw error;
      }

      if (dataRecords && dataRecords.length > 0) {
        allDataRecords = [...allDataRecords, ...dataRecords];
        page++;
        hasMore = dataRecords.length === pageSize;
        
        // DEBUG: Log sample record to see what we're getting
        if (page === 1) {
          console.log(`[Eitje Progress] First filtered record:`, {
            id: dataRecords[0].id,
            created_at: dataRecords[0].created_at,
            has_raw_data: !!dataRecords[0].raw_data,
            raw_data_date: dataRecords[0].raw_data?.date || 'no date in raw_data'
          });
        }
      } else {
        hasMore = false;
      }
    }

    records = allDataRecords;
  }

  console.log(`[Eitje Progress] Found ${records?.length || 0} total records`);
  
  if (isMasterData) {
    // For master data, if we have any records, consider the month synced
    const hasRecords = (records?.length || 0) > 0;
    const totalDays = endOfMonth.getDate();
    const syncedDays = hasRecords ? totalDays : 0; // All days synced if we have master data
    
    console.log(`[Eitje Progress] Master data endpoint - has records: ${hasRecords}`);
    
    return {
      endpoint,
      year,
      month,
      totalDays,
      syncedDays,
      lastSyncDate: hasRecords ? (records?.[0]?.created_at || '') : '',
      lastCheckDate: new Date().toISOString(),
      isComplete: hasRecords,
      hasChanges: false // Master data doesn't change often
    };
  }
  
  // For data endpoints, records are already filtered by date range
  const filteredRecords = records || [];
  
  console.log(`[Eitje Progress] Found ${filteredRecords.length} total records for ${year}-${month}`);

  console.log(`[Eitje Progress] Found ${filteredRecords.length} records in date range`);
  if (filteredRecords.length > 0) {
    console.log(`[Eitje Progress] First filtered record:`, {
      id: filteredRecords[0].id,
      created_at: filteredRecords[0].created_at,
      has_raw_data: !!filteredRecords[0].raw_data,
      raw_data_date: filteredRecords[0].raw_data?.date
    });
  }

  // Group records by date (records are already filtered by date range)
  const recordsByDate = new Map<string, any[]>();
  filteredRecords.forEach(record => {
    // Use the date field directly since records are already filtered
    const dataDate = record.date;
    
    if (dataDate) {
      const dateStr = new Date(dataDate).toISOString().split('T')[0];
      if (!recordsByDate.has(dateStr)) {
        recordsByDate.set(dateStr, []);
      }
      recordsByDate.get(dateStr)!.push(record);
    }
  });

  // Calculate progress
  const totalDays = endOfMonth.getDate();
  const syncedDays = recordsByDate.size;
  const isComplete = syncedDays === totalDays;
  
  // Check for changes (records updated after initial sync)
  const hasChanges = records?.some(record => {
    const createdAt = new Date(record.created_at);
    const updatedAt = new Date(record.updated_at);
    return updatedAt.getTime() > createdAt.getTime() + 60000; // Updated more than 1 minute after creation
  }) || false;

  // Get last sync and check dates
  const lastSyncDate = records?.length > 0 
    ? new Date(Math.max(...records.map(r => new Date(r.created_at).getTime()))).toISOString()
    : '';
  
  const lastCheckDate = new Date().toISOString();

  return {
    endpoint,
    year,
    month,
    totalDays,
    syncedDays,
    lastSyncDate,
    lastCheckDate,
    isComplete,
    hasChanges
  };
}

/**
 * Get progress for all endpoints for a specific month
 */
export async function getAllEitjeMonthlyProgress(
  year: number,
  month: number
): Promise<EitjeSyncProgress[]> {
  const endpoints = [
    'environments',
    'teams', 
    'users',
    'shift_types',
    'time_registration_shifts',
    'planning_shifts',
    'revenue_days'
  ];

  const progressPromises = endpoints.map(endpoint => 
    getEitjeMonthlyProgress(endpoint, year, month)
  );

  return Promise.all(progressPromises);
}

/**
 * Get date ranges that need syncing for a specific month
 */
export async function getEitjeMissingDateRanges(
  endpoint: string,
  year: number,
  month: number
): Promise<EitjeDateRange[]> {
  const progress = await getEitjeMonthlyProgress(endpoint, year, month);
  
  if (progress.isComplete) {
    return []; // All dates are synced
  }

  const missingRanges: EitjeDateRange[] = [];
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  // Get synced dates
  const supabase = await createClient();
  const tableName = getTableName(endpoint);
  const { data: records } = await supabase
    .from(tableName)
    .select('created_at')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: true });

  const syncedDates = new Set(
    records?.map(record => 
      new Date(record.created_at).toISOString().split('T')[0]
    ) || []
  );

  // Find missing date ranges (chunked into 7-day periods)
  const currentDate = new Date(startOfMonth);
  
  while (currentDate <= endOfMonth) {
    const rangeStart = new Date(currentDate);
    const rangeEnd = new Date(currentDate);
    rangeEnd.setDate(currentDate.getDate() + 6); // 7 days
    
    // Don't go beyond month end
    if (rangeEnd > endOfMonth) {
      rangeEnd.setTime(endOfMonth.getTime());
    }

    // Check if this range has any missing dates
    const rangeDates = [];
    const checkDate = new Date(rangeStart);
    while (checkDate <= rangeEnd) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!syncedDates.has(dateStr)) {
        rangeDates.push(dateStr);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // If this range has missing dates, add it to missing ranges
    if (rangeDates.length > 0) {
      missingRanges.push({
        startDate: rangeStart.toISOString().split('T')[0],
        endDate: rangeEnd.toISOString().split('T')[0],
        days: rangeDates.length
      });
    }

    // Move to next 7-day period
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return missingRanges;
}

/**
 * Check if a specific date has been synced
 */
export async function isDateSynced(
  endpoint: string,
  date: string
): Promise<boolean> {
  const supabase = await createClient();
  const tableName = getTableName(endpoint);
  
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .limit(1);

  if (error) {
    console.error('[Eitje Progress] Error checking date sync:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Get table name for endpoint
 */
function getTableName(endpoint: string): string {
  const tableMap: Record<string, string> = {
    'environments': 'eitje_environments',
    'teams': 'eitje_teams',
    'users': 'eitje_users',
    'shift_types': 'eitje_shift_types',
    'time_registration_shifts': 'eitje_time_registration_shifts_raw',
    'planning_shifts': 'eitje_planning_shifts_raw',
    'revenue_days': 'eitje_revenue_days_raw'
  };

  return tableMap[endpoint] || `eitje_${endpoint}_raw`;
}

/**
 * Get monthly summary for dashboard
 */
export async function getEitjeMonthlySummary(
  year: number,
  month: number
): Promise<{
  totalEndpoints: number;
  completeEndpoints: number;
  partialEndpoints: number;
  totalDays: number;
  syncedDays: number;
  completionPercentage: number;
  hasChanges: boolean;
}> {
  const allProgress = await getAllEitjeMonthlyProgress(year, month);
  
  const totalEndpoints = allProgress.length;
  const completeEndpoints = allProgress.filter(p => p.isComplete).length;
  const partialEndpoints = totalEndpoints - completeEndpoints;
  
  const totalDays = allProgress.reduce((sum, p) => sum + p.totalDays, 0);
  const syncedDays = allProgress.reduce((sum, p) => sum + p.syncedDays, 0);
  const completionPercentage = totalDays > 0 ? Math.round((syncedDays / totalDays) * 100) : 0;
  
  const hasChanges = allProgress.some(p => p.hasChanges);

  return {
    totalEndpoints,
    completeEndpoints,
    partialEndpoints,
    totalDays,
    syncedDays,
    completionPercentage,
    hasChanges
  };
}
