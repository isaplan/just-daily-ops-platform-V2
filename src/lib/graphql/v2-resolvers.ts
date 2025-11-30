/**
 * GraphQL Resolvers - V2
 * 
 * Resolvers for GraphQL API
 * Handles relationships and data fetching from MongoDB
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/utils/logger';

// Helper to convert ObjectId to string (with null safety)
const toId = (id: ObjectId | string | undefined | null): string => {
  if (!id) {
    logger.warn('[GraphQL] toId called with null/undefined ID - returning empty string');
    return ''; // Return empty string instead of throwing to prevent crashes
  }
  return id instanceof ObjectId ? id.toString() : id;
};

// Helper to convert string to ObjectId
const toObjectId = (id: string): ObjectId => {
  try {
    return new ObjectId(id);
  } catch {
    throw new Error(`Invalid ID format: ${id}`);
  }
};

// Helper to get location ID from parent (handles both id string and _id ObjectId)
const getLocationId = (parent: any): ObjectId | null => {
  if (!parent) return null;
  // If id is already set (from query resolver), convert to ObjectId
  if (parent.id) {
    try {
      return new ObjectId(parent.id);
    } catch {
      return null;
    }
  }
  // Otherwise, use _id directly
  if (parent._id) {
    return parent._id instanceof ObjectId ? parent._id : new ObjectId(parent._id);
  }
  return null;
};

// ============================================
// WORKER PROFILES MODULAR HELPERS
// ============================================

/**
 * Build MongoDB query for worker profiles using pre-computed date ranges
 */
function buildWorkerProfilesQuery(
  year: number | undefined,
  month: number | undefined,
  day: number | undefined,
  filters: any
): { query: any; useAggregated: boolean } {
  console.log('[Worker Profiles Query Builder] Building query:', { year, month, day, filters });
  
  const query: any = {};
  const andConditions: any[] = [];
  const safeFilters = filters || {};
  let useAggregated = true; // Prefer aggregated collection
  
  // Date filtering using pre-computed activeYears/activeMonths
  if (year) {
    if (day && month) {
      // Specific day - use activeDays if available, otherwise fallback
      query.activeMonths = {
        $elemMatch: {
          year,
          month,
        },
      };
      // Note: activeDays is optional, so we use activeMonths for day queries too
    } else if (month) {
      // Specific month
      query.activeMonths = {
        $elemMatch: {
          year,
          month,
        },
      };
    } else {
      // Whole year
      query.activeYears = year;
    }
  }
  
  // Location filter
  if (safeFilters.locationId && safeFilters.locationId !== 'all') {
    try {
      query.locationId = new ObjectId(safeFilters.locationId);
    } catch {
      // Invalid ObjectId, try as string
      query.locationId = safeFilters.locationId;
    }
  }
  
  // Contract type filter
  if (safeFilters.contractType && safeFilters.contractType !== 'all') {
    query.contractType = safeFilters.contractType;
  }
  
  // Active only filter
  if (safeFilters.activeOnly === true) {
    query.isActive = true;
  } else if (safeFilters.activeOnly === false) {
    query.isActive = false;
  }
  
  // Team filter - will be applied after fetching (teams array)
  // Note: We can't filter teams in MongoDB query easily, so we'll filter in memory
  
  // Combine all $and conditions
  if (andConditions.length > 0) {
    query.$and = andConditions;
  }
  
  console.log('[Worker Profiles Query Builder] Built query:', JSON.stringify(query, null, 2));
  
  return { query, useAggregated };
}

/**
 * Fetch worker profiles from aggregated collection
 */
async function fetchWorkerProfilesFromAggregated(
  query: any,
  page: number,
  limit: number
): Promise<{ records: any[]; total: number }> {
  console.log('[Worker Profiles Aggregated] Fetching from aggregated collection');
  
  const db = await getDatabase();
  const skip = (page - 1) * limit;
  
  // Get total count
  const total = await db.collection('worker_profiles_aggregated').countDocuments(query);
  console.log(`[Worker Profiles Aggregated] Found ${total} records`);
  
  // Fetch records
  const records = await db.collection('worker_profiles_aggregated')
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  console.log(`[Worker Profiles Aggregated] Fetched ${records.length} records`);
  
  return { records, total };
}

/**
 * Transform aggregated record to GraphQL format
 */
function transformAggregatedToWorkerProfile(record: any): any {
  const teams = record.teams || [];
  const primaryTeam = teams.length > 0 ? teams[0].team_name : null;
  
  // ✅ All names are denormalized in aggregated collection - use directly!
  // Fallback to snake_case only for backward compatibility with old records
  const userName = record.userName || record.unifiedUserName || record.user_name || null;
  const locationName = record.locationName || record.location_name || null;
  const locationIds = record.locationIds || record.location_ids;
  const locationNames = record.locationNames || record.location_names || null;
  
  return {
    id: record._id?.toString() || '',
    eitjeUserId: record.eitjeUserId || record.eitje_user_id,
    userName: userName, // ✅ Denormalized - no lookup needed!
    unifiedUserId: record.unifiedUserId?.toString() || null,
    unifiedUserName: record.unifiedUserName || null,
    borkUserId: record.borkUserId || null,
    borkUserName: record.borkUserName || null,
    teamName: primaryTeam, // ✅ Denormalized in teams array
    teams: teams.length > 0 ? teams : null, // ✅ All team names already denormalized
    locationId: record.locationId?.toString() || record.location_id?.toString() || null,
    locationName: locationName, // ✅ Denormalized - no lookup needed!
    locationIds: locationIds?.map((id: any) => id.toString()) || null,
    locationNames: locationNames, // ✅ Denormalized - no lookup needed!
    contractType: record.contractType || record.contract_type || null,
    contractHours: record.contractHours || record.contract_hours || null,
    hourlyWage: record.hourlyWage || record.hourly_wage || null,
    wageOverride: record.wageOverride !== undefined ? record.wageOverride : (record.wage_override !== undefined ? record.wage_override : false),
    effectiveFrom: record.effectiveFrom || record.effective_from ? new Date(record.effectiveFrom || record.effective_from).toISOString() : null,
    effectiveTo: record.effectiveTo || record.effective_to ? new Date(record.effectiveTo || record.effective_to).toISOString() : null,
    notes: record.notes || null,
    isActive: record.isActive !== undefined ? record.isActive : (!(record.effectiveTo || record.effective_to) || new Date(record.effectiveTo || record.effective_to) > new Date()),
    createdAt: record.createdAt || record.created_at ? new Date(record.createdAt || record.created_at).toISOString() : null,
    updatedAt: record.updatedAt || record.updated_at ? new Date(record.updatedAt || record.updated_at).toISOString() : null,
  };
}

/**
 * Enrich records with location names (batch query)
 * 
 * @deprecated Aggregated collections should have all data pre-computed. Only use for fallback scenarios.
 * ⚠️ DEPRECATED: Aggregated collections should have all data pre-computed. Only use for fallback scenarios.
 * This function queries the locations collection to enrich records with location names.
 * In production, use worker_profiles_aggregated which already has locationName pre-computed.
 */
async function enrichWithLocationNames(records: any[]): Promise<any[]> {
  console.log('[Worker Profiles] Enriching with location names');
  
  const db = await getDatabase();
  const locationIds = new Set<string>();
  
  // Collect all location IDs (check both camelCase and snake_case)
  records.forEach(record => {
    const locationId = record.locationId || record.location_id;
    if (locationId) {
      locationIds.add(locationId.toString());
    }
    const locationIdsArray = record.locationIds || record.location_ids;
    if (locationIdsArray && Array.isArray(locationIdsArray)) {
      locationIdsArray.forEach((id: any) => {
        locationIds.add(id.toString());
      });
    }
  });
  
  if (locationIds.size === 0) {
    console.log('[Worker Profiles] No locations to enrich');
    return records; // No locations to enrich
  }
  
  console.log(`[Worker Profiles] Enriching ${locationIds.size} locations with names`);
  
  // Fetch locations in batch
  const locationObjIds = Array.from(locationIds).map(id => {
    try {
      return new ObjectId(id);
    } catch {
      return null;
    }
  }).filter(Boolean) as ObjectId[];
  
  const locations = await db.collection('locations')
    .find({ _id: { $in: locationObjIds } })
    .toArray();
  
  console.log(`[Worker Profiles] Found ${locations.length} locations`);
  
  const locationMap = new Map<string, string>();
  locations.forEach(location => {
    if (location._id && location.name) {
      locationMap.set(location._id.toString(), location.name);
    }
  });
  
  // Enrich records (set both camelCase and snake_case for compatibility)
  return records.map(record => {
    const locationId = record.locationId || record.location_id;
    if (!record.locationName && !record.location_name && locationId) {
      const locationName = locationMap.get(locationId.toString());
      if (locationName) {
        record.locationName = locationName;
        record.location_name = locationName; // Set both formats
      }
    }
    const locationIdsArray = record.locationIds || record.location_ids;
    if (!record.locationNames && !record.location_names && locationIdsArray) {
      const locationNames = locationIdsArray
        .map((id: any) => locationMap.get(id.toString()))
        .filter(Boolean);
      if (locationNames.length > 0) {
        record.locationNames = locationNames;
        record.location_names = locationNames; // Set both formats
      }
    }
    return record;
  });
}

/**
 * Enrich records with user names from unified_users (batch query)
 * 
 * @deprecated Aggregated collections should have all data pre-computed. Only use for fallback scenarios.
 * ⚠️ DEPRECATED: Aggregated collections should have all data pre-computed. Only use for fallback scenarios.
 * This function queries the unified_users collection to enrich records with user names.
 * In production, use worker_profiles_aggregated which already has userName pre-computed.
 */
async function enrichWithUserNames(records: any[]): Promise<any[]> {
  console.log('[Worker Profiles] Enriching with user names from unified_users');
  
  const db = await getDatabase();
  const eitjeUserIds = new Set<number>();
  
  // Collect all eitje_user_ids that need names
  records.forEach(record => {
    const eitjeUserId = record.eitjeUserId || record.eitje_user_id;
    // Check both camelCase and snake_case field names
    const hasUserName = record.userName || record.user_name;
    if (eitjeUserId && !hasUserName) {
      eitjeUserIds.add(Number(eitjeUserId));
    }
  });
  
  if (eitjeUserIds.size === 0) {
    console.log('[Worker Profiles] No users need name enrichment');
    return records; // No users to enrich
  }
  
  console.log(`[Worker Profiles] Enriching ${eitjeUserIds.size} users with names`);
  
  // Fetch unified_users in batch
  // Query for users with eitje systemMappings, then filter by externalId in memory
  const eitjeUserIdsArray = Array.from(eitjeUserIds).map(id => String(id));
  const eitjeUserIdsSet = new Set(eitjeUserIdsArray);
  
  // First, get all unified_users that have eitje in their systemMappings
  const allUnifiedUsers = await db.collection('unified_users')
    .find({
      'systemMappings.system': 'eitje'
    })
    .toArray();
  
  // Filter to only those with matching externalIds
  const unifiedUsers = allUnifiedUsers.filter((user: any) => {
    const eitjeMapping = user.systemMappings?.find((m: any) => m.system === 'eitje');
    return eitjeMapping && eitjeMapping.externalId && eitjeUserIdsSet.has(String(eitjeMapping.externalId));
  });
  
  console.log(`[Worker Profiles] Found ${unifiedUsers.length} unified_users with eitje mappings`);
  
  // Create map: eitje_user_id -> userName
  const userNameMap = new Map<number, string>();
  unifiedUsers.forEach(user => {
    const eitjeMapping = user.systemMappings?.find((m: any) => m.system === 'eitje');
    if (eitjeMapping && eitjeMapping.externalId) {
      const eitjeUserId = parseInt(eitjeMapping.externalId, 10);
      if (eitjeUserId && user.name) {
        userNameMap.set(eitjeUserId, user.name);
      }
    }
  });
  
  console.log(`[Worker Profiles] Created userNameMap with ${userNameMap.size} entries`);
  
  // Enrich records with user names (set both camelCase and snake_case for compatibility)
  let enrichedCount = 0;
  const enrichedRecords = records.map(record => {
    const eitjeUserId = record.eitjeUserId || record.eitje_user_id;
    const hasUserName = record.userName || record.user_name;
    if (eitjeUserId && !hasUserName) {
      const userName = userNameMap.get(Number(eitjeUserId));
      if (userName) {
        record.userName = userName;
        record.user_name = userName; // Set both formats
        enrichedCount++;
      } else {
        console.log(`[Worker Profiles] No userName found for eitjeUserId: ${eitjeUserId}`);
      }
    }
    return record;
  });
  
  console.log(`[Worker Profiles] Enriched ${enrichedCount} records with user names`);
  return enrichedRecords;
}

// ============================================
// HIERARCHICAL TIME-SERIES ROUTING HELPERS
// ============================================

/**
 * Detect query type from date range
 */
function detectQueryType(startDate: string, endDate: string): 'year' | 'month' | 'week' | 'day' | 'range' {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');
  
  // Check if it's a single day
  const startDay = start.toISOString().split('T')[0];
  const endDay = end.toISOString().split('T')[0];
  if (startDay === endDay) {
    return 'day';
  }
  
  // Check if it's a single week (7 days)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) {
    return 'week';
  }
  
  // Check if it's a single month
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  if (startYear === endYear && startMonth === endMonth) {
    return 'month';
  }
  
  // Check if it's a full year (Jan 1 to Dec 31)
  const isJan1 = start.getUTCMonth() === 0 && start.getUTCDate() === 1;
  const isDec31 = end.getUTCMonth() === 11 && end.getUTCDate() === 31;
  if (startYear === endYear && isJan1 && isDec31) {
    return 'year';
  }
  
  return 'range';
}

/**
 * Extract time periods from date range
 */
function extractTimePeriods(startDate: string, endDate: string): { year?: string; month?: string; week?: string; date?: string } {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');
  
  const result: { year?: string; month?: string; week?: string; date?: string } = {};
  
  // Extract year
  result.year = String(start.getUTCFullYear());
  
  // Extract month (YYYY-MM format)
  const month = String(start.getUTCMonth() + 1).padStart(2, '0');
  result.month = `${result.year}-${month}`;
  
  // Extract week (ISO week)
  const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  result.week = String(weekNo).padStart(2, '0');
  
  // Extract date (YYYY-MM-DD format)
  result.date = start.toISOString().split('T')[0];
  
  return result;
}

/**
 * Check if hierarchical data exists in record
 */
function hasHierarchicalData(record: any, type: 'sales' | 'labor'): boolean {
  if (!record) return false;
  
  if (type === 'sales') {
    return !!(
      record.salesByYear &&
      Array.isArray(record.salesByYear) &&
      record.salesByYear.length > 0
    );
  } else {
    return !!(
      record.hoursByYear &&
      Array.isArray(record.hoursByYear) &&
      record.hoursByYear.length > 0
    );
  }
}

/**
 * Get product sales data using hierarchical structure or fallback to calculation
 */
function getProductSalesData(
  product: any,
  startDate: string,
  endDate: string,
  locationId?: string
): { daily: any; weekly: any; monthly: any; total: any } {
  const initTotals = () => ({
    quantity: 0,
    revenueExVat: 0,
    revenueIncVat: 0,
    transactionCount: 0,
  });

  const addTotals = (target: any, source: any) => {
    target.quantity += source.quantity || 0;
    target.revenueExVat += source.revenueExVat || 0;
    target.revenueIncVat += source.revenueIncVat || 0;
    target.transactionCount += source.transactionCount || 0;
  };

  // Check if hierarchical data exists
  if (hasHierarchicalData(product, 'sales')) {
    const queryType = detectQueryType(startDate, endDate);
    const periods = extractTimePeriods(startDate, endDate);
    
    let hierarchicalTotals = {
      daily: initTotals(),
      weekly: initTotals(),
      monthly: initTotals(),
      total: initTotals(),
    };

    // Route based on query type
    if (queryType === 'year' && periods.year) {
      const yearData = product.salesByYear?.find((y: any) => y.year === periods.year);
      if (yearData) {
        let locationData = yearData.byLocation;
        if (locationId) {
          locationData = locationData.filter((loc: any) => 
            loc.locationId.toString() === locationId
          );
        }
        
        // Aggregate across all locations
        locationData.forEach((loc: any) => {
          addTotals(hierarchicalTotals.total, {
            quantity: loc.quantity,
            revenueExVat: loc.revenueExVat,
            revenueIncVat: loc.revenueIncVat,
            transactionCount: loc.transactions,
          });
        });
        
        return {
          daily: hierarchicalTotals.daily, // Year data doesn't have daily breakdown
          weekly: hierarchicalTotals.weekly, // Year data doesn't have weekly breakdown
          monthly: hierarchicalTotals.monthly, // Year data doesn't have monthly breakdown
          total: hierarchicalTotals.total,
        };
      }
    } else if (queryType === 'month' && periods.month) {
      const [year, month] = periods.month.split('-');
      const monthData = product.salesByMonth?.find((m: any) => 
        m.year === year && m.month === month
      );
      if (monthData) {
        let locationData = monthData.byLocation;
        if (locationId) {
          locationData = locationData.filter((loc: any) => 
            loc.locationId.toString() === locationId
          );
        }
        
        locationData.forEach((loc: any) => {
          addTotals(hierarchicalTotals.total, {
            quantity: loc.quantity,
            revenueExVat: loc.revenueExVat,
            revenueIncVat: loc.revenueIncVat,
            transactionCount: loc.transactions,
          });
        });
        
        return {
          daily: hierarchicalTotals.daily,
          weekly: hierarchicalTotals.weekly,
          monthly: hierarchicalTotals.total,
          total: hierarchicalTotals.total,
        };
      }
    } else if (queryType === 'week' && periods.week) {
      const weekData = product.salesByWeek?.find((w: any) => 
        w.year === periods.year && w.week === periods.week
      );
      if (weekData) {
        let locationData = weekData.byLocation;
        if (locationId) {
          locationData = locationData.filter((loc: any) => 
            loc.locationId.toString() === locationId
          );
        }
        
        locationData.forEach((loc: any) => {
          addTotals(hierarchicalTotals.total, {
            quantity: loc.quantity,
            revenueExVat: loc.revenueExVat,
            revenueIncVat: loc.revenueIncVat,
            transactionCount: loc.transactions,
          });
        });
        
        return {
          daily: hierarchicalTotals.daily,
          weekly: hierarchicalTotals.total,
          monthly: hierarchicalTotals.monthly,
          total: hierarchicalTotals.total,
        };
      }
    } else if (queryType === 'day' && periods.date) {
      const dayData = product.salesByDay?.find((d: any) => d.date === periods.date);
      if (dayData) {
        let locationData = dayData.byLocation;
        if (locationId) {
          locationData = locationData.filter((loc: any) => 
            loc.locationId.toString() === locationId
          );
        }
        
        locationData.forEach((loc: any) => {
          addTotals(hierarchicalTotals.total, {
            quantity: loc.quantity,
            revenueExVat: loc.revenueExVat,
            revenueIncVat: loc.revenueIncVat,
            transactionCount: loc.transactions,
          });
        });
        
        return {
          daily: hierarchicalTotals.total,
          weekly: hierarchicalTotals.weekly,
          monthly: hierarchicalTotals.monthly,
          total: hierarchicalTotals.total,
        };
      }
    }
  }

  // Fallback to existing calculation logic
  const startDateStr = startDate;
  const endDateStr = endDate;
  
  const filteredDaily = (product.salesByDate || []).filter((sale: any) => {
    const saleDate = sale.date;
    return saleDate >= startDateStr && saleDate <= endDateStr;
  });

  const filteredWeekly = (product.salesByWeek || []);
  const filteredMonthly = (product.salesByMonth || []).filter((sale: any) => {
    const monthDate = sale.month;
    const startMonth = startDateStr.substring(0, 7);
    const endMonth = endDateStr.substring(0, 7);
    return monthDate >= startMonth && monthDate <= endMonth;
  });

  const productDaily = initTotals();
  const productWeekly = initTotals();
  const productMonthly = initTotals();
  const productTotal = initTotals();

  for (const sale of filteredDaily) {
    addTotals(productDaily, sale);
    addTotals(productTotal, sale);
  }
  for (const sale of filteredWeekly) {
    addTotals(productWeekly, sale);
  }
  for (const sale of filteredMonthly) {
    addTotals(productMonthly, sale);
  }

  return {
    daily: productDaily,
    weekly: productWeekly,
    monthly: productMonthly,
    total: productTotal,
  };
}

export const resolvers = {
  Query: {
    // ⚠️ DIAGNOSTICS ONLY: Uses eitje_raw_data for debugging. Not for production queries.
    // This resolver is used to check data quality and diagnose issues with team data.
    // It queries raw data collections to provide diagnostic information.
    // For production queries, use aggregated collections via other resolvers.
    checkTeamData: async () => {
      const db = await getDatabase();
      
      // Check 1: Teams in eitje_raw_data
      const teamsCount = await db.collection('eitje_raw_data').countDocuments({ endpoint: 'teams' });
      const sampleTeam = await db.collection('eitje_raw_data').findOne({ endpoint: 'teams' });
      
      // Check 2: Shifts with team info
      const shiftsWithTeamsCount = await db.collection('eitje_raw_data').countDocuments({
        endpoint: 'time_registration_shifts',
        $or: [
          { 'extracted.team_id': { $exists: true, $ne: null } },
          { 'extracted.team_name': { $exists: true, $ne: null } },
          { 'rawApiResponse.team_id': { $exists: true, $ne: null } },
          { 'rawApiResponse.team_name': { $exists: true, $ne: null } }
        ]
      });
      
      const sampleShift = await db.collection('eitje_raw_data').findOne({
        endpoint: 'time_registration_shifts',
        'extracted.team_id': { $exists: true, $ne: null }
      });
      
      // Check 3: Worker profiles
      const workerProfilesCount = await db.collection('worker_profiles').countDocuments();
      
      // Check 4: Get unique teams from shifts
      const uniqueTeamsInShifts = await db.collection('eitje_raw_data').aggregate([
        {
          $match: {
            endpoint: 'time_registration_shifts',
            $or: [
              { 'extracted.team_name': { $exists: true, $ne: null } },
              { 'rawApiResponse.team_name': { $exists: true, $ne: null } }
            ]
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$extracted.team_name', '$rawApiResponse.team_name']
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      const recommendations = [];
      if (teamsCount === 0) {
        recommendations.push('🔧 Run: POST /api/eitje/v2/sync with endpoint "teams" to sync team master data');
      }
      if (shiftsWithTeamsCount === 0) {
        recommendations.push('🔧 Run: POST /api/eitje/v2/sync with endpoint "time_registration_shifts" to sync shift data with teams');
      }
      if (teamsCount > 0 && shiftsWithTeamsCount > 0) {
        recommendations.push('✅ Team data looks good! Teams should show up in the UI now.');
      }
      
      return {
        teamsCount,
        shiftsWithTeamsCount,
        uniqueTeamsCount: uniqueTeamsInShifts.length,
        uniqueTeamNames: uniqueTeamsInShifts.map((t: any) => t._id).filter(Boolean),
        workerProfilesCount,
        recommendations,
        sampleTeam: sampleTeam ? {
          id: sampleTeam.extracted?.id || sampleTeam.rawApiResponse?.id,
          name: sampleTeam.extracted?.name || sampleTeam.rawApiResponse?.name,
          environment_id: sampleTeam.extracted?.environment_id || sampleTeam.rawApiResponse?.environment_id
        } : null,
        sampleShift: sampleShift ? {
          user_id: sampleShift.extracted?.user_id || sampleShift.rawApiResponse?.user_id,
          team_id: sampleShift.extracted?.team_id || sampleShift.rawApiResponse?.team_id,
          team_name: sampleShift.extracted?.team_name || sampleShift.rawApiResponse?.team_name,
          date: sampleShift.date
        } : null,
      };
    },
    
    // Locations
    locations: async () => {
      const db = await getDatabase();
      const locations = await db.collection('locations').find({ isActive: true }).toArray();
      
      // ✅ Serialize MongoDB documents to plain objects for Server Components
      // ✅ Filter out locations with null/undefined _id
      return locations
        .filter((loc: any) => loc._id != null) // Filter out null/undefined _id
        .map((loc: any) => ({
          id: toId(loc._id),
          name: loc.name,
          code: loc.code || null,
          address: loc.address || null,
          city: loc.city || null,
          country: loc.country || null,
          isActive: loc.isActive !== undefined ? loc.isActive : true,
          createdAt: loc.createdAt instanceof Date ? loc.createdAt.toISOString() : (loc.createdAt || new Date().toISOString()),
          updatedAt: loc.updatedAt instanceof Date ? loc.updatedAt.toISOString() : (loc.updatedAt || new Date().toISOString()),
        }));
    },
    
    location: async (_: any, { id }: { id: string }) => {
      const db = await getDatabase();
      return db.collection('locations').findOne({ _id: toObjectId(id) });
    },

    // Users
    users: async (_: any, { locationId }: { locationId?: string }) => {
      const db = await getDatabase();
      const query: any = { isActive: true };
      if (locationId) {
        query.locationIds = toObjectId(locationId);
      }
      return db.collection('unified_users').find(query).toArray();
    },
    
    user: async (_: any, { id }: { id: string }) => {
      const db = await getDatabase();
      return db.collection('unified_users').findOne({ _id: toObjectId(id) });
    },

    // Teams
    // ✅ NOW USES: unified_teams collection (master data)
    teams: async (_: any, { locationId }: { locationId?: string }) => {
      const db = await getDatabase();
      
      // Query unified_teams collection
      const query: any = { isActive: true };
      
      // If location filter provided, match by locationIds
      if (locationId && locationId !== 'all') {
        try {
        query.locationIds = toObjectId(locationId);
        } catch (e) {
          logger.warn('Error filtering teams by location:', e);
        }
      }
      
      const unifiedTeams = await db.collection('unified_teams').find(query).toArray();
      
      // Transform to match GraphQL schema
      return unifiedTeams.map((team) => ({
          _id: team._id,
        id: toId(team._id),
        name: team.name || 'Unknown Team',
        description: team.description || null,
        teamType: team.teamType || null,
        isActive: team.isActive !== undefined ? team.isActive : true,
        locationIds: team.locationIds || [],
        memberIds: team.memberIds || [],
        systemMappings: team.systemMappings || [],
        createdAt: team.createdAt ? (team.createdAt instanceof Date ? team.createdAt.toISOString() : new Date(team.createdAt).toISOString()) : new Date().toISOString(),
        updatedAt: team.updatedAt ? (team.updatedAt instanceof Date ? team.updatedAt.toISOString() : new Date(team.updatedAt).toISOString()) : new Date().toISOString(),
      }));
    },
    
    team: async (_: any, { id }: { id: string }) => {
      const db = await getDatabase();
      return db.collection('unified_teams').findOne({ _id: toObjectId(id) });
    },

    // Dashboard
    dashboard: async (
      _: any,
      { locationId, startDate, endDate }: { locationId: string; startDate: string; endDate: string }
    ) => {
      const db = await getDatabase();
      return db.collection('daily_dashboard').find({
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }).sort({ date: -1 }).toArray();
    },

    // Sales Aggregated
    salesAggregated: async (
      _: any,
      { 
        locationId, 
        startDate, 
        endDate,
        page = 1,
        limit = 50 
      }: { 
        locationId: string; 
        startDate: string; 
        endDate: string;
        page?: number;
        limit?: number;
      }
    ) => {
      const db = await getDatabase();
      const query = {
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
      
      // ✅ Pagination at database level
      const skip = (page - 1) * limit;
      
      // ✅ Parallel queries for performance
      const [records, total] = await Promise.all([
        db.collection('bork_aggregated')
          .find(query)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('bork_aggregated').countDocuments(query),
      ]);
      
      return {
        success: true,
        records,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        error: null,
      };
    },

    // Labor Aggregated
    laborAggregated: async (
      _: any,
      { 
        locationId, 
        startDate, 
        endDate,
        page = 1,
        limit = 50 
      }: { 
        locationId: string; 
        startDate: string; 
        endDate: string;
        page?: number;
        limit?: number;
      }
    ) => {
      const db = await getDatabase();
      
      // Check if we can use hierarchical data
      const queryType = detectQueryType(startDate, endDate);
      const periods = extractTimePeriods(startDate, endDate);
      
      // Try to use hierarchical data if available (for year, month, week, or day queries)
      if ((queryType === 'year' || queryType === 'month' || queryType === 'week' || queryType === 'day') && periods.date) {
        // Query for records with hierarchical data
        const query: any = {
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        };
        
        // Add hierarchical data filter based on query type
      if (queryType === 'year' && periods.year) {
          query['hoursByYear.year'] = periods.year;
        } else if (queryType === 'day' && periods.date) {
          query['hoursByDay.date'] = periods.date;
        }
        
        const recordsWithHierarchical = await db.collection('eitje_aggregated')
          .find(query)
          .toArray();
        
        if (recordsWithHierarchical.length > 0) {
          // Extract hierarchical data for this location
          const hierarchicalRecords = recordsWithHierarchical
            .map(record => {
              if (!record || !record.locationId) return null;
              
              let locationData: any = null;
              let workerData: any[] = [];
              
              // Extract based on query type
              if (queryType === 'year' && periods.year) {
              const yearData = record.hoursByYear?.find((y: any) => y.year === periods.year);
              if (!yearData) return null;
                locationData = yearData.byLocation?.find((loc: any) => 
                loc?.locationId && loc.locationId.toString() === locationId
              );
                if (locationData) {
                  workerData = locationData.byTeam?.flatMap((team: any) => 
                    (team.byWorker || []).map((worker: any) => ({
                      workerId: worker.unifiedUserId?.toString() || '',
                      workerName: worker.workerName || 'Unknown',
                      teamId: team.teamId?.toString() || '',
                      teamName: team.teamName || '',
                      hours: worker.totalHoursWorked || 0,
                      cost: worker.totalWageCost || 0,
                    }))
                  ) || [];
                }
              } else if (queryType === 'day' && periods.date) {
                const dayData = record.hoursByDay?.find((d: any) => d.date === periods.date);
                if (!dayData) return null;
                locationData = dayData.byLocation?.find((loc: any) => 
                  loc?.locationId && loc.locationId.toString() === locationId
                );
                if (locationData) {
                  workerData = locationData.byTeam?.flatMap((team: any) => 
                    (team.byWorker || []).map((worker: any) => ({
                      workerId: worker.unifiedUserId?.toString() || '',
                      workerName: worker.workerName || 'Unknown',
                      teamId: team.teamId?.toString() || '',
                      teamName: team.teamName || '',
                      hours: worker.totalHoursWorked || 0,
                      cost: worker.totalWageCost || 0,
                    }))
                  ) || [];
                }
              }
              
              if (!locationData) return null;
              
              return {
                locationId: record.locationId,
                date: record.date,
                totalHoursWorked: locationData.totalHoursWorked || 0,
                totalWageCost: locationData.totalWageCost || 0,
                totalRevenue: record.totalRevenue || 0,
                laborCostPercentage: record.laborCostPercentage || 0,
                revenuePerHour: record.revenuePerHour || 0,
                teamStats: locationData.byTeam?.map((team: any) => ({
                  teamId: team.teamId,
                  teamName: team.teamName,
                  hours: team.totalHoursWorked || 0,
                  cost: team.totalWageCost || 0,
                })) || [],
                workerStats: workerData,
              };
            })
            .filter((r): r is any => r !== null);
          
          if (hierarchicalRecords.length > 0) {
            const total = hierarchicalRecords.length;
            const skip = (page - 1) * limit;
            const paginated = hierarchicalRecords.slice(skip, skip + limit);
            
            return {
              success: true,
              records: paginated,
              total,
              page,
              totalPages: Math.ceil(total / limit),
              error: null,
            };
          }
        }
      }
      
      // Fallback to existing query logic
      const query = {
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
      
      // ✅ Pagination at database level
      const skip = (page - 1) * limit;
      
      // ✅ Parallel queries for performance
      const [records, total] = await Promise.all([
        db.collection('eitje_aggregated')
          .find(query)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('eitje_aggregated').countDocuments(query),
      ]);
      
      // Transform records to include workerStats from hierarchical data if available
      const transformedRecords = await Promise.all(records.map(async (record: any) => {
        // Try to get worker data from hoursByDay if available
        if (record.hoursByDay && Array.isArray(record.hoursByDay)) {
          const recordDate = record.date instanceof Date 
            ? record.date.toISOString().split('T')[0]
            : new Date(record.date).toISOString().split('T')[0];
          
          const dayData = record.hoursByDay.find((d: any) => d.date === recordDate);
          if (dayData) {
            const locationData = dayData.byLocation?.find((loc: any) => 
              loc?.locationId && loc.locationId.toString() === locationId
            );
            
            if (locationData) {
              const workerStats = locationData.byTeam?.flatMap((team: any) => 
                (team.byWorker || []).map((worker: any) => ({
                  workerId: worker.unifiedUserId?.toString() || '',
                  workerName: worker.workerName || 'Unknown',
                  teamId: team.teamId?.toString() || '',
                  teamName: team.teamName || '',
                  hours: worker.totalHoursWorked || 0,
                  cost: worker.totalWageCost || 0,
                }))
              ) || [];
              
              return {
                ...record,
                workerStats,
              };
            }
          }
        }
        
        // Fallback: return record without workerStats
        return {
          ...record,
          workerStats: [],
        };
      }));
      
      return {
        success: true,
        records: transformedRecords,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        error: null,
      };
    },

    // Enhanced Labor Productivity
    laborProductivityEnhanced: async (
      _: any,
      {
        startDate,
        endDate,
        periodType,
        locationId,
        filters = {},
        page = 1,
        limit = 50,
      }: {
        startDate: string;
        endDate: string;
        periodType: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR';
        locationId?: string;
        filters?: {
          division?: 'TOTAL' | 'FOOD' | 'BEVERAGE';
          teamCategory?: 'KITCHEN' | 'SERVICE' | 'MANAGEMENT' | 'OTHER';
          subTeam?: string;
          workerId?: string;
        };
        page?: number;
        limit?: number;
      }
    ) => {
      try {
        const { fetchProductivityEnhanced } = await import('@/lib/services/workforce/productivity-enhanced.service');
        
        // Convert GraphQL enum values to TypeScript types
        const periodTypeMap: Record<string, 'year' | 'month' | 'week' | 'day' | 'hour'> = {
          YEAR: 'year',
          MONTH: 'month',
          WEEK: 'week',
          DAY: 'day',
          HOUR: 'hour',
        };
        
        const divisionMap: Record<string, 'Food' | 'Beverage' | 'Management' | 'Other' | 'All'> = {
          FOOD: 'Food',
          BEVERAGE: 'Beverage',
          MANAGEMENT: 'Management',
          OTHER: 'Other',
          ALL: 'All',
        };
        
        const teamCategoryMap: Record<string, 'Kitchen' | 'Service' | 'Management' | 'Other'> = {
          KITCHEN: 'Kitchen',
          SERVICE: 'Service',
          MANAGEMENT: 'Management',
          OTHER: 'Other',
        };
        
        const params = {
          startDate,
          endDate,
          periodType: periodTypeMap[periodType] || 'day',
          locationId: locationId || 'all',
          division: filters.division ? divisionMap[filters.division] : undefined,
          teamCategory: filters.teamCategory ? teamCategoryMap[filters.teamCategory] : undefined,
          subTeam: filters.subTeam,
          workerId: filters.workerId,
          page,
          limit,
        };
        
        const result = await fetchProductivityEnhanced(params);
        
        // ✅ Ensure result and nested arrays exist
        if (!result) {
          throw new Error('fetchProductivityEnhanced returned null or undefined');
        }
        
        // Transform to GraphQL response format
        return {
          success: result.success || false,
          records: (result.records || []).filter((r: any) => r != null).map((r: any) => ({
            id: `${r.period || 'unknown'}_${r.locationId || 'all'}_${r.teamId || 'total'}_${r.teamCategory || 'all'}`,
            period: r.period,
            periodType: r.periodType?.toUpperCase() || 'DAY',
            locationId: r.locationId,
            locationName: r.locationName,
            teamId: r.teamId,
            teamName: r.teamName,
            totalHoursWorked: r.totalHoursWorked,
            totalWageCost: r.totalWageCost,
            totalRevenue: r.totalRevenue,
            revenuePerHour: r.revenuePerHour,
            laborCostPercentage: r.laborCostPercentage,
            recordCount: r.recordCount,
            division: r.division?.toUpperCase() || null,
            teamCategory: r.teamCategory?.toUpperCase() || null,
            subTeam: r.subTeam,
            workerId: r.workerId,
            workerName: r.workerName,
            ordersCount: r.ordersCount,
            salesCount: r.salesCount,
            productivityScore: r.productivityScore,
            goalStatus: r.goalStatus,
          })),
          total: result.total || 0,
          page: result.page || 1,
          totalPages: result.totalPages || 0,
          error: result.error || null,
          byDivision: (result.byDivision || []).filter((d: any) => d != null).map((d: any) => ({
            id: `${d.period || 'unknown'}_${d.division || 'all'}_${d.locationId || 'all'}`,
            period: d.period,
            periodType: d.periodType?.toUpperCase() || 'DAY',
            locationId: d.locationId,
            locationName: d.locationName,
            totalHoursWorked: d.totalHoursWorked,
            totalWageCost: d.totalWageCost,
            totalRevenue: d.totalRevenue,
            revenuePerHour: d.revenuePerHour,
            laborCostPercentage: d.laborCostPercentage,
            recordCount: 0,
            division: d.division?.toUpperCase() || 'ALL',
            goalStatus: d.goalStatus,
          })),
          byTeamCategory: (result.byTeamCategory || []).filter((tc: any) => tc != null).map((tc: any) => ({
            id: `${tc.period || 'unknown'}_${tc.teamCategory || 'all'}_${tc.locationId || 'all'}`,
            period: tc.period,
            periodType: tc.periodType?.toUpperCase() || 'DAY',
            locationId: tc.locationId,
            locationName: tc.locationName,
            totalHoursWorked: tc.totalHoursWorked,
            totalWageCost: tc.totalWageCost,
            totalRevenue: tc.totalRevenue,
            revenuePerHour: tc.revenuePerHour,
            laborCostPercentage: tc.laborCostPercentage,
            recordCount: 0,
            teamCategory: tc.teamCategory?.toUpperCase() || 'OTHER',
            subTeam: tc.subTeam,
            goalStatus: tc.goalStatus,
          })),
          byWorker: (result.byWorker || []).filter((w: any) => w != null).map((w: any) => ({
            id: `${w.period || 'unknown'}_${w.workerId || 'unknown'}_${w.locationId || 'all'}`,
            period: w.period,
            periodType: w.periodType?.toUpperCase() || 'DAY',
            locationId: w.locationId,
            locationName: w.locationName,
            totalHoursWorked: w.totalHoursWorked,
            totalWageCost: w.totalWageCost,
            totalRevenue: w.totalRevenue,
            revenuePerHour: w.revenuePerHour,
            laborCostPercentage: w.laborCostPercentage,
            recordCount: 0,
            teamCategory: w.teamCategory?.toUpperCase() || null,
            subTeam: w.subTeam,
            workerId: w.workerId,
            workerName: w.workerName,
            ordersCount: w.ordersCount,
            salesCount: w.salesCount,
            productivityScore: w.productivityScore,
            goalStatus: w.goalStatus,
          })),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] laborProductivityEnhanced error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch enhanced productivity data',
        };
      }
    },

    // Company Settings
    companySettings: async () => {
      try {
        const db = await getDatabase();
        let settings = await db.collection('company_settings').findOne({});
        
        // If no settings exist, return default
        if (!settings) {
          return {
            id: 'default',
            workingDayStartHour: 6, // Default: 06:00
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        
        return {
          id: settings._id?.toString() || 'default',
          workingDayStartHour: settings.workingDayStartHour || 6,
          createdAt: settings.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: settings.updatedAt?.toISOString() || new Date().toISOString(),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] companySettings error:', error);
        // Return default on error
        return {
          id: 'default',
          workingDayStartHour: 6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    },

    // P&L Data
    pnlData: async (
      _: any,
      { locationId, year, month }: { locationId: string; year: number; month?: number }
    ) => {
      const db = await getDatabase();
      const query: any = {
        locationId: toObjectId(locationId),
        year,
      };
      if (month) {
        query.month = month;
      }
      return db.collection('powerbi_aggregated').find(query).sort({ month: -1 }).toArray();
    },

    // Keuken Analyses
    keukenAnalyses: async (
      _: any,
      {
        locationId,
        startDate,
        endDate,
        timeRangeFilter,
        selectedWorkerId,
      }: {
        locationId: string;
        startDate: string;
        endDate: string;
        timeRangeFilter?: string;
        selectedWorkerId?: string;
      }
    ) => {
      try {
        const db = await getDatabase();
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Handle "all" locations
        const isAllLocations = locationId === 'all' || !locationId;
        
        const query: any = {
          date: {
            $gte: start,
            $lte: end,
          },
        };

        // Add location filter if not "all"
        if (!isAllLocations) {
          query.locationId = toObjectId(locationId);
        }

        // Query aggregated collection
        let records = await db.collection('daily_dashboard_kitchen')
          .find(query)
          .sort({ date: -1 })
          .toArray();

        // If no records found, trigger on-demand aggregation
        if (records.length === 0) {
          logger.log('[Kitchen Dashboard] No aggregated data found, triggering aggregation...');
          const { aggregateKeukenAnalysesData } = await import('@/lib/services/daily-ops/keuken-analyses-aggregation.service');
          
          // Aggregate for all locations if "all", otherwise specific location
          if (isAllLocations) {
            // Get all active locations and aggregate for each
            const locations = await db.collection('locations')
              .find({ isActive: true })
              .toArray();
            
            for (const location of locations) {
              await aggregateKeukenAnalysesData(start, end, location._id).catch((err) => {
                logger.warn(`[Kitchen Dashboard] Failed to aggregate for location ${location._id}:`, err);
              });
            }
          } else {
            await aggregateKeukenAnalysesData(start, end, locationId);
          }
          
          // Query again after aggregation
          records = await db.collection('daily_dashboard_kitchen')
            .find(query)
            .sort({ date: -1 })
            .toArray();
        }

        // Apply filters
        if (timeRangeFilter && timeRangeFilter !== 'all') {
          records = records.filter((r: any) => r.timeRange === timeRangeFilter || r.timeRange === 'all');
        }

        if (selectedWorkerId) {
          const workerObjId = toObjectId(selectedWorkerId);
          records = records.map((r: any) => {
            const filteredWorkerActivity = r.workerActivity?.filter((w: any) => 
              w.unifiedUserId?.toString() === workerObjId.toString()
            ) || [];
            
            const filteredWorkloadByWorker = r.workloadByWorker?.filter((w: any) =>
              w.unifiedUserId?.toString() === workerObjId.toString()
            ) || [];

            return {
              ...r,
              workerActivity: filteredWorkerActivity,
              workloadByWorker: filteredWorkloadByWorker,
              // Recalculate KPIs based on filtered worker
              kpis: {
                ...r.kpis,
                averageWorkersPerHour: filteredWorkerActivity.length > 0 ? 1 : 0,
              },
            };
          });
        }

        // If "all" locations, aggregate results across locations
        let finalRecords = records;
        if (isAllLocations && records.length > 0) {
          // Group by date and aggregate across locations
          const groupedByDate = new Map<string, any>();
          
          records.forEach((r: any) => {
            const dateKey = r.date instanceof Date 
              ? r.date.toISOString().split('T')[0]
              : new Date(r.date).toISOString().split('T')[0];
            
            if (!groupedByDate.has(dateKey)) {
              groupedByDate.set(dateKey, {
                locationId: 'all',
                date: r.date,
                timeRange: r.timeRange || 'all',
                productProduction: [],
                workerActivity: [],
                workloadByHour: [],
                workloadByWorker: [],
                workloadByRange: [],
                kpis: {
                  totalOrders: 0,
                  totalProductsProduced: 0,
                  totalWorkloadMinutes: 0,
                  averageWorkloadPerHour: 0,
                  peakHour: '12:00',
                  peakTimeRange: 'lunch',
                  averageWorkersPerHour: 0,
                },
              });
            }
            
            const dayData = groupedByDate.get(dateKey)!;
            
            // Aggregate product production
            (r.productProduction || []).forEach((prod: any) => {
              const existing = dayData.productProduction.find((p: any) => p.productName === prod.productName);
              if (existing) {
                existing.totalQuantity += prod.totalQuantity;
                existing.totalWorkloadMinutes += prod.totalWorkloadMinutes;
              } else {
                dayData.productProduction.push({ ...prod });
              }
            });
            
            // Aggregate worker activity
            (r.workerActivity || []).forEach((worker: any) => {
              const existing = dayData.workerActivity.find((w: any) => w.unifiedUserId?.toString() === worker.unifiedUserId?.toString());
              if (existing) {
                existing.hours = [...new Set([...existing.hours, ...worker.hours])];
              } else {
                dayData.workerActivity.push({ ...worker });
              }
            });
            
            // Aggregate KPIs
            dayData.kpis.totalOrders += r.kpis?.totalOrders || 0;
            dayData.kpis.totalProductsProduced += r.kpis?.totalProductsProduced || 0;
            dayData.kpis.totalWorkloadMinutes += r.kpis?.totalWorkloadMinutes || 0;
          });
          
          finalRecords = Array.from(groupedByDate.values());
        }
        
        return {
          success: true,
          records: finalRecords.map((r: any) => ({
            locationId: r.locationId?.toString() || (isAllLocations ? 'all' : locationId),
            date: r.date,
            timeRange: r.timeRange || 'all',
            productProduction: r.productProduction || [],
            workerActivity: r.workerActivity || [],
            workloadByHour: r.workloadByHour || [],
            workloadByWorker: r.workloadByWorker || [],
            workloadByRange: r.workloadByRange || [],
            kpis: r.kpis || {
              totalOrders: 0,
              totalProductsProduced: 0,
              totalWorkloadMinutes: 0,
              averageWorkloadPerHour: 0,
              peakHour: '12:00',
              peakTimeRange: 'lunch',
              averageWorkersPerHour: 0,
            },
          })),
          total: finalRecords.length,
          error: null,
        };
      } catch (error: any) {
        logger.error('[Kitchen Dashboard Resolver] Error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch kitchen dashboard data',
        };
      }
    },

    // Worker Profiles
    workerProfiles: async (
      _: any,
      { 
        year, 
        month, 
        day, 
        page = 1, 
        limit = 50, 
        filters = {} 
      }: { 
        year: number;
        month?: number;
        day?: number;
        page?: number; 
        limit?: number; 
        filters?: any;
      }
    ) => {
      try {
        console.log('[GraphQL Resolver] workerProfiles called:', { year, month, day, page, limit, filters });
        
        const db = await getDatabase();
        const safeFilters = filters || {};
        
        // Build query using modular function
        const { query, useAggregated: preferAggregated } = buildWorkerProfilesQuery(year, month, day, safeFilters);
        
        let records: any[] = [];
        let total = 0;
        let usedAggregated = false;
        
        // Try aggregated collection first
        if (preferAggregated) {
          try {
            console.log('[GraphQL Resolver] Attempting to fetch from aggregated collection');
            const aggregatedResult = await fetchWorkerProfilesFromAggregated(query, page, limit);
            records = aggregatedResult.records;
            total = aggregatedResult.total;
            usedAggregated = true;
            console.log(`[GraphQL Resolver] ✅ Fetched ${records.length} records from aggregated collection`);
            // ✅ No enrichment needed - all names are already denormalized in aggregated collection!
          } catch (aggregatedError: any) {
            console.warn('[GraphQL Resolver] Failed to fetch from aggregated collection, falling back to worker_profiles:', aggregatedError.message);
            // Will fallback below
          }
        }
        
        // Fallback to worker_profiles if aggregated not available or failed
        if (!usedAggregated || records.length === 0) {
          console.log('[GraphQL Resolver] Fetching from worker_profiles collection (fallback)');
          
          // Build fallback query (original logic)
          const fallbackQuery: any = {};
          const andConditions: any[] = [];
          
          // Date filtering logic (original complex logic)
        if (year) {
          let startDate: Date;
          let endDate: Date;
          
          if (day && month) {
            startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          } else if (month) {
            startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const lastDay = new Date(year, month, 0).getDate();
            endDate = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
          } else {
            startDate = new Date(year, 0, 1, 0, 0, 0, 0);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
          }
          
          const dateFilter: any = {
            $or: [
              { 
                $and: [
                  { effective_from: null },
                  { effective_to: null }
                ]
              },
              {
                $and: [
                  {
                    $or: [
                      { effective_from: null },
                      { effective_from: { $lte: endDate } }
                    ]
                  },
                  ...(safeFilters.activeOnly === null || safeFilters.activeOnly === undefined ? [{
                    $or: [
                      { effective_to: null },
                      { effective_to: { $gte: startDate } }
                    ]
                  }] : [])
                ]
              }
            ]
          };
          
          andConditions.push(dateFilter);
        }
        
        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
            fallbackQuery.location_id = safeFilters.locationId;
        }
        
        if (safeFilters.contractType && safeFilters.contractType !== 'all') {
            fallbackQuery.contract_type = safeFilters.contractType;
        }
        
        if (safeFilters.activeOnly === true) {
            andConditions.push({ effective_to: null });
        } else if (safeFilters.activeOnly === false) {
            andConditions.push({ effective_to: { $ne: null } });
        }
        
        if (andConditions.length > 0) {
            fallbackQuery.$and = andConditions;
        }
        
        const skip = (page - 1) * limit;
          total = await db.collection('worker_profiles').countDocuments(fallbackQuery);
          
          records = await db.collection('worker_profiles')
            .find(fallbackQuery)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
          console.log(`[GraphQL Resolver] ✅ Fetched ${records.length} records from worker_profiles (fallback)`);
        }
        
        // Team filter - filter records by team membership
        let filteredRecords = records;
        if (safeFilters.teamId && safeFilters.teamId !== 'all') {
          const filterTeamId = String(safeFilters.teamId);
          console.log(`[GraphQL Resolver] Filtering by team: ${filterTeamId}`);
          
          filteredRecords = records.filter(record => {
            const teams = record.teams || [];
            return teams.some((t: any) => 
              String(t.team_id) === filterTeamId || 
              t.team_name === safeFilters.teamId ||
              t.team_name === filterTeamId
            );
          });
          
          console.log(`[GraphQL Resolver] Filtered to ${filteredRecords.length} workers in team ${filterTeamId}`);
        }
        
        // ✅ Aggregated collection has all names pre-computed - no enrichment needed!
        // If using fallback worker_profiles collection, log warning but don't enrich
        // (Data should be pre-computed in aggregated collection - ensure aggregation is running)
        let enrichedRecords = filteredRecords;
        if (!usedAggregated) {
          console.warn('[GraphQL Resolver] ⚠️ Using fallback worker_profiles - ensure aggregation is running. Aggregated collection should have all names pre-computed.');
          // Don't enrich - aggregated collection should be used instead
          // Enrichment functions are deprecated and should not be called
        } else {
          console.log('[GraphQL Resolver] ✅ Using pre-computed names from aggregated collection');
        }
        
        // Transform records to GraphQL format
        const transformedRecords = enrichedRecords.map((record: any) => {
          // If from aggregated collection, use transform function
          if (record.eitjeUserId !== undefined && record.locationName !== undefined) {
            return transformAggregatedToWorkerProfile(record);
          }
          
          // Otherwise, transform from worker_profiles format
          const teams = record.teams || [];
          const primaryTeam = teams.length > 0 ? teams[0].team_name : null;
          
          // Check both camelCase (from enrichment) and snake_case (from DB) formats
          const userName = record.userName || record.user_name || null;
          const locationName = record.locationName || record.location_name || null;
          const locationNames = record.locationNames || record.location_names || null;
          
          return {
            id: record._id.toString(),
            eitjeUserId: record.eitje_user_id || record.eitjeUserId,
            userName: userName,
            teamName: primaryTeam,
            teams: teams.length > 0 ? teams : null,
            locationId: record.location_id || record.locationId || null,
            locationName: locationName,
            locationIds: record.location_ids || record.locationIds || (record.location_id || record.locationId ? [record.location_id || record.locationId] : null),
            locationNames: locationNames,
            contractType: record.contract_type || record.contractType || null,
            contractHours: record.contract_hours || record.contractHours || null,
            hourlyWage: record.hourly_wage || record.hourlyWage || null,
            wageOverride: record.wage_override !== undefined ? record.wage_override : (record.wageOverride !== undefined ? record.wageOverride : false),
            effectiveFrom: record.effective_from || record.effectiveFrom ? new Date(record.effective_from || record.effectiveFrom).toISOString() : null,
            effectiveTo: record.effective_to || record.effectiveTo ? new Date(record.effective_to || record.effectiveTo).toISOString() : null,
            notes: record.notes || null,
            isActive: !(record.effective_to || record.effectiveTo) || new Date(record.effective_to || record.effectiveTo) > new Date(),
            createdAt: record.created_at || record.createdAt ? new Date(record.created_at || record.createdAt).toISOString() : null,
            updatedAt: record.updated_at || record.updatedAt ? new Date(record.updated_at || record.updatedAt).toISOString() : null,
          };
        });
        
        // Recalculate total for filtered records
        const filteredTotal = filteredRecords.length;
        const filteredTotalPages = Math.ceil(filteredTotal / limit);
        
        console.log(`[GraphQL Resolver] ✅ Returning ${transformedRecords.length} records`);
        
        return {
          success: true,
          records: transformedRecords,
          total: filteredTotal,
          page,
          totalPages: filteredTotalPages,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] workerProfiles error:', error);
        logger.error('[GraphQL Resolver] workerProfiles error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page,
          totalPages: 0,
          error: error.message,
        };
      }
    },

    workerProfile: async (_: any, { id }: { id: string }) => {
      try {
        console.log('[GraphQL Resolver] workerProfile called:', { id });
        
        const db = await getDatabase();
        
        // Try aggregated collection first
        let record: any = null;
        let isFromAggregated = false;
        
        // Try to find by eitjeUserId in aggregated collection
        if (!ObjectId.isValid(id)) {
          // Assume it's an eitje_user_id
          const eitjeUserId = parseInt(id, 10);
          if (!isNaN(eitjeUserId)) {
            record = await db.collection('worker_profiles_aggregated').findOne({
              eitjeUserId
            });
            if (record) {
              isFromAggregated = true;
              console.log(`[GraphQL Resolver] ✅ Found worker ${eitjeUserId} in aggregated collection`);
            }
          }
        } else {
          // Valid ObjectId, try aggregated first
          record = await db.collection('worker_profiles_aggregated').findOne({ 
            _id: toObjectId(id) 
          });
          if (record) {
            isFromAggregated = true;
            console.log(`[GraphQL Resolver] ✅ Found worker ${id} in aggregated collection`);
          }
        }
        
        // Fallback to worker_profiles if not found in aggregated
        if (!record) {
          console.log('[GraphQL Resolver] Worker not found in aggregated, trying worker_profiles (fallback)');
          
          if (!ObjectId.isValid(id)) {
            record = await db.collection('worker_profiles').findOne({
              eitje_user_id: parseInt(id, 10)
            });
          } else {
            record = await db.collection('worker_profiles').findOne({ _id: toObjectId(id) });
          }
        }
        
        if (!record) {
          console.log(`[GraphQL Resolver] Worker ${id} not found`);
          return null;
        }
        
        // Transform based on source
        if (isFromAggregated) {
          // Use pre-computed data from aggregated collection
          const transformed = transformAggregatedToWorkerProfile(record);
          console.log(`[GraphQL Resolver] ✅ Returning worker from aggregated collection`);
          return transformed;
        } else {
          // Transform from worker_profiles format (fallback)
          const teams = record.teams || [];
          const primaryTeam = teams.length > 0 ? teams[0].team_name : null;
          
          // ⚠️ FALLBACK ONLY: This is for old worker_profiles collection (not aggregated)
          // For aggregated collection, locationName is pre-computed and we skip this
          // Get location names (support multiple locations) - only for fallback
          let locationName = null;
          let locationNames: string[] = [];
          const locationIds = record.location_ids || (record.location_id ? [record.location_id] : []);
          
          if (locationIds.length > 0) {
            try {
              const locationObjIds = locationIds.map((id: any) => {
                try {
                  return typeof id === 'string' ? toObjectId(id) : id;
                } catch {
                  return null;
                }
              }).filter(Boolean);
              
              const locations = await db.collection('locations').find({
                _id: { $in: locationObjIds }
              }).toArray();
              
              locationNames = locations.map((loc: any) => loc.name).filter(Boolean);
              locationName = locationNames.length > 0 ? locationNames[0] : null;
            } catch (error) {
              console.warn('[GraphQL Resolver] Error fetching location names:', error);
            }
          }
          
          console.log(`[GraphQL Resolver] ✅ Returning worker from worker_profiles (fallback)`);
          
          return {
            id: record._id.toString(),
            eitjeUserId: record.eitje_user_id,
            userName: record.user_name || null,
            teamName: primaryTeam,
            teams: teams.length > 0 ? teams : null,
            locationId: record.location_id || null,
            locationName,
            locationIds: locationIds.length > 0 ? locationIds : null,
            locationNames: locationNames.length > 0 ? locationNames : null,
            contractType: record.contract_type || null,
            contractHours: record.contract_hours || null,
            hourlyWage: record.hourly_wage || null,
            wageOverride: record.wage_override || false,
            effectiveFrom: record.effective_from ? new Date(record.effective_from).toISOString() : null,
            effectiveTo: record.effective_to ? new Date(record.effective_to).toISOString() : null,
            notes: record.notes || null,
            isActive: !record.effective_to || new Date(record.effective_to) > new Date(),
            createdAt: record.created_at ? new Date(record.created_at).toISOString() : null,
            updatedAt: record.updated_at ? new Date(record.updated_at).toISOString() : null,
          };
        }
      } catch (error: any) {
        console.error('[GraphQL Resolver] workerProfile error:', error);
        logger.error('[GraphQL Resolver] workerProfile error:', error);
        throw error;
      }
    },

    workerProfileByName: async (_: any, { userName }: { userName: string }) => {
      try {
        const db = await getDatabase();
        
        // Parse name: "First Last" or "First Middle Last"
        const nameParts = userName.trim().split(/\s+/);
        const firstName = nameParts[0] || null;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
        
        if (!firstName || !lastName) {
          console.warn('[GraphQL Resolver] workerProfileByName: Invalid name format, need first and last name');
          return null;
        }
        
        // ✅ Use unified_users for name-based lookup (indexed, fast)
        const unifiedUser = await db.collection('unified_users').findOne({
          firstName,
          lastName,
        });
        
        if (!unifiedUser) {
          console.log(`[GraphQL Resolver] workerProfileByName: No unified user found for "${firstName} ${lastName}"`);
          return null;
        }
        
        // Find eitje_user_id from unified user's system mappings
        const eitjeMapping = unifiedUser.systemMappings?.find((m: any) => m.system === 'eitje');
        if (!eitjeMapping) {
          console.log(`[GraphQL Resolver] workerProfileByName: No eitje mapping found for unified user ${unifiedUser._id}`);
          return null;
        }
        
        const eitjeUserId = parseInt(eitjeMapping.externalId, 10);
        if (!eitjeUserId || isNaN(eitjeUserId)) {
          console.warn(`[GraphQL Resolver] workerProfileByName: Invalid eitje_user_id: ${eitjeMapping.externalId}`);
          return null;
        }
        
        // ✅ Query worker_profiles_aggregated (has all data pre-computed, including locationName and userName)
        const record = await db.collection('worker_profiles_aggregated').findOne({ 
          eitjeUserId
        });
        
        if (!record) {
          console.log(`[GraphQL Resolver] workerProfileByName: No aggregated worker profile found for eitje_user_id ${eitjeUserId}`);
          return null;
        }
        
        // ✅ Use transform function - all data already denormalized in aggregated collection
        const transformed = transformAggregatedToWorkerProfile(record);
        console.log(`[GraphQL Resolver] ✅ Found worker profile by name "${userName}" (eitje_user_id: ${eitjeUserId})`);
        return transformed;
      } catch (error: any) {
        logger.error('[GraphQL Resolver] workerProfileByName error:', error);
        return null;
      }
    },

    // Worker Metrics
    workerSales: async (
      _: any,
      { workerName, startDate, endDate }: { workerName: string; startDate: string; endDate: string }
    ) => {
      try {
        const { fetchWorkerSales } = await import('@/lib/services/workforce/worker-sales.service');
        return await fetchWorkerSales(workerName, startDate, endDate);
      } catch (error: any) {
        logger.error('[GraphQL Resolver] workerSales error:', error);
        throw new Error(error.message || 'Failed to fetch worker sales');
      }
    },

    workerHours: async (
      _: any,
      { eitjeUserId, startDate, endDate }: { eitjeUserId: number; startDate: string; endDate: string }
    ) => {
      try {
        const { fetchWorkerHoursBreakdown } = await import('@/lib/services/workforce/worker-hours.service');
        return await fetchWorkerHoursBreakdown(eitjeUserId, startDate, endDate);
      } catch (error: any) {
        logger.error('[GraphQL Resolver] workerHours error:', error);
        throw new Error(error.message || 'Failed to fetch worker hours');
      }
    },

    workerLaborCost: async (
      _: any,
      { eitjeUserId, startDate, endDate }: { eitjeUserId: number; startDate: string; endDate: string }
    ) => {
      try {
        const { fetchWorkerLaborCost } = await import('@/lib/services/workforce/worker-labor-cost.service');
        return await fetchWorkerLaborCost(eitjeUserId, startDate, endDate);
      } catch (error: any) {
        logger.error('[GraphQL Resolver] workerLaborCost error:', error);
        throw new Error(error.message || 'Failed to fetch worker labor cost');
      }
    },

    workerHoursSummary: async (
      _: any,
      { eitjeUserId, contractHours, contractStartDate, contractEndDate, startDate, endDate }: { 
        eitjeUserId: number; 
        contractHours?: number | null;
        contractStartDate?: string | null;
        contractEndDate?: string | null;
        startDate: string; 
        endDate: string;
      }
    ) => {
      try {
        const { fetchWorkerHoursSummary } = await import('@/lib/services/workforce/worker-hours-summary.service');
        return await fetchWorkerHoursSummary(
          eitjeUserId,
          contractHours || null,
          contractStartDate || '',
          contractEndDate || null,
          startDate,
          endDate
        );
      } catch (error: any) {
        logger.error('[GraphQL Resolver] workerHoursSummary error:', error);
        throw new Error(error.message || 'Failed to fetch worker hours summary');
      }
    },

    // API Credentials
    apiCredentials: async (
      _: any,
      { provider, locationId }: { provider?: string; locationId?: string }
    ) => {
      try {
        const db = await getDatabase();
        const query: any = {};
        if (provider) {
          query.provider = provider;
        }
        if (locationId) {
          query.locationId = toObjectId(locationId);
        }
        return db.collection('api_credentials').find(query).toArray();
      } catch (error: any) {
        logger.error('[GraphQL Resolver] apiCredentials error:', error);
        // Re-throw with more context for GraphQL error handling
        if (error.message?.includes('ETIMEOUT') || error.message?.includes('querySrv')) {
          throw new Error('MongoDB connection timeout. Please check your MongoDB connection settings or try again later.');
        }
        if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to MongoDB. Please verify your connection string and network settings.');
        }
        throw error;
      }
    },

    apiCredential: async (_: any, { id }: { id: string }) => {
      try {
        const db = await getDatabase();
        return db.collection('api_credentials').findOne({ _id: toObjectId(id) });
      } catch (error: any) {
        logger.error('[GraphQL Resolver] apiCredential error:', error);
        if (error.message?.includes('ETIMEOUT') || error.message?.includes('querySrv')) {
          throw new Error('MongoDB connection timeout. Please check your MongoDB connection settings or try again later.');
        }
        if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to MongoDB. Please verify your connection string and network settings.');
        }
        throw error;
      }
    },

    // Products Catalog
    products: async (
      _: any,
      { page = 1, limit = 50, filters = {} }: { page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const query: any = {};

        if (filters.category) {
          query.category = filters.category;
        }
        if (filters.workloadLevel) {
          query.workloadLevel = filters.workloadLevel;
        }
        if (filters.mepLevel) {
          query.mepLevel = filters.mepLevel;
        }
        if (filters.isActive !== undefined) {
          query.isActive = filters.isActive;
        }
        if (filters.search) {
          query.productName = { $regex: filters.search, $options: 'i' };
        }

        const skip = (page - 1) * limit;
        const [records, total] = await Promise.all([
          db.collection('products_aggregated')
            .find(query)
            .sort({ productName: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          db.collection('products_aggregated').countDocuments(query),
        ]);

        return {
          success: true,
          records: records.map((r: any) => ({
            id: r._id.toString(),
            productName: r.productName,
            category: r.category || null,
            workloadLevel: r.workloadLevel,
            workloadMinutes: r.workloadMinutes,
            mepLevel: r.mepLevel,
            mepMinutes: r.mepMinutes,
            isActive: r.isActive,
            notes: r.notes || null,
            createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
          error: null,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] products error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch products',
        };
      }
    },

    product: async (_: any, { id }: { id: string }) => {
      try {
        const db = await getDatabase();
        const product = await db.collection('products_aggregated').findOne({ _id: toObjectId(id) });
        
        if (!product) return null;

        return {
          id: product._id.toString(),
          productName: product.productName,
          category: product.category || null,
          workloadLevel: product.workloadLevel,
          workloadMinutes: product.workloadMinutes,
          mepLevel: product.mepLevel,
          mepMinutes: product.mepMinutes,
          isActive: product.isActive,
          notes: product.notes || null,
          createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] product error:', error);
        throw error;
      }
    },

    productByName: async (_: any, { productName }: { productName: string }) => {
      try {
        const db = await getDatabase();
        const product = await db.collection('products_aggregated').findOne({ productName });
        
        if (!product) return null;

        return {
          id: product._id.toString(),
          productName: product.productName,
          category: product.category || null,
          workloadLevel: product.workloadLevel,
          workloadMinutes: product.workloadMinutes,
          mepLevel: product.mepLevel,
          mepMinutes: product.mepMinutes,
          isActive: product.isActive,
          notes: product.notes || null,
          createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] productByName error:', error);
        throw error;
      }
    },

    // Products Aggregated (Unified - sales data + catalog + location + menu)
    productsAggregated: async (
      _: any,
      { page = 1, limit = 50, filters = {} }: { page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const query: any = {};

        if (filters.locationId) {
          query.locationId = filters.locationId === 'null' || !filters.locationId 
            ? null 
            : toObjectId(filters.locationId);
        }
        if (filters.category) {
          query.category = filters.category;
        }
        if (filters.mainCategory) {
          query.mainCategory = filters.mainCategory;
        }
        if (filters.isActive !== undefined) {
          query.isActive = filters.isActive;
        }
        if (filters.search) {
          query.productName = { $regex: filters.search, $options: 'i' };
        }
        if (filters.minPrice !== undefined) {
          query.latestPrice = { ...query.latestPrice, $gte: filters.minPrice };
        }
        if (filters.maxPrice !== undefined) {
          query.latestPrice = { ...query.latestPrice, $lte: filters.maxPrice };
        }

        const skip = (page - 1) * limit;
        const [records, total] = await Promise.all([
          db.collection('products_aggregated')
            .find(query)
            .sort({ lastSeen: -1, productName: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          db.collection('products_aggregated').countDocuments(query),
        ]);

        return {
          success: true,
          records: records.map((r: any) => ({
            id: r._id.toString(),
            productName: r.productName,
            locationId: r.locationId?.toString() || null,
            category: r.category || null,
            mainCategory: r.mainCategory || null,
            productSku: r.productSku || null,
            workloadLevel: r.workloadLevel || null,
            workloadMinutes: r.workloadMinutes || null,
            mepLevel: r.mepLevel || null,
            mepMinutes: r.mepMinutes || null,
            courseType: r.courseType || null,
            notes: r.notes || null,
            isActive: r.isActive !== undefined ? r.isActive : true,
            averagePrice: r.averagePrice || 0,
            latestPrice: r.latestPrice || 0,
            minPrice: r.minPrice || 0,
            maxPrice: r.maxPrice || 0,
            // ✅ OPTIMIZATION: Limit priceHistory to last 30 days to reduce payload size
            priceHistory: (r.priceHistory || [])
              .filter((ph: any) => {
                const phDate = ph.date instanceof Date ? ph.date : new Date(ph.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return phDate >= thirtyDaysAgo;
              })
              .slice(-30) // Keep only last 30 entries
              .map((ph: any) => ({
                date: ph.date?.toISOString() || new Date().toISOString(),
                price: ph.price || 0,
                quantity: ph.quantity || 0,
                locationId: ph.locationId?.toString() || null,
                menuId: ph.menuId?.toString() || null,
              })),
            totalQuantitySold: r.totalQuantitySold || 0,
            totalRevenue: r.totalRevenue || 0,
            totalTransactions: r.totalTransactions || 0,
            firstSeen: r.firstSeen?.toISOString() || new Date().toISOString(),
            lastSeen: r.lastSeen?.toISOString() || new Date().toISOString(),
            menuIds: (r.menuIds || []).map((id: any) => id?.toString() || id),
            menuPrices: (r.menuPrices || []).map((mp: any) => ({
              menuId: mp.menuId?.toString() || mp.menuId,
              menuTitle: mp.menuTitle || '',
              price: mp.price || 0,
              dateAdded: mp.dateAdded?.toISOString() || new Date().toISOString(),
              dateRemoved: mp.dateRemoved?.toISOString() || null,
            })),
            vatRate: r.vatRate || null,
            costPrice: r.costPrice || null,
            lastAggregated: r.lastAggregated?.toISOString() || null,
            createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
          error: null,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] productsAggregated error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch aggregated products',
        };
      }
    },

    productAggregated: async (
      _: any,
      { productName, locationId }: { productName: string; locationId?: string }
    ) => {
      try {
        const db = await getDatabase();
        const query: any = { productName };
        
        if (locationId) {
          query.locationId = toObjectId(locationId);
        } else {
          query.locationId = null; // Global product
        }

        const product = await db.collection('products_aggregated').findOne(query);
        
        if (!product) return null;

        return {
          id: product._id.toString(),
          productName: product.productName,
          locationId: product.locationId?.toString() || null,
          category: product.category || null,
          mainCategory: product.mainCategory || null,
          productSku: product.productSku || null,
          workloadLevel: product.workloadLevel || null,
          workloadMinutes: product.workloadMinutes || null,
          mepLevel: product.mepLevel || null,
          mepMinutes: product.mepMinutes || null,
          courseType: product.courseType || null,
          notes: product.notes || null,
          isActive: product.isActive !== undefined ? product.isActive : true,
          averagePrice: product.averagePrice || 0,
          latestPrice: product.latestPrice || 0,
          minPrice: product.minPrice || 0,
          maxPrice: product.maxPrice || 0,
          priceHistory: (product.priceHistory || []).map((ph: any) => ({
            date: ph.date?.toISOString() || new Date().toISOString(),
            price: ph.price || 0,
            quantity: ph.quantity || 0,
            locationId: ph.locationId?.toString() || null,
            menuId: ph.menuId?.toString() || null,
          })),
          totalQuantitySold: product.totalQuantitySold || 0,
          totalRevenue: product.totalRevenue || 0,
          totalTransactions: product.totalTransactions || 0,
          firstSeen: product.firstSeen?.toISOString() || new Date().toISOString(),
          lastSeen: product.lastSeen?.toISOString() || new Date().toISOString(),
          menuIds: (product.menuIds || []).map((id: any) => id?.toString() || id),
          menuPrices: (product.menuPrices || []).map((mp: any) => ({
            menuId: mp.menuId?.toString() || mp.menuId,
            menuTitle: mp.menuTitle || '',
            price: mp.price || 0,
            dateAdded: mp.dateAdded?.toISOString() || new Date().toISOString(),
            dateRemoved: mp.dateRemoved?.toISOString() || null,
          })),
          vatRate: product.vatRate || null,
          costPrice: product.costPrice || null,
          lastAggregated: product.lastAggregated?.toISOString() || null,
          createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] productAggregated error:', error);
        throw error;
      }
    },

    // Processed Hours
    processedHours: async (
      _: any,
      { 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50, 
        filters = {} 
      }: { 
        startDate: string; 
        endDate: string; 
        page?: number; 
        limit?: number; 
        filters?: any;
      }
    ) => {
      try {
        // Ensure filters is always an object
        const safeFilters = filters || {};
        
        const db = await getDatabase();
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // ✅ NOW USES: processed_hours_aggregated collection
        const query: any = {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        };

        const andConditions: any[] = [];

        // Location filter
        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`, e);
          }
        }

        // Environment filter
        if (safeFilters.environmentId) {
          query.environmentId = parseInt(String(safeFilters.environmentId));
        }

        // Team filter
        if (safeFilters.teamName && safeFilters.teamName !== 'all') {
          query.teamName = safeFilters.teamName;
        }

        // Type name filter
        if (safeFilters.typeName !== undefined && safeFilters.typeName !== null) {
          if (safeFilters.typeName === 'WORKED' || safeFilters.typeName === '') {
            // "WORKED" marker means exclude leave types
            query.typeName = { $nin: ['verlof', 'ziek', 'bijzonder', 'Verlof', 'Ziek', 'Bijzonder Verlof'] };
          } else {
            query.typeName = safeFilters.typeName;
          }
        }

        // User filter
        if (safeFilters.userId) {
          query.userId = parseInt(String(safeFilters.userId));
        }

        // Get total count
        const total = await db.collection('processed_hours_aggregated').countDocuments(query);

        // Fetch paginated records with database-level pagination
        const records = await db.collection('processed_hours_aggregated')
          .find(query)
          .sort({ date: -1, start: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Transform to match expected format
        const processedRecords = records.map((record: any) => ({
          id: record._id?.toString() || '',
          eitje_id: null, // Not stored in aggregated collection
          date: record.date,
          user_id: record.userId || null,
          user_name: record.userName || null, // ✅ Pre-aggregated (no N+1 queries!)
          environment_id: record.environmentId || null,
          environment_name: record.environmentName || null,
          team_id: record.teamId || null,
          team_name: record.teamName || null,
          start: record.start || null,
          end: record.end || null,
          break_minutes: record.breakMinutes || null,
          worked_hours: record.workedHours || null,
          hourly_wage: record.hourlyWage || null,
          wage_cost: record.wageCost || null,
          type_name: record.typeName || null,
          shift_type: record.shiftType || null,
          remarks: record.remarks || null,
          approved: record.approved || null,
          planning_shift_id: null, // Not stored in aggregated collection
          exported_to_hr_integration: null, // Not stored in aggregated collection
          updated_at: record.updatedAt ? (record.updatedAt instanceof Date ? record.updatedAt.toISOString() : new Date(record.updatedAt).toISOString()) : null,
          created_at: record.createdAt ? (record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()) : null,
        }));

        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: processedRecords,
          total,
          page,
          totalPages,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] processedHours error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch processed hours',
        };
      }
    },

    // Aggregated Hours
    aggregatedHours: async (
      _: any,
      { 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50, 
        filters = {} 
      }: { 
        startDate: string; 
        endDate: string; 
        page?: number; 
        limit?: number; 
        filters?: any;
      }
    ) => {
      try {
        const db = await getDatabase();
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Check if we can use hierarchical data
        const queryType = detectQueryType(startDate, endDate);
        const periods = extractTimePeriods(startDate, endDate);
        
        // Build base query
        const query: any = {
          date: {
            $gte: start,
            $lte: end,
          },
        };

        // Location filter
        if (filters.locationId && filters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(filters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }

        // Try to use hierarchical data if available and querying a specific year
        if (queryType === 'year' && periods.year && filters.locationId && filters.locationId !== 'all') {
          const recordsWithHierarchical = await db.collection('eitje_aggregated')
            .find({
              locationId: new ObjectId(filters.locationId),
              'hoursByYear.year': periods.year,
            })
            .toArray();
          
          if (recordsWithHierarchical.length > 0) {
            // Extract hierarchical data
            const hierarchicalRecords: any[] = [];
            
            for (const record of recordsWithHierarchical) {
              if (!record || !record.locationId) continue;
              
              const yearData = record.hoursByYear?.find((y: any) => y.year === periods.year);
              if (!yearData) continue;
              
              const locationData = yearData.byLocation?.find((loc: any) => 
                loc?.locationId && loc.locationId.toString() === filters.locationId
              );
              
              if (!locationData) continue;
              
              // Filter by team if specified
              let teams = locationData.byTeam;
              if (filters.teamName && filters.teamName !== 'all') {
                teams = teams.filter((team: any) => team.teamName === filters.teamName);
              }
              
              // Filter by worker if specified
              if (filters.userId) {
                teams = teams.map((team: any) => ({
                  ...team,
                  byWorker: team.byWorker.filter((worker: any) => 
                    worker.unifiedUserId.toString() === filters.userId
                  ),
                })).filter((team: any) => team.byWorker.length > 0);
              }
              
              // Build records from hierarchical data
              teams.forEach((team: any) => {
                team.byWorker.forEach((worker: any) => {
                  hierarchicalRecords.push({
                    id: `${record._id?.toString()}_${team.teamId}_${worker.unifiedUserId.toString()}`,
                    date: record.date.toISOString().split('T')[0],
                    user_id: worker.unifiedUserId.toString(),
                    user_name: worker.workerName,
                    environment_id: null,
                    environment_name: null,
                    team_id: team.teamId,
                    team_name: team.teamName,
                    hours_worked: worker.totalHoursWorked || 0,
                    hourly_rate: null,
                    hourly_cost: worker.totalWageCost / (worker.totalHoursWorked || 1),
                    labor_cost: worker.totalWageCost || null,
                    shift_count: 0,
                    total_breaks_minutes: null,
                    updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
                    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
                  });
                });
              });
            }
            
            if (hierarchicalRecords.length > 0) {
              const total = hierarchicalRecords.length;
              const skip = (page - 1) * limit;
              const paginated = hierarchicalRecords.slice(skip, skip + limit);
              
              return {
                success: true,
                records: paginated,
                total,
                page,
                totalPages: Math.ceil(total / limit),
              };
            }
          }
        }

        // Fallback to existing query logic
        // Environment filter
        if (filters.environmentId) {
          query.environmentId = parseInt(String(filters.environmentId));
        }

        // Team filter
        if (filters.teamName && filters.teamName !== 'all') {
          query.teamName = filters.teamName;
        }

        // User filter
        if (filters.userId) {
          query.userId = parseInt(String(filters.userId));
        }

        const total = await db.collection('eitje_aggregated').countDocuments(query);

        const records = await db.collection('eitje_aggregated')
          .find(query)
          .sort({ date: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        const aggregatedRecords = records.map((record, index) => {
          return {
            id: record._id?.toString() || `${index}`,
            date: new Date(record.date).toISOString().split('T')[0],
            user_id: record.userId || null,
            user_name: record.userName || null,
            environment_id: record.environmentId || null,
            environment_name: record.environmentName || null,
            team_id: record.teamId || null,
            team_name: record.teamName || null,
            hours_worked: record.totalHoursWorked || 0,
            hourly_rate: record.hourlyRate || null,
            hourly_cost: record.hourlyCost || null,
            labor_cost: record.totalWageCost || null,
            shift_count: record.shiftCount || 0,
            total_breaks_minutes: record.totalBreaksMinutes || null,
            updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
            created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
          };
        });

        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: aggregatedRecords,
          total,
          page,
          totalPages,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] aggregatedHours error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch aggregated hours',
        };
      }
    },

    // Daily Sales
    // ✅ NOW USES: sales_line_items_aggregated collection (line-item level data)
    // This resolver is used for detailed sales line-item views that require individual transaction data
    dailySales: async (
      _: any,
      { 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50, 
        filters = {} 
      }: { 
        startDate: string; 
        endDate: string; 
        page?: number; 
        limit?: number; 
        filters?: any;
      }
    ) => {
      try {
        const db = await getDatabase();

        // ✅ Ensure filters is an object (handle null/undefined)
        const safeFilters = filters || {};

        // Build query for sales_line_items_aggregated
        const query: any = {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Apply filters
        if (safeFilters.category && safeFilters.category !== 'all') {
          query.category = safeFilters.category;
        }

        if (safeFilters.productName) {
          query.productName = { $regex: safeFilters.productName, $options: 'i' };
        }

        if (safeFilters.waiterName) {
          query.waiterName = { $regex: safeFilters.waiterName, $options: 'i' };
        }

        // ✅ Check if collection exists - return error if not (no fallback to raw data)
        const collectionExists = await db.listCollections({ name: 'sales_line_items_aggregated' }).hasNext();
        if (!collectionExists) {
          const errorMessage = 'sales_line_items_aggregated collection not found. Run /api/bork/v2/aggregate-sales-line-items first to create the aggregated collection.';
          logger.error('[dailySales]', errorMessage);
          return {
            success: false,
            records: [],
            total: 0,
            page,
            totalPages: 0,
            error: errorMessage,
          };
        }

        // Get total count (with timeout protection and max execution time)
        let total = 0;
        try {
          total = await db.collection('sales_line_items_aggregated')
            .countDocuments(query, { maxTimeMS: 10000 }); // 10 second timeout for count
        } catch (error: any) {
          logger.warn('[dailySales] Error counting documents:', error.message);
          // If count fails, return empty result to prevent timeout
          return {
            success: true,
            records: [],
            total: 0,
            page,
            totalPages: 0,
          };
        }

        // Fetch paginated records with database-level pagination
        // ✅ Use indexed fields for sorting (date is indexed)
        // ✅ Add maxTimeMS to prevent long-running queries
        const records = await db.collection('sales_line_items_aggregated')
          .find(query, { maxTimeMS: 30000 }) // 30 second timeout for query
          .sort({ date: -1, time: -1 }) // Uses { date: -1, time: -1 } index
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Transform to match expected format
        const paginatedRecords = records.map((record: any) => ({
          id: record._id?.toString() || '',
          date: record.date,
          location_id: record.locationId?.toString() || '',
          location_name: record.locationName || null,
          ticket_key: record.ticketKey || null,
          ticket_number: record.ticketNumber || '',
          order_key: record.orderKey || null,
          order_line_key: record.orderLineKey || null,
          product_name: record.productName || null,
          product_sku: record.productSku || null,
          product_number: record.productNumber || null,
          category: record.category || null,
          group_name: record.groupName || null,
          quantity: record.quantity || 0,
          unit_price: record.unitPrice || null,
          total_ex_vat: record.totalExVat || null,
          total_inc_vat: record.totalIncVat || null,
          vat_rate: record.vatRate || null,
          vat_amount: record.vatAmount || null,
          cost_price: record.costPrice || null,
          payment_method: record.paymentMethod || null,
          table_number: record.tableNumber || null,
          waiter_name: record.waiterName || null,
          time: record.time || null,
                    created_at: record.createdAt ? (record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()) : null,
        }));

        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: paginatedRecords,
          total,
          page,
          totalPages,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] dailySales error:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          error: error,
        });
        
        // Return safe error response that can be serialized
        const errorMessage = error?.message || error?.toString() || 'Failed to fetch daily sales';
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: String(errorMessage).substring(0, 500), // Limit error message length
        };
      }
    },

    // Categories & Products Aggregate
    categoriesProductsAggregate: async (
      _: any,
      { 
        startDate, 
        endDate, 
        filters = {} 
      }: { 
        startDate: string; 
        endDate: string; 
        filters?: any;
      }
    ) => {
      try {
        const db = await getDatabase();
        const start = new Date(startDate + 'T00:00:00.000Z');
        let end: Date;
        if (startDate === endDate) {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
          endDateObj.setUTCHours(1, 0, 0, 0);
          end = endDateObj;
        } else {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCHours(23, 59, 59, 999);
          end = endDateObj;
        }

        // ✅ Query products_aggregated instead of bork_raw_data
        // For catalog view, show all products (not just active ones with sales)
        const query: any = {
          // Don't filter by isActive - show all products in catalog
          // Client-side filters can handle active/inactive filtering
        };

        let locationObjectId: ObjectId | null = null;
        if (filters && filters.locationId && filters.locationId !== 'all') {
          try {
            locationObjectId = new ObjectId(filters.locationId);
            query['locationDetails.locationId'] = locationObjectId;
          } catch (e) {
            logger.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }

        // Filter by category
        if (filters && filters.category && filters.category !== 'all') {
          query.category = filters.category;
        }

        // Filter by product name
        if (filters && filters.productName) {
          query.productName = { $regex: filters.productName, $options: 'i' };
        }

        // Filter by main category if needed
        if (filters && filters.mainCategory && filters.mainCategory !== 'all') {
          query.mainCategory = filters.mainCategory;
        }

        // Helper functions
        const initTotals = () => ({
          quantity: 0,
          revenueExVat: 0,
          revenueIncVat: 0,
          transactionCount: 0,
        });

        const addTotals = (target: any, source: any) => {
          target.quantity += source.quantity || 0;
          target.revenueExVat += source.revenueExVat || 0;
          target.revenueIncVat += source.revenueIncVat || 0;
          target.transactionCount += source.transactionCount || 0;
        };

        // ✅ Fetch products from products_aggregated (pre-calculated data)
        const products = await db.collection('products_aggregated')
          .find(query)
          .toArray();

        logger.log(`[categoriesProductsAggregate] Found ${products.length} products from products_aggregated`);

        // ✅ Process pre-aggregated products data
        // Group products by category and main category
        const mainCategoryMap = new Map<string, Map<string, any[]>>();
        const categoryProductMap = new Map<string, any[]>();
        
        let productsWithMainCategory = 0;
        let productsWithoutMainCategory = 0;
        let productsProcessed = 0;

        for (const product of products) {
          productsProcessed++;
          const category = product.category || 'Uncategorized';
          const mainCategory = product.mainCategory || null;
          const productName = product.productName;

          // Use hierarchical data if available, otherwise fallback to calculation
          const startDateStr = startDate; // Already in YYYY-MM-DD format
          const endDateStr = endDate; // Already in YYYY-MM-DD format
          
          const salesData = getProductSalesData(
            product,
            startDateStr,
            endDateStr,
            locationObjectId?.toString()
          );
          
          const productDaily = salesData.daily;
          const productWeekly = salesData.weekly;
          const productMonthly = salesData.monthly;
          const productTotal = salesData.total;

          // Create product aggregate
          // Serialize locationDetails (convert ObjectId to string, Date to ISO string)
          const serializedLocationDetails = (product.locationDetails || []).map((loc: any) => ({
            locationId: loc.locationId instanceof ObjectId ? loc.locationId.toString() : (loc.locationId?.toString() || null),
            locationName: loc.locationName || null,
            lastSoldDate: loc.lastSoldDate instanceof Date ? loc.lastSoldDate.toISOString() : (loc.lastSoldDate || null),
            totalQuantitySold: loc.totalQuantitySold || 0,
            totalRevenue: loc.totalRevenue || 0,
          }));

          const productAggregate = {
            productName,
            daily: productDaily,
            weekly: productWeekly,
            monthly: productMonthly,
            total: productTotal,
            workloadLevel: product.workloadLevel || 'mid',
            workloadMinutes: product.workloadMinutes || 5,
            mepLevel: product.mepLevel || 'low',
            mepMinutes: product.mepMinutes || 1,
            courseType: product.courseType || undefined,
            isActive: product.isActive !== undefined ? product.isActive : true, // Include isActive for client-side filtering
            locationDetails: serializedLocationDetails, // Include location info (which locations sell this product)
          };

          // Group by category
                  if (mainCategory) {
            productsWithMainCategory++;
                    if (!mainCategoryMap.has(mainCategory)) {
                      mainCategoryMap.set(mainCategory, new Map());
                    }
                    const categoryMap = mainCategoryMap.get(mainCategory)!;
            if (!categoryMap.has(category)) {
              categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(productAggregate);
          } else {
            productsWithoutMainCategory++;
            if (!categoryProductMap.has(category)) {
              categoryProductMap.set(category, []);
            }
            categoryProductMap.get(category)!.push(productAggregate);
          }
        }
        
        logger.log(`[categoriesProductsAggregate] Processed ${productsProcessed} products: ${productsWithMainCategory} with mainCategory, ${productsWithoutMainCategory} without`);

        // ✅ Deduplicate products within each category BEFORE building response
        // This ensures each product appears only once per category, even if it exists multiple times in DB
        const deduplicateProductsInCategory = (productList: any[]): any[] => {
          const productMap = new Map<string, any>();
          
          for (const product of productList) {
            const productName = product.productName;
            
            if (productMap.has(productName)) {
              // Merge with existing product
              const existing = productMap.get(productName)!;
              
              // Merge totals
              addTotals(existing.daily, product.daily);
              addTotals(existing.weekly, product.weekly);
              addTotals(existing.monthly, product.monthly);
              addTotals(existing.total, product.total);
              
              // Merge locationDetails (deduplicate by locationId)
              const existingLocationIds = new Set(
                (existing.locationDetails || []).map((loc: any) => loc.locationId?.toString())
              );
              
              for (const loc of (product.locationDetails || [])) {
                const locId = loc.locationId?.toString();
                if (locId && !existingLocationIds.has(locId)) {
                  existing.locationDetails.push(loc);
                  existingLocationIds.add(locId);
                }
              }
              
              // Keep best workload/mep/courseType (prefer non-default values)
              if (product.workloadLevel && product.workloadLevel !== 'mid') {
                existing.workloadLevel = product.workloadLevel;
                existing.workloadMinutes = product.workloadMinutes || existing.workloadMinutes;
              }
              if (product.mepLevel && product.mepLevel !== 'low') {
                existing.mepLevel = product.mepLevel;
                existing.mepMinutes = product.mepMinutes || existing.mepMinutes;
              }
              if (product.courseType && !existing.courseType) {
                existing.courseType = product.courseType;
              }
            } else {
              // First occurrence of this product
                      productMap.set(productName, {
                ...product,
                locationDetails: [...(product.locationDetails || [])],
              });
            }
          }
          
          return Array.from(productMap.values());
        };

        // Deduplicate products in all categories
        for (const categoryMap of mainCategoryMap.values()) {
          for (const [categoryName, productList] of categoryMap.entries()) {
            categoryMap.set(categoryName, deduplicateProductsInCategory(productList));
          }
        }
        for (const [categoryName, productList] of categoryProductMap.entries()) {
          categoryProductMap.set(categoryName, deduplicateProductsInCategory(productList));
        }

        // ✅ Build response structure from grouped data
        // ✅ UNIFY CATEGORIES: Use categoryName as key (not mainCategory::category)
        // Categories are shared across locations - same category name = same category
        const categoriesMap = new Map<string, {
          categoryName: string;
          mainCategoryName: string | null; // Use most common mainCategory if multiple
          products: any[];
          daily: any;
          weekly: any;
          monthly: any;
          total: any;
        }>();
        const mainCategories: any[] = [];
        const grandTotals = initTotals();

        // ✅ Helper to deduplicate and merge products by productName
        // Products with the same name from different locations are merged into one
        const deduplicateProducts = (products: any[]): any[] => {
          const productMap = new Map<string, any>();
          
          for (const product of products) {
            const productName = product.productName;
            
            if (productMap.has(productName)) {
              // Merge with existing product
              const existing = productMap.get(productName)!;
              
              // Merge totals
              addTotals(existing.daily, product.daily);
              addTotals(existing.weekly, product.weekly);
              addTotals(existing.monthly, product.monthly);
              addTotals(existing.total, product.total);
              
              // Merge locationDetails (deduplicate by locationId)
              const existingLocationIds = new Set(
                (existing.locationDetails || []).map((loc: any) => loc.locationId?.toString())
              );
              
              for (const loc of (product.locationDetails || [])) {
                const locId = loc.locationId?.toString();
                if (locId && !existingLocationIds.has(locId)) {
                  existing.locationDetails.push(loc);
                  existingLocationIds.add(locId);
                }
              }
              
              // Keep existing workload/mep/courseType (or use product's if existing is default)
              if (!existing.workloadLevel || existing.workloadLevel === 'mid') {
                existing.workloadLevel = product.workloadLevel || existing.workloadLevel;
              }
              if (!existing.mepLevel || existing.mepLevel === 'low') {
                existing.mepLevel = product.mepLevel || existing.mepLevel;
              }
              if (!existing.courseType && product.courseType) {
                existing.courseType = product.courseType;
              }
            } else {
              // First occurrence of this product
              productMap.set(productName, {
                ...product,
                locationDetails: [...(product.locationDetails || [])],
              });
            }
          }
          
          return Array.from(productMap.values());
        };

        // Process main categories - unify by category name only
        for (const [mainCategoryName, categoryMap] of mainCategoryMap.entries()) {
          const mainCategoryTotals = {
            daily: initTotals(),
            weekly: initTotals(),
            monthly: initTotals(),
            total: initTotals(),
          };
          
          const categoryAggregates: any[] = [];
          
          for (const [categoryName, productList] of categoryMap.entries()) {
            const categoryTotals = {
              daily: initTotals(),
              weekly: initTotals(),
              monthly: initTotals(),
              total: initTotals(),
            };
            
            // Sum up all products in this category
            for (const product of productList) {
              addTotals(categoryTotals.daily, product.daily);
              addTotals(categoryTotals.weekly, product.weekly);
              addTotals(categoryTotals.monthly, product.monthly);
              addTotals(categoryTotals.total, product.total);
            }
            
            // ✅ UNIFIED KEY: Use categoryName only (categories are shared across locations)
            const categoryKey = categoryName;
            
            // Merge products with same category name (unified category)
            if (categoriesMap.has(categoryKey)) {
              // Merge with existing unified category
              const existing = categoriesMap.get(categoryKey)!;
              // ✅ Deduplicate products by productName when merging
              const mergedProducts = deduplicateProducts([...existing.products, ...productList]);
              existing.products = mergedProducts;
              addTotals(existing.daily, categoryTotals.daily);
              addTotals(existing.weekly, categoryTotals.weekly);
              addTotals(existing.monthly, categoryTotals.monthly);
              addTotals(existing.total, categoryTotals.total);
              // Keep mainCategory if not set, or use current if existing is null
              if (!existing.mainCategoryName && mainCategoryName) {
                existing.mainCategoryName = mainCategoryName;
              }
            } else {
              // ✅ Deduplicate products in new category
              const deduplicatedProducts = deduplicateProducts(productList);
              categoriesMap.set(categoryKey, {
                categoryName,
                mainCategoryName,
                products: deduplicatedProducts,
                daily: categoryTotals.daily,
                weekly: categoryTotals.weekly,
                monthly: categoryTotals.monthly,
                total: categoryTotals.total,
              });
            }
            
            // ✅ Deduplicate products in categoryAggregates
            const deduplicatedProductsForAggregate = deduplicateProducts(productList);
            categoryAggregates.push({
              categoryName,
              mainCategoryName,
              products: deduplicatedProductsForAggregate,
              daily: categoryTotals.daily,
              weekly: categoryTotals.weekly,
              monthly: categoryTotals.monthly,
              total: categoryTotals.total,
            });
            
            addTotals(mainCategoryTotals.daily, categoryTotals.daily);
            addTotals(mainCategoryTotals.weekly, categoryTotals.weekly);
            addTotals(mainCategoryTotals.monthly, categoryTotals.monthly);
            addTotals(mainCategoryTotals.total, categoryTotals.total);
          }
          
          mainCategories.push({
            mainCategoryName,
            categories: categoryAggregates,
            daily: mainCategoryTotals.daily,
            weekly: mainCategoryTotals.weekly,
            monthly: mainCategoryTotals.monthly,
            total: mainCategoryTotals.total,
          });
          
          addTotals(grandTotals, mainCategoryTotals.total);
        }

        // Process categories without main category - merge into unified categories
        for (const [categoryName, productList] of categoryProductMap.entries()) {
          const categoryTotals = {
            daily: initTotals(),
            weekly: initTotals(),
            monthly: initTotals(),
            total: initTotals(),
          };
          
          // Sum up all products in this category
          for (const product of productList) {
            addTotals(categoryTotals.daily, product.daily);
            addTotals(categoryTotals.weekly, product.weekly);
            addTotals(categoryTotals.monthly, product.monthly);
            addTotals(categoryTotals.total, product.total);
          }
          
          // ✅ UNIFIED KEY: Use categoryName only
          const categoryKey = categoryName;
          
          // Merge into unified category (same category name = same category)
          if (categoriesMap.has(categoryKey)) {
            // Merge with existing unified category
            const existing = categoriesMap.get(categoryKey)!;
            // ✅ Deduplicate products by productName when merging
            const mergedProducts = deduplicateProducts([...existing.products, ...productList]);
            existing.products = mergedProducts;
            addTotals(existing.daily, categoryTotals.daily);
            addTotals(existing.weekly, categoryTotals.weekly);
            addTotals(existing.monthly, categoryTotals.monthly);
            addTotals(existing.total, categoryTotals.total);
          } else {
            // ✅ Deduplicate products in new category
            const deduplicatedProducts = deduplicateProducts(productList);
            categoriesMap.set(categoryKey, {
            categoryName,
            mainCategoryName: null,
              products: deduplicatedProducts,
            daily: categoryTotals.daily,
            weekly: categoryTotals.weekly,
            monthly: categoryTotals.monthly,
            total: categoryTotals.total,
          });
          }
          
          addTotals(grandTotals, categoryTotals.total);
        }

        // Convert map to array (unified categories - one per category name)
        // ✅ Filter out categories with empty or invalid names
        const categories = Array.from(categoriesMap.values())
          .filter(cat => cat.categoryName && cat.categoryName.trim() !== '');

        logger.log(`[categoriesProductsAggregate] Returning ${categories.length} unified categories, ${mainCategories.length} main categories, ${categories.reduce((sum, cat) => sum + cat.products.length, 0)} total products`);

        return {
          success: true,
          categories,
          mainCategories: mainCategories.length > 0 ? mainCategories : undefined,
          totals: grandTotals,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] categoriesProductsAggregate error:', error);
        return {
          success: false,
          categories: [],
          totals: {
            quantity: 0,
            revenueExVat: 0,
            revenueIncVat: 0,
            transactionCount: 0,
          },
          error: error.message || 'Failed to fetch categories/products aggregate',
        };
      }
    },

    // ✅ Lightweight categories metadata (for fast first paint - no products)
    categoriesMetadata: async (
      _: any,
      { 
        startDate, 
        endDate, 
        filters = {} 
      }: { 
        startDate: string; 
        endDate: string; 
        filters?: any;
      }
    ) => {
      try {
        const db = await getDatabase();
        const start = new Date(startDate + 'T00:00:00.000Z');
        let end: Date;
        if (startDate === endDate) {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
          endDateObj.setUTCHours(1, 0, 0, 0);
          end = endDateObj;
        } else {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCHours(23, 59, 59, 999);
          end = endDateObj;
        }

        // Build query (same as categoriesProductsAggregate but we only need metadata)
        const query: any = {};
        let locationObjectId: ObjectId | null = null;
        if (filters && filters.locationId && filters.locationId !== 'all') {
          try {
            locationObjectId = new ObjectId(filters.locationId);
            query['locationDetails.locationId'] = locationObjectId;
          } catch (e) {
            logger.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }
        if (filters && filters.category && filters.category !== 'all') {
          query.category = filters.category;
        }
        if (filters && filters.productName) {
          query.productName = { $regex: filters.productName, $options: 'i' };
        }
        if (filters && filters.mainCategory && filters.mainCategory !== 'all') {
          query.mainCategory = filters.mainCategory;
        }

        // ✅ Simple query - get products and group in JavaScript (simpler and still fast)
        // Only fetch minimal fields needed for metadata
        const products = await db.collection('products_aggregated')
          .find(query, {
            projection: {
              category: 1,
              mainCategory: 1,
              productName: 1,
              salesByDate: 1,
            }
          })
          .toArray();

        const startDateStr = startDate;
        const endDateStr = endDate;
        
        // Group by category in JavaScript
        const categoryMap = new Map<string, {
          categoryName: string;
          mainCategoryName: string | null;
          productCount: number;
          totalQuantity: number;
          totalRevenueIncVat: number;
        }>();

        for (const product of products) {
          const categoryName = product.category || 'Uncategorized';
          if (!categoryName || categoryName.trim() === '') continue;

          // Calculate totals from salesByDate filtered by date range
          const filteredSales = (product.salesByDate || []).filter((sale: any) => {
            const saleDate = sale.date;
            return saleDate >= startDateStr && saleDate <= endDateStr;
          });

          const categoryTotalQuantity = filteredSales.reduce((sum: number, sale: any) => sum + (sale.quantity || 0), 0);
          const categoryTotalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + (sale.revenueIncVat || 0), 0);

          if (categoryMap.has(categoryName)) {
            const existing = categoryMap.get(categoryName)!;
            existing.productCount += 1;
            existing.totalQuantity += categoryTotalQuantity;
            existing.totalRevenueIncVat += categoryTotalRevenue;
            // Use first mainCategory encountered
            if (!existing.mainCategoryName && product.mainCategory) {
              existing.mainCategoryName = product.mainCategory;
            }
          } else {
            categoryMap.set(categoryName, {
              categoryName,
              mainCategoryName: product.mainCategory || null,
              productCount: 1,
              totalQuantity: categoryTotalQuantity,
              totalRevenueIncVat: categoryTotalRevenue,
            });
          }
        }

        const categories = Array.from(categoryMap.values());

        // Calculate grand totals
        const grandTotals = {
          quantity: 0,
          revenueExVat: 0,
          revenueIncVat: 0,
          transactionCount: 0,
        };

        const categoriesArray = categories
          .filter(cat => cat.categoryName && cat.categoryName.trim() !== '')
          .map(cat => {
            grandTotals.quantity += cat.totalQuantity;
            grandTotals.revenueIncVat += cat.totalRevenueIncVat;
            
            return {
              categoryName: cat.categoryName,
              mainCategoryName: cat.mainCategoryName,
              productCount: cat.productCount,
              total: {
                quantity: cat.totalQuantity,
                revenueExVat: 0,
                revenueIncVat: cat.totalRevenueIncVat,
                transactionCount: 0,
              },
            };
          });

        return {
          success: true,
          categories: categoriesArray,
          totals: grandTotals,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] categoriesMetadata error:', error);
        return {
          success: false,
          categories: [],
          totals: {
            quantity: 0,
            revenueExVat: 0,
            revenueIncVat: 0,
            transactionCount: 0,
          },
          error: error.message || 'Failed to fetch categories metadata',
        };
      }
    },

    // ✅ Load products for a specific category (lazy loading)
    categoryProducts: async (
      _: any,
      { 
        categoryName,
        startDate, 
        endDate, 
        filters = {} 
      }: { 
        categoryName: string;
        startDate: string; 
        endDate: string; 
        filters?: any;
      }
    ) => {
      try {
        const db = await getDatabase();
        const start = new Date(startDate + 'T00:00:00.000Z');
        let end: Date;
        if (startDate === endDate) {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
          endDateObj.setUTCHours(1, 0, 0, 0);
          end = endDateObj;
        } else {
          const endDateObj = new Date(endDate + 'T00:00:00.000Z');
          endDateObj.setUTCHours(23, 59, 59, 999);
          end = endDateObj;
        }

        // Build query for this specific category
        const query: any = {
          category: categoryName,
        };

        let locationObjectId: ObjectId | null = null;
        if (filters && filters.locationId && filters.locationId !== 'all') {
          try {
            locationObjectId = new ObjectId(filters.locationId);
            query['locationDetails.locationId'] = locationObjectId;
          } catch (e) {
            logger.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }
        if (filters && filters.productName) {
          query.productName = { $regex: filters.productName, $options: 'i' };
        }

        // Helper functions (same as categoriesProductsAggregate)
        const initTotals = () => ({
          quantity: 0,
          revenueExVat: 0,
          revenueIncVat: 0,
          transactionCount: 0,
        });

        const addTotals = (target: any, source: any) => {
          target.quantity += source.quantity || 0;
          target.revenueExVat += source.revenueExVat || 0;
          target.revenueIncVat += source.revenueIncVat || 0;
          target.transactionCount += source.transactionCount || 0;
        };

        // Fetch products for this category
        const products = await db.collection('products_aggregated')
          .find(query)
          .toArray();

        const startDateStr = startDate;
        const endDateStr = endDate;
        const categoryTotals = {
          daily: initTotals(),
          weekly: initTotals(),
          monthly: initTotals(),
          total: initTotals(),
        };

        const productAggregates: any[] = [];

        for (const product of products) {
          // Use hierarchical data if available, otherwise fallback to calculation
          const salesData = getProductSalesData(
            product,
            startDateStr,
            endDateStr,
            locationObjectId?.toString()
          );
          
          const productDaily = salesData.daily;
          const productWeekly = salesData.weekly;
          const productMonthly = salesData.monthly;
          const productTotal = salesData.total;

          // Serialize locationDetails
          const serializedLocationDetails = (product.locationDetails || []).map((loc: any) => ({
            locationId: loc.locationId instanceof ObjectId ? loc.locationId.toString() : (loc.locationId?.toString() || null),
            locationName: loc.locationName || null,
            lastSoldDate: loc.lastSoldDate instanceof Date ? loc.lastSoldDate.toISOString() : (loc.lastSoldDate || null),
            totalQuantitySold: loc.totalQuantitySold || 0,
            totalRevenue: loc.totalRevenue || 0,
          }));

          productAggregates.push({
            productName: product.productName,
            daily: productDaily,
            weekly: productWeekly,
            monthly: productMonthly,
            total: productTotal,
            workloadLevel: product.workloadLevel || 'mid',
            workloadMinutes: product.workloadMinutes || 5,
            mepLevel: product.mepLevel || 'low',
            mepMinutes: product.mepMinutes || 1,
            courseType: product.courseType || undefined,
            isActive: product.isActive !== undefined ? product.isActive : true,
            locationDetails: serializedLocationDetails,
          });

          addTotals(categoryTotals.total, productTotal);
        }

        // Deduplicate products by productName
        const productMap = new Map<string, any>();
        for (const product of productAggregates) {
          if (productMap.has(product.productName)) {
            const existing = productMap.get(product.productName)!;
            addTotals(existing.daily, product.daily);
            addTotals(existing.weekly, product.weekly);
            addTotals(existing.monthly, product.monthly);
            addTotals(existing.total, product.total);
            // Merge locationDetails
            const existingLocationIds = new Set(
              (existing.locationDetails || []).map((loc: any) => loc.locationId?.toString())
            );
            for (const loc of (product.locationDetails || [])) {
              const locId = loc.locationId?.toString();
              if (locId && !existingLocationIds.has(locId)) {
                existing.locationDetails.push(loc);
                existingLocationIds.add(locId);
              }
            }
          } else {
            productMap.set(product.productName, {
              ...product,
              locationDetails: [...(product.locationDetails || [])],
            });
          }
        }

        const deduplicatedProducts = Array.from(productMap.values());

        return {
          categoryName,
          mainCategoryName: products[0]?.mainCategory || null,
          products: deduplicatedProducts,
          daily: categoryTotals.daily,
          weekly: categoryTotals.weekly,
          monthly: categoryTotals.monthly,
          total: categoryTotals.total,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] categoryProducts error:', error);
        throw new Error(error.message || 'Failed to fetch category products');
      }
    },

    // Sales Aggregations
    // ✅ NOW USES: bork_aggregated.waiterBreakdown[] (pre-aggregated data)
    waiterPerformance: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for bork_aggregated
        const query: any = {
          date: {
            $gte: new Date(startDate + 'T00:00:00.000Z'),
            $lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Fetch aggregated records
        const aggregatedRecords = await db.collection('bork_aggregated')
          .find(query)
          .toArray();

        // ✅ Aggregated collection already has locationName pre-computed - no enrichment needed!
        // Extract and flatten waiter breakdowns
        const waiterMap = new Map<string, any>();

        for (const record of aggregatedRecords) {
          if (!record.waiterBreakdown || !Array.isArray(record.waiterBreakdown)) continue;

          const locationIdStr = record.locationId?.toString() || '';
          const locationName = record.locationName || 'Unknown'; // ✅ Use pre-computed locationName

          for (const waiter of record.waiterBreakdown) {
            const waiterKey = `${waiter.waiterName}_${locationIdStr}`;

          if (!waiterMap.has(waiterKey)) {
            waiterMap.set(waiterKey, {
                waiter_name: waiter.waiterName,
                location_id: locationIdStr,
                location_name: locationName,
              total_revenue: 0,
              total_items_sold: 0,
                total_transactions: 0,
              });
            }

            const aggregated = waiterMap.get(waiterKey)!;
            aggregated.total_revenue += waiter.totalRevenue || 0;
            aggregated.total_items_sold += waiter.totalItemsSold || 0;
            aggregated.total_transactions += waiter.totalTransactions || 0;
          }
        }

        const result = Array.from(waiterMap.values()).map(waiter => ({
          waiter_name: waiter.waiter_name,
          location_id: waiter.location_id,
          location_name: waiter.location_name,
          total_revenue: Math.round(waiter.total_revenue * 100) / 100,
          total_transactions: waiter.total_transactions,
          total_items_sold: Math.round(waiter.total_items_sold * 100) / 100,
          average_ticket_value: waiter.total_transactions > 0 
            ? Math.round((waiter.total_revenue / waiter.total_transactions) * 100) / 100 
            : 0,
          average_items_per_transaction: waiter.total_transactions > 0
            ? Math.round((waiter.total_items_sold / waiter.total_transactions) * 100) / 100
            : 0,
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] waiterPerformance error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch waiter performance',
        };
      }
    },

    // ✅ NOW USES: bork_aggregated (daily totals per location)
    revenueBreakdown: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for bork_aggregated
        const query: any = {
          date: {
            $gte: new Date(startDate + 'T00:00:00.000Z'),
            $lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Fetch aggregated records
        const aggregatedRecords = await db.collection('bork_aggregated')
          .find(query)
          .sort({ date: -1 })
          .toArray();

        // ✅ Aggregated collection already has locationName pre-computed - no enrichment needed!
        // Transform to match expected format
        // Note: bork_aggregated has totalRevenue (inc VAT) but we need ex VAT and VAT amount
        // We'll calculate VAT from revenueByCategory if available, or estimate
        const result = aggregatedRecords.map((record) => {
          const locationIdStr = record.locationId?.toString() || '';
          const locationName = record.locationName || 'Unknown'; // ✅ Use pre-computed locationName
          const dateStr = record.date instanceof Date 
            ? record.date.toISOString().split('T')[0] 
            : typeof record.date === 'string' 
              ? record.date 
              : new Date(record.date).toISOString().split('T')[0];

          // Calculate VAT (estimate 21% if not available)
          const totalRevenueIncVat = record.totalRevenue || 0;
          const estimatedVatRate = 0.21; // 21% VAT
          const totalRevenueExVat = totalRevenueIncVat / (1 + estimatedVatRate);
          const totalVat = totalRevenueIncVat - totalRevenueExVat;

          return {
            date: dateStr,
            location_id: locationIdStr,
            location_name: locationName,
            total_revenue_ex_vat: Math.round(totalRevenueExVat * 100) / 100,
            total_revenue_inc_vat: Math.round(totalRevenueIncVat * 100) / 100,
            total_vat: Math.round(totalVat * 100) / 100,
            total_transactions: record.totalTransactions || 0,
            average_transaction_value: record.totalTransactions > 0
              ? Math.round((totalRevenueIncVat / record.totalTransactions) * 100) / 100
            : 0,
          gross_profit: null,
          };
        }).sort((a, b) => b.date.localeCompare(a.date));

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] revenueBreakdown error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch revenue breakdown',
        };
      }
    },

    // ✅ NOW USES: bork_aggregated.paymentMethodBreakdown[] (pre-aggregated data)
    paymentMethodStats: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for bork_aggregated
        const query: any = {
          date: {
            $gte: new Date(startDate + 'T00:00:00.000Z'),
            $lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Fetch aggregated records
        const aggregatedRecords = await db.collection('bork_aggregated')
          .find(query)
          .toArray();

        // ✅ Aggregated collection already has locationName pre-computed - no enrichment needed!
        // Extract and flatten payment method breakdowns
        const paymentMap = new Map<string, any>();
        let totalRevenue = 0;

        for (const record of aggregatedRecords) {
          if (!record.paymentMethodBreakdown || !Array.isArray(record.paymentMethodBreakdown)) continue;

          const locationIdStr = record.locationId?.toString() || '';
          const locationName = record.locationName || 'Unknown'; // ✅ Use pre-computed locationName

          for (const payment of record.paymentMethodBreakdown) {
            const key = `${payment.paymentMethod}_${locationIdStr}`;

          if (!paymentMap.has(key)) {
            paymentMap.set(key, {
                payment_method: payment.paymentMethod,
                location_id: locationIdStr,
                location_name: locationName,
              total_revenue: 0,
                total_transactions: 0,
              });
            }

            const aggregated = paymentMap.get(key)!;
            aggregated.total_revenue += payment.totalRevenue || 0;
            aggregated.total_transactions += payment.totalTransactions || 0;
            totalRevenue += payment.totalRevenue || 0;
          }
        }

        const result = Array.from(paymentMap.values()).map(payment => ({
          payment_method: payment.payment_method,
          location_id: payment.location_id,
          location_name: payment.location_name,
          total_revenue: Math.round(payment.total_revenue * 100) / 100,
          total_transactions: payment.total_transactions,
          average_transaction_value: payment.total_transactions > 0
            ? Math.round((payment.total_revenue / payment.total_transactions) * 100) / 100
            : 0,
          percentage_of_total: totalRevenue > 0
            ? Math.round((payment.total_revenue / totalRevenue) * 10000) / 100
            : 0,
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] paymentMethodStats error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch payment method stats',
        };
      }
    },

    // ✅ NOW USES: products_aggregated.productPerformanceByLocation[] (pre-aggregated data)
    productPerformance: async (
      _: any,
      { startDate, endDate, page = 1, limit = 50, filters = {} }: { startDate: string; endDate: string; page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for products_aggregated
        // Filter by date range using hierarchical data or salesByDate
        const query: any = {};

        if (safeFilters.productName) {
          query.productName = { $regex: safeFilters.productName, $options: 'i' };
        }

        if (safeFilters.category && safeFilters.category !== 'all') {
          query.category = safeFilters.category;
        }

        // Fetch products with productPerformanceByLocation
        const products = await db.collection('products_aggregated')
          .find(query)
          .toArray();

        // Filter productPerformanceByLocation by date range and location
        const productPerformanceRecords: any[] = [];

        for (const product of products) {
          if (!product.productPerformanceByLocation || !Array.isArray(product.productPerformanceByLocation)) continue;

          for (const perf of product.productPerformanceByLocation) {
            // Filter by location
            if (safeFilters.locationId && safeFilters.locationId !== 'all') {
              if (perf.locationId?.toString() !== safeFilters.locationId) continue;
            }

            // Filter by date range (check lastSoldDate)
            if (perf.lastSoldDate) {
              const lastSold = perf.lastSoldDate instanceof Date 
                ? perf.lastSoldDate 
                : new Date(perf.lastSoldDate);
              const start = new Date(startDate + 'T00:00:00.000Z');
              const end = new Date(endDate + 'T23:59:59.999Z');
              
              if (lastSold < start || lastSold > end) continue;
            }

            productPerformanceRecords.push({
              product_name: product.productName,
              category: product.category || null,
              location_id: perf.locationId?.toString() || '',
              location_name: perf.locationName || 'Unknown',
              total_quantity_sold: perf.totalQuantitySold || 0,
              total_revenue: perf.totalRevenue || 0,
              total_profit: perf.totalProfit || 0,
              average_unit_price: perf.averageUnitPrice || 0,
              transaction_count: perf.transactionCount || 0,
            });
          }
        }

        // Sort and paginate
        const sorted = productPerformanceRecords.sort((a, b) => b.total_revenue - a.total_revenue);
        const skip = (page - 1) * limit;
        const paginatedResult = sorted.slice(skip, skip + limit);
        const totalPages = Math.ceil(sorted.length / limit);

        return {
          success: true,
          records: paginatedResult,
          total: sorted.length,
          page,
          totalPages,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] productPerformance error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch product performance',
        };
      }
    },

    // Analysis Pages
    // ✅ NOW USES: bork_aggregated.hourlyBreakdown[] (pre-aggregated data)
    timeBasedAnalysis: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for bork_aggregated
        const query: any = {
          date: {
            $gte: new Date(startDate + 'T00:00:00.000Z'),
            $lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Fetch aggregated records
        const aggregatedRecords = await db.collection('bork_aggregated')
          .find(query)
          .toArray();

        // ✅ Aggregated collection already has locationName pre-computed - no enrichment needed!
        // Extract and flatten hourly breakdowns
        const hourMap = new Map<string, any>();

        for (const record of aggregatedRecords) {
          if (!record.hourlyBreakdown || !Array.isArray(record.hourlyBreakdown)) continue;
          
          const locationIdStr = record.locationId?.toString() || '';
          const locationName = record.locationName || 'Unknown'; // ✅ Use pre-computed locationName
          
          for (const hourData of record.hourlyBreakdown) {
            const key = `${hourData.hour}_${locationIdStr}`;

          if (!hourMap.has(key)) {
            hourMap.set(key, {
                hour: hourData.hour,
                location_id: locationIdStr,
                location_name: locationName,
              total_revenue: 0,
              total_items_sold: 0,
                total_transactions: 0,
              });
            }

            const aggregated = hourMap.get(key)!;
            aggregated.total_revenue += hourData.totalRevenue || 0;
            aggregated.total_items_sold += hourData.totalItemsSold || 0;
            aggregated.total_transactions += hourData.totalTransactions || 0;
          }
        }

        const result = Array.from(hourMap.values()).map(hourData => ({
          hour: hourData.hour,
          location_id: hourData.location_id,
          location_name: hourData.location_name,
          total_revenue: Math.round(hourData.total_revenue * 100) / 100,
          total_transactions: hourData.total_transactions,
          total_items_sold: Math.round(hourData.total_items_sold * 100) / 100,
          average_transaction_value: hourData.total_transactions > 0
            ? Math.round((hourData.total_revenue / hourData.total_transactions) * 100) / 100
            : 0,
        })).sort((a, b) => a.hour - b.hour);

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] timeBasedAnalysis error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch time-based analysis',
        };
      }
    },

    // ✅ NOW USES: bork_aggregated.tableBreakdown[] (pre-aggregated data)
    tableAnalysis: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for bork_aggregated
        const query: any = {
          date: {
            $gte: new Date(startDate + 'T00:00:00.000Z'),
            $lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Fetch aggregated records
        const aggregatedRecords = await db.collection('bork_aggregated')
          .find(query)
          .toArray();

        // Get location names in batch
        const locationIds = new Set<string>();
        aggregatedRecords.forEach((record) => {
          if (record.locationId) {
            locationIds.add(record.locationId.toString());
          }
        });

        const locationNameMap = new Map<string, string>();
        if (locationIds.size > 0) {
          const locationObjectIds = Array.from(locationIds)
            .map(id => {
              try {
                return new ObjectId(id);
              } catch {
                return null;
              }
            })
            .filter((id): id is ObjectId => id !== null);

          if (locationObjectIds.length > 0) {
            const locations = await db.collection('locations')
              .find({ _id: { $in: locationObjectIds } })
              .toArray() as Array<{ _id?: ObjectId; name?: string }>;

            locations.forEach((loc) => {
              if (loc._id) {
                locationNameMap.set(loc._id.toString(), loc.name || 'Unknown');
              }
            });
          }
        }

        // Extract and flatten table breakdowns
        const tableMap = new Map<string, any>();

        for (const record of aggregatedRecords) {
          if (!record.tableBreakdown || !Array.isArray(record.tableBreakdown)) continue;

          const locationIdStr = record.locationId?.toString() || '';
          const locationName = locationNameMap.get(locationIdStr) || 'Unknown';

          for (const tableData of record.tableBreakdown) {
            const key = `${tableData.tableNumber}_${locationIdStr}`;

          if (!tableMap.has(key)) {
            tableMap.set(key, {
                table_number: tableData.tableNumber,
                location_id: locationIdStr,
                location_name: locationName,
              total_revenue: 0,
              total_items_sold: 0,
                total_transactions: 0,
              });
            }

            const aggregated = tableMap.get(key)!;
            aggregated.total_revenue += tableData.totalRevenue || 0;
            aggregated.total_items_sold += tableData.totalItemsSold || 0;
            aggregated.total_transactions += tableData.totalTransactions || 0;
          }
        }

        const result = Array.from(tableMap.values()).map(tableData => ({
          table_number: tableData.table_number,
          location_id: tableData.location_id,
          location_name: tableData.location_name,
          total_revenue: Math.round(tableData.total_revenue * 100) / 100,
          total_transactions: tableData.total_transactions,
          total_items_sold: Math.round(tableData.total_items_sold * 100) / 100,
          average_transaction_value: tableData.total_transactions > 0
            ? Math.round((tableData.total_revenue / tableData.total_transactions) * 100) / 100
            : 0,
          turnover_rate: null, // Can be calculated if we have opening/closing times
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] tableAnalysis error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch table analysis',
        };
      }
    },

    // ✅ NOW USES: transactions_aggregated (transaction summary level)
    transactionAnalysis: async (
      _: any,
      { startDate, endDate, page = 1, limit = 50, filters = {} }: { startDate: string; endDate: string; page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const safeFilters = filters || {};

        // Build query for transactions_aggregated
        const query: any = {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        };

        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          try {
            query.locationId = new ObjectId(safeFilters.locationId);
          } catch (e) {
            logger.warn(`Invalid locationId: ${safeFilters.locationId}`);
          }
        }

        // Apply additional filters
        if (safeFilters.waiterName) {
          query.waiterName = { $regex: safeFilters.waiterName, $options: 'i' };
        }

        if (safeFilters.paymentMethod) {
          query.paymentMethod = safeFilters.paymentMethod;
        }

        // Get total count
        const total = await db.collection('transactions_aggregated').countDocuments(query);

        // Fetch paginated records with database-level pagination
        const records = await db.collection('transactions_aggregated')
          .find(query)
          .sort({ date: -1, time: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Transform to match expected format
        const result = records.map((transaction: any) => ({
          ticket_number: transaction.ticketNumber || '',
          date: transaction.date,
          location_id: transaction.locationId?.toString() || '',
          location_name: transaction.locationName || 'Unknown',
          table_number: transaction.tableNumber || null,
          waiter_name: transaction.waiterName || null,
          payment_method: transaction.paymentMethod || null,
          time: transaction.time || null,
          total_revenue: Math.round(transaction.totalRevenue * 100) / 100,
          total_items: Math.round(transaction.totalItems * 100) / 100,
          item_count: transaction.itemCount || 0,
        }));

        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: result,
          total,
          page,
          totalPages,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] transactionAnalysis error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch transaction analysis',
        };
      }
    },
  },

  Mutation: {
    // Worker Profiles
    createWorkerProfile: async (_: any, { input }: { input: any }) => {
      try {
        const db = await getDatabase();
        const now = new Date();
        
        const doc: any = {
          eitje_user_id: input.eitjeUserId,
          location_id: input.locationId || null,
          contract_type: input.contractType || null,
          contract_hours: input.contractHours || null,
          hourly_wage: input.hourlyWage || null,
          wage_override: input.wageOverride !== undefined ? input.wageOverride : false,
          effective_from: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
          effective_to: input.effectiveTo ? new Date(input.effectiveTo) : null,
          notes: input.notes || null,
          created_at: now,
          updated_at: now,
        };
        
        const insertResult = await db.collection('worker_profiles').insertOne(doc);
        const created = await db.collection('worker_profiles').findOne({ _id: insertResult.insertedId });
        
        // ✅ Get user name from unified_users (not eitje_raw_data)
        let userName = null;
        if (created.eitje_user_id) {
          // Try unified_users first (preferred source)
          const unifiedUser = await db.collection('unified_users').findOne({
            'systemMappings.system': 'eitje',
            'systemMappings.externalId': String(created.eitje_user_id)
          });
          if (unifiedUser) {
            userName = unifiedUser.name || null;
          } else {
            // Fallback: try to find by eitje_user_id in systemMappings
            const userByMapping = await db.collection('unified_users').findOne({
              $or: [
                { 'systemMappings': { $elemMatch: { system: 'eitje', externalId: String(created.eitje_user_id) } } }
              ]
            });
            if (userByMapping) {
              userName = userByMapping.name || null;
            }
          }
        }
        
        // ✅ Get location name from locations collection
        let locationName = null;
        if (created.location_id) {
          try {
            const location = await db.collection('locations').findOne({ 
              _id: toObjectId(created.location_id) 
            });
            if (location) {
              locationName = location.name || null;
            }
          } catch (error) {
            console.warn('[GraphQL] Error fetching location name:', error);
          }
        }
        
        const workerProfileResult = {
          id: created._id.toString(),
          eitjeUserId: created.eitje_user_id,
          userName,
          locationId: created.location_id || null,
          locationName,
          contractType: created.contract_type || null,
          contractHours: created.contract_hours || null,
          hourlyWage: created.hourly_wage || null,
          wageOverride: created.wage_override || false,
          effectiveFrom: created.effective_from ? new Date(created.effective_from).toISOString() : null,
          effectiveTo: created.effective_to ? new Date(created.effective_to).toISOString() : null,
          notes: created.notes || null,
          isActive: !created.effective_to || new Date(created.effective_to) > new Date(),
          createdAt: created.created_at ? new Date(created.created_at).toISOString() : null,
          updatedAt: created.updated_at ? new Date(created.updated_at).toISOString() : null,
        };

        // ✅ Trigger reaggregation (async, don't wait for completion)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/admin/aggregate-worker-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.warn('[GraphQL Resolver] Reaggregation trigger failed after createWorkerProfile:', err.message);
        });

        return workerProfileResult;
      } catch (error: any) {
        console.error('[GraphQL Resolver] createWorkerProfile error:', error);
        throw error;
      }
    },

    updateWorkerProfile: async (_: any, { id, input }: { id: string; input: any }) => {
      try {
        const db = await getDatabase();
        
        // If id is not a valid ObjectId, try to find worker profile by eitje_user_id
        let workerProfileId = id;
        if (!ObjectId.isValid(id)) {
          // Assume it's an eitje_user_id, find the worker profile
          const profile = await db.collection('worker_profiles').findOne({
            eitje_user_id: parseInt(id, 10)
          });
          if (profile && profile._id) {
            workerProfileId = profile._id.toString();
          } else {
            throw new Error(`Worker profile not found for eitje_user_id: ${id}`);
          }
        }
        
        const update: any = {
          updated_at: new Date(),
        };
        
        if (input.eitjeUserId !== undefined) update.eitje_user_id = input.eitjeUserId;
        if (input.locationIds !== undefined) {
          // Support multiple locations - store as array
          update.location_ids = input.locationIds && input.locationIds.length > 0 ? input.locationIds : [];
          // Also keep location_id for backward compatibility (use first location)
          update.location_id = input.locationIds && input.locationIds.length > 0 ? input.locationIds[0] : null;
        } else if (input.locationId !== undefined) {
          // Backward compatibility: single location
          update.location_id = input.locationId;
          update.location_ids = input.locationId ? [input.locationId] : [];
        }
        if (input.contractType !== undefined) update.contract_type = input.contractType;
        if (input.contractHours !== undefined) update.contract_hours = input.contractHours;
        if (input.hourlyWage !== undefined) update.hourly_wage = input.hourlyWage;
        if (input.wageOverride !== undefined) update.wage_override = input.wageOverride;
        if (input.effectiveFrom !== undefined) update.effective_from = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
        if (input.effectiveTo !== undefined) update.effective_to = input.effectiveTo ? new Date(input.effectiveTo) : null;
        if (input.notes !== undefined) update.notes = input.notes;
        
        await db.collection('worker_profiles').updateOne(
          { _id: toObjectId(workerProfileId) },
          { $set: update }
        );
        
        const updated = await db.collection('worker_profiles').findOne({ _id: toObjectId(workerProfileId) });
        
        if (!updated) throw new Error('Worker profile not found after update');
        
        // ✅ Get user name from unified_users (not eitje_raw_data)
        let userName = null;
        if (updated.eitje_user_id) {
          // Try unified_users first (preferred source)
          const unifiedUser = await db.collection('unified_users').findOne({
            'systemMappings.system': 'eitje',
            'systemMappings.externalId': String(updated.eitje_user_id)
          });
          if (unifiedUser) {
            userName = unifiedUser.name || null;
          } else {
            // Fallback: try to find by eitje_user_id in systemMappings
            const userByMapping = await db.collection('unified_users').findOne({
              $or: [
                { 'systemMappings': { $elemMatch: { system: 'eitje', externalId: String(updated.eitje_user_id) } } }
              ]
            });
            if (userByMapping) {
              userName = userByMapping.name || null;
            }
          }
        }
        
        // Get location name
        let locationName = null;
        if (updated.location_id) {
          try {
            const location = await db.collection('locations').findOne({ 
              _id: toObjectId(updated.location_id) 
            });
            if (location) {
              locationName = location.name || null;
            }
          } catch (error) {
            console.warn('[GraphQL] Error fetching location name:', error);
          }
        }
        
        const updatedWorkerProfileResult = {
          id: updated._id.toString(),
          eitjeUserId: updated.eitje_user_id,
          userName,
          locationId: updated.location_id || null,
          locationName,
          contractType: updated.contract_type || null,
          contractHours: updated.contract_hours || null,
          hourlyWage: updated.hourly_wage || null,
          wageOverride: updated.wage_override || false,
          effectiveFrom: updated.effective_from ? new Date(updated.effective_from).toISOString() : null,
          effectiveTo: updated.effective_to ? new Date(updated.effective_to).toISOString() : null,
          notes: updated.notes || null,
          isActive: !updated.effective_to || new Date(updated.effective_to) > new Date(),
          createdAt: updated.created_at ? new Date(updated.created_at).toISOString() : null,
          updatedAt: updated.updated_at ? new Date(updated.updated_at).toISOString() : null,
        };

        // ✅ Trigger reaggregation (async, don't wait for completion)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/admin/aggregate-worker-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.warn('[GraphQL Resolver] Reaggregation trigger failed after updateWorkerProfile:', err.message);
        });

        return updatedWorkerProfileResult;
      } catch (error: any) {
        console.error('[GraphQL Resolver] updateWorkerProfile error:', error);
        throw error;
      }
    },

    deleteWorkerProfile: async (_: any, { id }: { id: string }) => {
      try {
        const db = await getDatabase();
        const result = await db.collection('worker_profiles').deleteOne({ _id: toObjectId(id) });
        
        // ✅ Also delete from aggregated collection
        await db.collection('worker_profiles_aggregated').deleteOne({ _id: toObjectId(id) }).catch((err) => {
          console.warn('[GraphQL Resolver] Failed to delete from aggregated collection:', err.message);
        });

        // ✅ Trigger reaggregation (async, don't wait for completion)
        // This ensures any related data is cleaned up
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/admin/aggregate-worker-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.warn('[GraphQL Resolver] Reaggregation trigger failed after deleteWorkerProfile:', err.message);
        });

        return result.deletedCount === 1;
      } catch (error: any) {
        console.error('[GraphQL Resolver] deleteWorkerProfile error:', error);
        throw error;
      }
    },

    // API Credentials
    createApiCredential: async (_: any, { input }: { input: any }) => {
      const db = await getDatabase();
      const now = new Date();
      const doc: any = {
        ...input,
        locationId: input.locationId ? toObjectId(input.locationId) : null,
        isActive: input.isActive !== undefined ? input.isActive : true,
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection('api_credentials').insertOne(doc);
      return db.collection('api_credentials').findOne({ _id: result.insertedId });
    },

    updateApiCredential: async (_: any, { id, input }: { id: string; input: any }) => {
      const db = await getDatabase();
      const update: any = {
        ...input,
        updatedAt: new Date(),
      };
      if (input.locationId) {
        update.locationId = toObjectId(input.locationId);
      }
      await db.collection('api_credentials').updateOne(
        { _id: toObjectId(id) },
        { $set: update }
      );
      return db.collection('api_credentials').findOne({ _id: toObjectId(id) });
    },

    deleteApiCredential: async (_: any, { id }: { id: string }) => {
      const db = await getDatabase();
      const result = await db.collection('api_credentials').deleteOne({ _id: toObjectId(id) });
      return result.deletedCount === 1;
    },

    // Products
    createProduct: async (_: any, { input }: { input: any }) => {
      try {
        const db = await getDatabase();
        
        // Check if product already exists
        const existing = await db.collection('products_aggregated').findOne({ productName: input.productName });
        if (existing) {
          throw new Error(`Product "${input.productName}" already exists`);
        }

        // Calculate minutes from levels
        const workloadMinutes = input.workloadLevel === 'low' ? 2.5 : input.workloadLevel === 'mid' ? 5 : 10;
        const mepMinutes = input.mepLevel === 'low' ? 1 : input.mepLevel === 'mid' ? 2 : 4;

        const now = new Date();
        const product = {
          productName: input.productName,
          category: input.category || null,
          mainCategory: null,
          productSku: null,
          locationId: null, // Global product
          workloadLevel: input.workloadLevel,
          workloadMinutes,
          mepLevel: input.mepLevel,
          mepMinutes,
          courseType: input.courseType || null,
          isActive: input.isActive !== undefined ? input.isActive : true,
          notes: input.notes || null,
          // Initialize aggregated fields with defaults
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalTransactions: 0,
          firstSeen: now,
          lastSeen: now,
          averagePrice: 0,
          latestPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          priceHistory: [],
          salesByDate: [],
          salesByWeek: [],
          salesByMonth: [],
          locationDetails: [],
          menuIds: [],
          menuPrices: [],
          vatRate: null,
          costPrice: null,
          createdAt: now,
          updatedAt: now,
          lastAggregated: null,
        };

        const result = await db.collection('products_aggregated').insertOne(product);
        const created = await db.collection('products_aggregated').findOne({ _id: result.insertedId });

        return {
          id: created!._id.toString(),
          productName: created!.productName,
          category: created!.category || null,
          workloadLevel: created!.workloadLevel,
          workloadMinutes: created!.workloadMinutes,
          mepLevel: created!.mepLevel,
          mepMinutes: created!.mepMinutes,
          isActive: created!.isActive,
          notes: created!.notes || null,
          createdAt: created!.createdAt.toISOString(),
          updatedAt: created!.updatedAt.toISOString(),
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] createProduct error:', error);
        throw error;
      }
    },

    updateProduct: async (_: any, { id, input }: { id: string; input: any }) => {
      try {
        const db = await getDatabase();
        const update: any = {
          updatedAt: new Date(),
        };

        if (input.productName !== undefined) update.productName = input.productName;
        if (input.category !== undefined) update.category = input.category;
        if (input.workloadLevel !== undefined) {
          update.workloadLevel = input.workloadLevel;
          update.workloadMinutes = input.workloadLevel === 'low' ? 2.5 : input.workloadLevel === 'mid' ? 5 : 10;
        }
        if (input.mepLevel !== undefined) {
          update.mepLevel = input.mepLevel;
          update.mepMinutes = input.mepLevel === 'low' ? 1 : input.mepLevel === 'mid' ? 2 : 4;
        }
        if (input.notes !== undefined) update.notes = input.notes;
        if (input.isActive !== undefined) update.isActive = input.isActive;

        await db.collection('products_aggregated').updateOne(
          { _id: toObjectId(id) },
          { $set: update }
        );

        const updated = await db.collection('products_aggregated').findOne({ _id: toObjectId(id) });
        if (!updated) throw new Error('Product not found after update');

        return {
          id: updated._id.toString(),
          productName: updated.productName,
          category: updated.category || null,
          workloadLevel: updated.workloadLevel,
          workloadMinutes: updated.workloadMinutes,
          mepLevel: updated.mepLevel,
          mepMinutes: updated.mepMinutes,
          isActive: updated.isActive,
          notes: updated.notes || null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] updateProduct error:', error);
        throw error;
      }
    },

    deleteProduct: async (_: any, { id }: { id: string }) => {
      try {
        const db = await getDatabase();
        const result = await db.collection('products_aggregated').deleteOne({ _id: toObjectId(id) });
        return result.deletedCount === 1;
      } catch (error: any) {
        console.error('[GraphQL Resolver] deleteProduct error:', error);
        throw error;
      }
    },

    // Company Settings
    updateCompanySettings: async (_: any, { input }: { input: { workingDayStartHour: number } }) => {
      try {
        const db = await getDatabase();
        
        // Validate hour (0-23)
        if (input.workingDayStartHour < 0 || input.workingDayStartHour > 23) {
          throw new Error('workingDayStartHour must be between 0 and 23');
        }
        
        const now = new Date();
        const result = await db.collection('company_settings').findOneAndUpdate(
          {},
          {
            $set: {
              workingDayStartHour: input.workingDayStartHour,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
        
        if (!result) {
          throw new Error('Failed to update company settings');
        }
        
        return {
          id: result._id?.toString() || 'default',
          workingDayStartHour: result.workingDayStartHour || 6,
          createdAt: result.createdAt?.toISOString() || now.toISOString(),
          updatedAt: result.updatedAt?.toISOString() || now.toISOString(),
        };
      } catch (error: any) {
        logger.error('[GraphQL Resolver] updateCompanySettings error:', error);
        throw error;
      }
    },
  },

  // Field resolvers for relationships
  Location: {
    id: (parent: any) => {
      // ✅ If id is already set (from query resolver), return it
      if (parent?.id) {
        return parent.id;
      }
      // ✅ Otherwise, try to get it from _id
      if (parent?._id) {
        return toId(parent._id);
      }
      // ✅ Handle null/undefined gracefully
      console.warn('[GraphQL] Location.id resolver called with null/undefined _id and no id field', parent);
      return '';
    },
    users: async (parent: any) => {
      const db = await getDatabase();
      const locationId = getLocationId(parent);
      if (!locationId) return [];
      return db.collection('unified_users').find({
        locationIds: locationId,
        isActive: true,
      }).toArray();
    },
    teams: async (parent: any) => {
      const db = await getDatabase();
      const locationId = getLocationId(parent);
      if (!locationId) return [];
      return db.collection('unified_teams').find({
        locationIds: locationId,
        isActive: true,
      }).toArray();
    },
    salesData: async (parent: any, { dateRange }: { dateRange?: { start: string; end: string } }) => {
      const db = await getDatabase();
      const locationId = getLocationId(parent);
      if (!locationId) return [];
      const query: any = { locationId };
      if (dateRange) {
        query.date = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end),
        };
      }
      return db.collection('bork_aggregated').find(query).sort({ date: -1 }).toArray();
    },
    laborData: async (parent: any, { dateRange }: { dateRange?: { start: string; end: string } }) => {
      const db = await getDatabase();
      const locationId = getLocationId(parent);
      if (!locationId) return [];
      const query: any = { locationId };
      if (dateRange) {
        query.date = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end),
        };
      }
      return db.collection('eitje_aggregated').find(query).sort({ date: -1 }).toArray();
    },
    dashboard: async (parent: any, { date }: { date: string }) => {
      const db = await getDatabase();
      const locationId = getLocationId(parent);
      if (!locationId) return null;
      return db.collection('daily_dashboard').findOne({
        locationId,
        date: new Date(date),
      });
    },
  },

  User: {
    id: (parent: any) => toId(parent._id),
    locations: async (parent: any) => {
      const db = await getDatabase();
      if (!parent.locationIds || parent.locationIds.length === 0) return [];
      return db.collection('locations').find({
        _id: { $in: parent.locationIds },
        isActive: true,
      }).toArray();
    },
    teams: async (parent: any) => {
      const db = await getDatabase();
      if (!parent.teamIds || parent.teamIds.length === 0) return [];
      return db.collection('unified_teams').find({
        _id: { $in: parent.teamIds },
        isActive: true,
      }).toArray();
    },
  },

  Team: {
    id: (parent: any) => toId(parent._id),
    locations: async (parent: any) => {
      const db = await getDatabase();
      if (!parent.locationIds || parent.locationIds.length === 0) return [];
      return db.collection('locations').find({
        _id: { $in: parent.locationIds },
        isActive: true,
      }).toArray();
    },
    members: async (parent: any) => {
      const db = await getDatabase();
      if (!parent.memberIds || parent.memberIds.length === 0) return [];
      return db.collection('unified_users').find({
        _id: { $in: parent.memberIds },
        isActive: true,
      }).toArray();
    },
  },

  SalesData: {
    id: (parent: any) => toId(parent._id),
    location: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('locations').findOne({ _id: parent.locationId });
    },
  },

  LaborData: {
    id: (parent: any) => toId(parent._id),
    location: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('locations').findOne({ _id: parent.locationId });
    },
    teamStats: async (parent: any) => {
      const db = await getDatabase();
      if (!parent.teamStats || parent.teamStats.length === 0) return [];
      
      // Convert teamIds to ObjectIds, handling both string and ObjectId formats
      const teamIds = parent.teamStats
        .map((stat: any) => {
          try {
            const teamId = stat.teamId;
            if (!teamId) return null;
            // Try to convert to ObjectId if it's a string
            if (typeof teamId === 'string') {
              try {
                return new ObjectId(teamId);
              } catch {
                // If it's not a valid ObjectId string, try to find by systemMappings
                return null;
              }
            }
            return teamId instanceof ObjectId ? teamId : new ObjectId(teamId);
          } catch {
            return null;
          }
        })
        .filter((id: any) => id !== null);
      
      if (teamIds.length === 0) return [];
      
      const teams = await db.collection('unified_teams').find({
        _id: { $in: teamIds },
      }).toArray();
      
      const teamMap = new Map(teams.map((t: any) => [t._id.toString(), t]));
      
      // Filter out any teamStats where team doesn't exist (to avoid null for non-nullable field)
      return parent.teamStats
        .map((stat: any) => {
          try {
            const teamId = stat.teamId;
            if (!teamId) return null;
            
            // Try to match by ObjectId string
            const teamIdStr = teamId instanceof ObjectId ? teamId.toString() : teamId.toString();
            let team = teamMap.get(teamIdStr);
            
            // If not found, try to find by systemMappings (Eitje external ID)
            if (!team && typeof teamId === 'string' && !ObjectId.isValid(teamId)) {
              // This might be an Eitje team ID, try to find via systemMappings
              // For now, skip it - we'd need to query by systemMappings which is more complex
              return null;
            }
            
            if (!team) return null; // Skip if team not found
            return {
              team,
        hours: stat.hours,
        cost: stat.cost,
            };
          } catch {
            return null;
          }
        })
        .filter((stat: any) => stat !== null);
    },
  },

  DashboardData: {
    id: (parent: any) => toId(parent._id),
    location: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('locations').findOne({ _id: parent.locationId });
    },
  },

  PnLData: {
    id: (parent: any) => toId(parent._id),
    location: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('locations').findOne({ _id: parent.locationId });
    },
  },

  ApiCredential: {
    id: (parent: any) => toId(parent._id),
    locationId: (parent: any) => parent.locationId ? toId(parent.locationId) : null,
  },
};

// ============================================
// SALES AGGREGATION RESOLVERS
// ============================================

// Helper function to extract sales records (reused from dailySales)
// 
// @deprecated This function is no longer used. dailySales resolver now requires sales_line_items_aggregated collection.
// ⚠️ DEPRECATED: This function uses bork_raw_data and is no longer called.
// The dailySales resolver now requires sales_line_items_aggregated collection to exist.
// This function is kept for reference/diagnostics only.
// 
// Original purpose: Extract sales records from bork_raw_data with transaction-level detail
// (ticket keys, order keys, waiter names, table numbers, payment methods)
// Note: sales_line_items_aggregated should have all this detail pre-computed
async function extractSalesRecords(
  startDate: string,
  endDate: string,
  filters: any,
  locationMap: Map<string, any>
): Promise<any[]> {
  const db = await getDatabase();
  const start = new Date(startDate + 'T00:00:00.000Z');
  let end: Date;
  if (startDate === endDate) {
    const endDateObj = new Date(endDate + 'T00:00:00.000Z');
    endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
    endDateObj.setUTCHours(1, 0, 0, 0);
    end = endDateObj;
  } else {
    const endDateObj = new Date(endDate + 'T00:00:00.000Z');
    endDateObj.setUTCHours(23, 59, 59, 999);
    end = endDateObj;
  }

  const query: any = {
    date: {
      $gte: start,
      $lte: end,
    },
  };

  if (filters.locationId && filters.locationId !== 'all') {
    try {
      query.locationId = new ObjectId(filters.locationId);
    } catch (e) {
      console.warn(`Invalid locationId: ${filters.locationId}`);
    }
  }

  const rawDataRecords = await db.collection('bork_raw_data')
    .find(query)
    .sort({ date: -1 })
    .limit(5000)
    .toArray();

  const allSalesRecords: any[] = [];
  let salesRecordCounter = 0;

  for (const record of rawDataRecords) {
    const recordId = record._id?.toString() || 'unknown';
    const rawApiResponse = record.rawApiResponse;
    const locationIdStr = record.locationId?.toString() || '';
    const locationInfo = locationMap.get(locationIdStr);
    
    if (!rawApiResponse) continue;

    let tickets: any[] = [];
    if (Array.isArray(rawApiResponse)) {
      tickets = rawApiResponse;
    } else if (rawApiResponse && typeof rawApiResponse === 'object') {
      const response = rawApiResponse as any;
      if (response.Tickets && Array.isArray(response.Tickets)) {
        tickets = response.Tickets;
      } else if (response.tickets && Array.isArray(response.tickets)) {
        tickets = response.tickets;
      } else {
        tickets = [rawApiResponse];
      }
    }

    const recordDate = record.date instanceof Date 
      ? record.date 
      : typeof record.date === 'string' 
        ? new Date(record.date) 
        : new Date();

    for (const ticket of tickets) {
      if (!ticket || typeof ticket !== 'object') continue;

      const ticketKey = ticket.Key || ticket.key || null;
      const ticketNumber = ticket.TicketNumber || ticket.TicketNr || ticket.ticketNumber || ticket.ticketNr || '';
      const ticketTable = ticket.TableNumber || ticket.tableNumber || ticket.TableName || ticket.tableName || null;
      const ticketWaiter = ticket.WaiterName || ticket.waiterName || ticket.UserName || ticket.userName || null;
      const ticketPayment = ticket.PaymentMethod || ticket.paymentMethod || null;
      const ticketTime = ticket.Time || ticket.time || null;

      const orders = ticket.Orders || ticket.orders || [];

      if (Array.isArray(orders) && orders.length > 0) {
        for (const order of orders) {
          if (!order || typeof order !== 'object') continue;
          const orderLines = order.Lines || order.lines || [];
          if (!Array.isArray(orderLines) || orderLines.length === 0) continue;

          const orderKey = order.Key || order.key || null;
          const rawTableNumber = order.TableNr || order.tableNr || order.TableNumber || order.tableNumber || ticketTable;
          // Ensure table_number is a valid integer or null
          const tableNumber = rawTableNumber != null ? (typeof rawTableNumber === 'number' ? rawTableNumber : parseInt(String(rawTableNumber), 10)) : null;
          // If parsing failed (NaN), set to null
          const tableNumberFinal = (tableNumber != null && !isNaN(tableNumber)) ? tableNumber : null;
          const waiterName = order.UserName || order.userName || order.WaiterName || order.waiterName || ticketWaiter;
          const orderTime = order.Time || order.time || ticketTime;

          orderLines.forEach((line: any, lineIndex: number) => {
            if (!line || typeof line !== 'object') return;

            if (filters.category && filters.category !== 'all') {
              const lineCategory = line.GroupName || line.groupName || line.Category || line.category;
              if (!lineCategory || lineCategory !== filters.category) return;
            }

            const lineProductName = line.ProductName || line.productName || line.Name || line.name || null;
            
            if (filters.productName) {
              if (!lineProductName || !lineProductName.toLowerCase().includes(filters.productName.toLowerCase())) return;
            }

            // Filter by waiter name (case-insensitive)
            if (filters.waiterName) {
              const waiterNameLower = (waiterName || '').toLowerCase();
              const filterWaiterNameLower = filters.waiterName.toLowerCase();
              if (!waiterNameLower || !waiterNameLower.includes(filterWaiterNameLower)) return;
            }

            salesRecordCounter++;
            const lineKey = line.Key || line.key || line.LineKey || line.lineKey || null;
            const uniqueId = `${recordId}_${ticketKey || 'ticket'}_${orderKey || 'order'}_${lineKey || lineIndex}_${salesRecordCounter}`;
            
            allSalesRecords.push({
              id: uniqueId,
              date: recordDate.toISOString().split('T')[0],
              location_id: locationIdStr,
              location_name: locationInfo?.name || null,
              ticket_key: ticketKey,
              ticket_number: ticketNumber,
              order_key: orderKey,
              order_line_key: lineKey,
              product_name: lineProductName,
              product_sku: line.ProductSku || line.productSku || line.Sku || line.sku || null,
              product_number: line.ProductNr || line.productNr || line.ProductNumber || line.productNumber || null,
              category: line.GroupName || line.groupName || line.Category || line.category || null,
              group_name: line.GroupName || line.groupName || line.Category || line.category || null,
              quantity: line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 1,
              unit_price: line.Price ?? line.price ?? line.UnitPrice ?? line.unitPrice ?? null,
              total_ex_vat: line.TotalEx ?? line.totalEx ?? line.TotalExVat ?? line.totalExVat ?? null,
              total_inc_vat: line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? null,
              vat_rate: line.VatPerc ?? line.vatPerc ?? line.VatRate ?? line.vatRate ?? null,
              vat_amount: line.VatAmount ?? line.vatAmount ?? null,
              cost_price: line.CostPrice ?? line.costPrice ?? null,
              payment_method: ticketPayment,
              table_number: tableNumberFinal,
              waiter_name: waiterName,
              time: orderTime,
              created_at: record.createdAt ? (record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()) : null,
            });
          });
        }
      }
    }
  }

  // Filter by date range and waiter name
  const filteredRecords = allSalesRecords.filter(record => {
    const recordDateStr = record.date;
    if (recordDateStr < startDate || recordDateStr > endDate) return false;
    
    // Filter by waiter name if specified (case-insensitive)
    if (filters.waiterName) {
      const recordWaiterName = (record.waiter_name || '').toLowerCase();
      const filterWaiterName = filters.waiterName.toLowerCase();
      if (!recordWaiterName || !recordWaiterName.includes(filterWaiterName)) return false;
    }
    
    return true;
  });

  return filteredRecords;
}

