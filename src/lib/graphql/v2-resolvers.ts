/**
 * GraphQL Resolvers - V2
 * 
 * Resolvers for GraphQL API
 * Handles relationships and data fetching from MongoDB
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

// Helper to convert ObjectId to string (with null safety)
const toId = (id: ObjectId | string | undefined | null): string => {
  if (!id) {
    console.warn('[GraphQL] toId called with null/undefined ID - returning empty string');
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

export const resolvers = {
  Query: {
    // Diagnostics
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
    teams: async (_: any, { locationId }: { locationId?: string }) => {
      const db = await getDatabase();
      
      // Query eitje_raw_data for teams (master data from Eitje API)
      const query: any = { endpoint: 'teams' };
      
      // If location filter provided, match by environment_id
      if (locationId && locationId !== 'all') {
        try {
          const location = await db.collection('locations').findOne({ _id: toObjectId(locationId) });
          if (location?.systemMappings) {
            const eitjeMapping = location.systemMappings.find((m: any) => m.system === 'eitje');
            if (eitjeMapping?.externalId) {
              const environmentId = parseInt(eitjeMapping.externalId);
              query.$or = [
                { 'extracted.environment_id': environmentId },
                { 'rawApiResponse.environment_id': environmentId }
              ];
            }
          }
        } catch (e) {
          console.warn('Error filtering teams by location:', e);
        }
      }
      
      const eitjeTeams = await db.collection('eitje_raw_data').find(query).toArray();
      
      // Transform to match GraphQL schema
      return eitjeTeams.map((team) => {
        const teamData = team.extracted || team.rawApiResponse || {};
        const eitjeTeamId = teamData.id || teamData.team_id;
        
        return {
          _id: team._id,
          id: String(eitjeTeamId), // Use Eitje's numeric team ID as string
          name: teamData.name || teamData.team_name || 'Unknown Team',
          description: teamData.description || null,
          teamType: teamData.team_type || null,
          isActive: true, // Eitje teams are active if they exist in the API
          locationIds: [], // Will be populated if needed
          memberIds: [], // Will be populated if needed
          systemMappings: [{
            system: 'eitje',
            externalId: String(eitjeTeamId),
            rawData: teamData
          }],
          createdAt: team.createdAt || new Date(),
          updatedAt: team.updatedAt || new Date(),
        };
      });
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
      
      return {
        success: true,
        records,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        error: null,
      };
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
          console.log('[Kitchen Dashboard] No aggregated data found, triggering aggregation...');
          const { aggregateKeukenAnalysesData } = await import('@/lib/services/daily-ops/keuken-analyses-aggregation.service');
          
          // Aggregate for all locations if "all", otherwise specific location
          if (isAllLocations) {
            // Get all active locations and aggregate for each
            const locations = await db.collection('locations')
              .find({ isActive: true })
              .toArray();
            
            for (const location of locations) {
              await aggregateKeukenAnalysesData(start, end, location._id).catch((err) => {
                console.warn(`[Kitchen Dashboard] Failed to aggregate for location ${location._id}:`, err);
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
        console.error('[Kitchen Dashboard Resolver] Error:', error);
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
        const db = await getDatabase();
        
        // Build query
        const query: any = {};
        const andConditions: any[] = [];
        
        // Ensure filters is defined
        const safeFilters = filters || {};
        
        // Date filtering logic (for finding workers active during specified period)
        if (year) {
          let startDate: Date;
          let endDate: Date;
          
          if (day && month) {
            // Specific day
            startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          } else if (month) {
            // Specific month
            startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const lastDay = new Date(year, month, 0).getDate();
            endDate = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
          } else {
            // Whole year
            startDate = new Date(year, 0, 1, 0, 0, 0, 0);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
          }
          
          // Find workers whose contract overlaps with the date range
          // Contract overlaps if:
          // 1. It has started (effective_from is null OR <= endDate)
          andConditions.push({
            $or: [
              { effective_from: null },
              { effective_from: { $lte: endDate } }
            ]
          });
          
          // 2. It hasn't ended (effective_to is null OR >= startDate)
          // BUT: Don't add this if activeOnly filter is set (it will be added below)
          if (safeFilters.activeOnly === null || safeFilters.activeOnly === undefined) {
            andConditions.push({
              $or: [
                { effective_to: null },
                { effective_to: { $gte: startDate } }
              ]
            });
          }
        }
        
        // Location filter
        if (safeFilters.locationId && safeFilters.locationId !== 'all') {
          query.location_id = safeFilters.locationId;
        }
        
        // Contract type filter
        if (safeFilters.contractType && safeFilters.contractType !== 'all') {
          query.contract_type = safeFilters.contractType;
        }
        
        // Active only filter
        if (safeFilters.activeOnly === true) {
          andConditions.push({ effective_to: null }); // Only active contracts
        } else if (safeFilters.activeOnly === false) {
          andConditions.push({ effective_to: { $ne: null } }); // Only inactive contracts
        }
        
        // Combine all $and conditions
        if (andConditions.length > 0) {
          query.$and = andConditions;
        }
        
        // Debug logging
        console.log('[GraphQL Resolver] workerProfiles query:', JSON.stringify(query, null, 2));
        
        // Pagination
        const skip = (page - 1) * limit;
        const total = await db.collection('worker_profiles').countDocuments(query);
        
        console.log('[GraphQL Resolver] Found', total, 'worker profiles');
        const totalPages = Math.ceil(total / limit);
        
        // Fetch records
        const records = await db.collection('worker_profiles')
          .find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
        // Enrich with user names from eitje_raw_data
        const userIds = [...new Set(records.map(r => r.eitje_user_id).filter(Boolean))];
        const users = await db.collection('eitje_raw_data')
          .find({
            endpoint: 'users',
            'extracted.id': { $in: userIds }
          })
          .toArray();
        
        const userMap = new Map();
        users.forEach(user => {
          const userId = user.extracted?.id;
          const firstName = user.extracted?.first_name || user.rawApiResponse?.first_name || '';
          const lastName = user.extracted?.last_name || user.rawApiResponse?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (userId && fullName) {
            userMap.set(userId, fullName);
          }
        });
        
        // Teams are now stored directly in worker_profiles (pre-aggregated)
        // No need to query shifts on every request
        console.log(`[GraphQL] Reading teams from worker_profiles (pre-aggregated data)`);
        
        // Team filter - filter records by team membership (from pre-aggregated data)
        let filteredRecords = records;
        if (safeFilters.teamId && safeFilters.teamId !== 'all') {
          const filterTeamId = String(safeFilters.teamId);
          console.log(`[GraphQL] Filtering by team: ${filterTeamId}`);
          
          filteredRecords = records.filter(record => {
            const teams = record.teams || [];
            // Check if worker is in the specified team (by ID or name)
            return teams.some((t: any) => 
              String(t.team_id) === filterTeamId || 
              t.team_name === safeFilters.teamId ||
              t.team_name === filterTeamId
            );
          });
          
          console.log(`[GraphQL] Filtered to ${filteredRecords.length} workers in team ${filterTeamId}`);
        }
        
        // Enrich with location names from locations collection
        const locationIds = [...new Set(records.map(r => r.location_id).filter(Boolean))];
        const locationObjIds = locationIds.map(id => {
          try {
            return toObjectId(id);
          } catch {
            return null;
          }
        }).filter(Boolean);
        
        const locations = await db.collection('locations').find({
          _id: { $in: locationObjIds }
        }).toArray();
        
        const locationMap = new Map();
        locations.forEach(location => {
          if (location._id && location.name) {
            locationMap.set(location._id.toString(), location.name);
          }
        });
        
        // Transform records (teams are already in the record from pre-aggregation)
        const transformedRecords = filteredRecords.map((record: any) => {
          const teams = record.teams || [];
          const primaryTeam = teams.length > 0 ? teams[0].team_name : null;
          
          return {
            id: record._id.toString(),
            eitjeUserId: record.eitje_user_id,
            userName: userMap.get(record.eitje_user_id) || null,
            teamName: primaryTeam,
            teams: teams.length > 0 ? teams : null,
            locationId: record.location_id || null,
            locationName: record.location_id ? locationMap.get(record.location_id) || null : null,
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
        });
        
        // Recalculate total for filtered records
        const filteredTotal = filteredRecords.length;
        const filteredTotalPages = Math.ceil(filteredTotal / limit);
        
        return {
          success: true,
          records: transformedRecords,
          total: filteredTotal,
          page,
          totalPages: filteredTotalPages,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] workerProfiles error:', error);
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
        const db = await getDatabase();
        const record = await db.collection('worker_profiles').findOne({ _id: toObjectId(id) });
        
        if (!record) return null;
        
        // Get user name
        let userName = null;
        if (record.eitje_user_id) {
          const user = await db.collection('eitje_raw_data').findOne({
            endpoint: 'users',
            'extracted.id': record.eitje_user_id
          });
          if (user) {
            const firstName = user.extracted?.first_name || user.rawApiResponse?.first_name || '';
            const lastName = user.extracted?.last_name || user.rawApiResponse?.last_name || '';
            userName = `${firstName} ${lastName}`.trim() || null;
          }
        }
        
        // Get team name from processed hours
        let teamName = null;
        if (record.eitje_user_id) {
          const shift = await db.collection('eitje_time_registration_shifts_processed_v2')
            .findOne({
              user_id: record.eitje_user_id,
              team_name: { $exists: true, $ne: null }
            }, {
              sort: { date: -1 }
            });
          if (shift) {
            teamName = shift.team_name || null;
          }
        }
        
        // Get location name
        let locationName = null;
        if (record.location_id) {
          try {
            const location = await db.collection('locations').findOne({ 
              _id: toObjectId(record.location_id) 
            });
            if (location) {
              locationName = location.name || null;
            }
          } catch (error) {
            console.warn('[GraphQL] Error fetching location name:', error);
          }
        }
        
        return {
          id: record._id.toString(),
          eitjeUserId: record.eitje_user_id,
          userName,
          teamName,
          locationId: record.location_id || null,
          locationName,
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
      } catch (error: any) {
        console.error('[GraphQL Resolver] workerProfile error:', error);
        throw error;
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
        console.error('[GraphQL Resolver] apiCredentials error:', error);
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
        console.error('[GraphQL Resolver] apiCredential error:', error);
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
        console.error('[GraphQL Resolver] products error:', error);
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
        console.error('[GraphQL Resolver] product error:', error);
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
        console.error('[GraphQL Resolver] productByName error:', error);
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
        console.error('[GraphQL Resolver] productsAggregated error:', error);
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
        console.error('[GraphQL Resolver] productAggregated error:', error);
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
        const db = await getDatabase();
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const query: any = {
          endpoint: 'time_registration_shifts',
          date: {
            $gte: start,
            $lte: end,
          },
        };

        const andConditions: any[] = [];

        // Location filter
        if (filters.locationId && filters.locationId !== 'all') {
          try {
            const locationObjId = new ObjectId(filters.locationId);
            const location = await db.collection('locations').findOne({ _id: locationObjId });
            
            if (location && location.systemMappings && Array.isArray(location.systemMappings)) {
              const eitjeMapping = location.systemMappings.find((m: any) => m.system === 'eitje');
              if (eitjeMapping && eitjeMapping.externalId) {
                andConditions.push({ environmentId: parseInt(eitjeMapping.externalId) });
              } else {
                andConditions.push({
                  $or: [
                    { locationId: locationObjId },
                    { locationId: locationObjId.toString() }
                  ]
                });
              }
            } else {
              andConditions.push({ locationId: locationObjId });
            }
          } catch (e) {
            console.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }

        // Environment filter
        if (filters.environmentId) {
          andConditions.push({ environmentId: parseInt(String(filters.environmentId)) });
        }

        // Team filter
        if (filters.teamName && filters.teamName !== 'all') {
          andConditions.push({
            $or: [
              { 'extracted.team_name': filters.teamName },
              { 'extracted.teamName': filters.teamName },
              { 'rawApiResponse.team_name': filters.teamName },
              { 'rawApiResponse.teamName': filters.teamName }
            ]
          });
        }

        // Type name filter
        if (filters.typeName !== undefined && filters.typeName !== null) {
          console.log('[GraphQL Resolver] typeName filter:', filters.typeName);
          if (filters.typeName === 'WORKED' || filters.typeName === '') {
            // "WORKED" marker or empty string means "Gewerkte Uren" (worked hours)
            // Match records where NEITHER extracted.type_name NOR rawApiResponse.type_name contains a leave type
            // Use $and to ensure both fields are checked
            andConditions.push({
              $and: [
                // extracted.type_name must be null, empty, gewerkte_uren, or not exist
                {
              $or: [
                { 'extracted.type_name': null },
                { 'extracted.type_name': { $exists: false } },
                { 'extracted.type_name': '' },
                { 'extracted.type_name': 'gewerkte_uren' },
                    { 'extracted.type_name': 'Gewerkte Uren' }
                  ]
                },
                // rawApiResponse.type_name must be null, empty, gewerkte_uren, or not exist
                {
                  $or: [
                { 'rawApiResponse.type_name': null },
                { 'rawApiResponse.type_name': { $exists: false } },
                { 'rawApiResponse.type_name': '' },
                { 'rawApiResponse.type_name': 'gewerkte_uren' },
                { 'rawApiResponse.type_name': 'Gewerkte Uren' }
                  ]
                },
                // Explicitly exclude leave types from extracted.type_name
                {
                  $or: [
                    { 'extracted.type_name': { $nin: ['verlof', 'ziek', 'bijzonder', 'Verlof', 'Ziek', 'Bijzonder Verlof'] } },
                    { 'extracted.type_name': { $exists: false } }
                  ]
                },
                // Explicitly exclude leave types from rawApiResponse.type_name
                {
                  $or: [
                    { 'rawApiResponse.type_name': { $nin: ['verlof', 'ziek', 'bijzonder', 'Verlof', 'Ziek', 'Bijzonder Verlof'] } },
                    { 'rawApiResponse.type_name': { $exists: false } }
                  ]
                }
              ]
            });
          } else {
            // Filter for specific leave type (verlof, ziek, bijzonder)
            const typeValue = String(filters.typeName).toLowerCase();
            andConditions.push({
              $or: [
                { 'extracted.type_name': typeValue },
                { 'extracted.type_name': typeValue.replace(' ', '_') },
                { 'rawApiResponse.type_name': typeValue },
                { 'rawApiResponse.type_name': typeValue.replace(' ', '_') }
              ]
            });
          }
        } else {
          console.log('[GraphQL Resolver] No typeName filter applied');
        }

        // User filter
        if (filters.userId) {
          andConditions.push({
            $or: [
              { 'extracted.userId': parseInt(String(filters.userId)) },
              { 'extracted.user_id': parseInt(String(filters.userId)) },
              { 'rawApiResponse.user_id': parseInt(String(filters.userId)) },
              { 'rawApiResponse.userId': parseInt(String(filters.userId)) }
            ]
          });
        }

        if (andConditions.length > 0) {
          query.$and = andConditions;
        }

        const total = await db.collection('eitje_raw_data').countDocuments(query);

        const records = await db.collection('eitje_raw_data')
          .find(query)
          .sort({ date: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Get unique user IDs for hourly wage lookup
        const userIds = new Set<number>();
        records.forEach((record) => {
          const extracted = record.extracted || {};
          const raw = record.rawApiResponse || {};
          const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
          if (userId) {
            userIds.add(parseInt(String(userId)));
          }
        });

        // Fetch hourly wages
        const hourlyWageMap = new Map<number, number | null>();
        if (userIds.size > 0) {
          try {
            const workerProfiles = await db.collection('worker_profiles')
              .find({
                eitje_user_id: { $in: Array.from(userIds) },
                $or: [
                  { effective_to: null },
                  { effective_to: { $gte: new Date() } }
                ]
              })
              .sort({ effective_from: -1 })
              .toArray();

            workerProfiles.forEach((profile: any) => {
              const userId = profile.eitje_user_id;
              if (userId && !hourlyWageMap.has(userId) && profile.hourly_wage !== null && profile.hourly_wage !== undefined) {
                hourlyWageMap.set(userId, Number(profile.hourly_wage));
              }
            });
          } catch (error) {
            console.warn('[GraphQL Resolver] Error fetching hourly wages:', error);
          }
        }

        // Transform records
        const processedRecords = records.map((record, index) => {
          const extracted = record.extracted || {};
          const raw = record.rawApiResponse || {};
          const userId = extracted.userId || extracted.user_id || raw.user_id || raw.userId;
          const hourlyWage = userId ? hourlyWageMap.get(parseInt(String(userId))) || null : null;
          
          // Calculate worked hours from start/end times minus breaks
          const startTime = extracted.start || extracted.start_time || raw.start || raw.start_time;
          const endTime = extracted.end || extracted.end_time || raw.end || raw.end_time;
          const breakMinutes = extracted.breakMinutes || extracted.break_minutes || raw.break_minutes || raw.breakMinutes || 0;
          
          let calculatedWorkedHours = null;
          if (startTime && endTime) {
            try {
              const start = new Date(startTime);
              const end = new Date(endTime);
              const diffMs = end.getTime() - start.getTime();
              const diffHours = diffMs / (1000 * 60 * 60); // Convert to hours
              calculatedWorkedHours = Math.max(0, diffHours - (breakMinutes / 60)); // Subtract break time
            } catch (e) {
              console.warn('[GraphQL processedHours] Error calculating worked hours:', e);
            }
          }
          
          // Use calculated hours, fallback to extracted hours
          const workedHours = calculatedWorkedHours !== null 
            ? calculatedWorkedHours 
            : (extracted.workedHours || extracted.worked_hours || extracted.hours_worked || raw.hours_worked || raw.worked_hours || null);
          
          // Calculate wage_cost = hourly_wage × worked_hours
          const wageCost = (hourlyWage !== null && hourlyWage !== undefined && workedHours !== null && workedHours !== undefined)
            ? hourlyWage * workedHours
            : (extracted.wageCost || extracted.wage_cost || raw.wage_cost || raw.wageCost || null);
          
          return {
            id: record._id?.toString() || `${index}`,
            eitje_id: extracted.eitje_id || raw.id || null,
            date: new Date(record.date).toISOString().split('T')[0],
            user_id: userId ? parseInt(String(userId)) : null,
            user_name: extracted.userName || extracted.user_name || raw.user_name || raw.userName || null,
            environment_id: extracted.environmentId || extracted.environment_id || raw.environment_id || raw.environmentId || null,
            environment_name: extracted.environmentName || extracted.environment_name || raw.environment_name || raw.environmentName || null,
            team_id: extracted.teamId || extracted.team_id || raw.team_id || raw.teamId || null,
            team_name: extracted.teamName || extracted.team_name || raw.team_name || raw.teamName || null,
            start: startTime || null,
            end: endTime || null,
            break_minutes: breakMinutes || null,
            worked_hours: workedHours,
            hourly_wage: hourlyWage,
            wage_cost: wageCost,
            type_name: extracted.type_name || extracted.typeName || raw.type_name || raw.typeName || null,
            shift_type: extracted.shift_type || extracted.shiftType || raw.shift_type || raw.shiftType || null,
            remarks: extracted.remarks || raw.remarks || null,
            approved: extracted.approved || raw.approved || null,
            planning_shift_id: extracted.planning_shift_id || extracted.planningShiftId || raw.planning_shift_id || raw.planningShiftId || null,
            exported_to_hr_integration: extracted.exported_to_hr_integration || extracted.exportedToHrIntegration || raw.exported_to_hr_integration || raw.exportedToHrIntegration || null,
            updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
            created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
          };
        });

        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: processedRecords,
          total,
          page,
          totalPages,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] processedHours error:', error);
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
            console.warn(`Invalid locationId: ${filters.locationId}`);
          }
        }

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
        console.error('[GraphQL Resolver] aggregatedHours error:', error);
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
    // ⚠️ EXCEPTION: Uses bork_raw_data because it needs transaction-level detail
    // (ticket keys, order keys, waiter names, table numbers, payment methods)
    // Aggregated collections (bork_aggregated, products_aggregated) only have daily/product totals
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

        const fetchLimit = Math.min(limit * 5, 100);
        const rawDataRecords = await db.collection('bork_raw_data')
          .find(query)
          .limit(fetchLimit)
          .toArray();

        // Get location names
        const locationIds = new Set<string>();
        rawDataRecords.forEach((record) => {
          if (record.locationId) {
            const locId = record.locationId instanceof ObjectId 
              ? record.locationId.toString() 
              : typeof record.locationId === 'string' 
                ? record.locationId 
                : String(record.locationId);
            if (locId) {
              locationIds.add(locId);
            }
          }
        });

        const locationMap = new Map<string, { name: string; code?: string }>();
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
              .toArray() as Array<{ _id?: ObjectId; name?: string; code?: string }>;
            
            locations.forEach((loc) => {
              if (loc._id) {
                locationMap.set(loc._id.toString(), {
                  name: loc.name || 'Unknown',
                  code: loc.code,
                });
              }
            });
          }
        }

        // Extract sales records
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
            let createdFromLines = false;

            if (Array.isArray(orders) && orders.length > 0) {
              for (const order of orders) {
                if (!order || typeof order !== 'object') continue;
                const orderLines = order.Lines || order.lines || [];
                if (!Array.isArray(orderLines) || orderLines.length === 0) continue;

                const orderKey = order.Key || order.key || null;
                const tableNumber = order.TableNr || order.tableNr || order.TableNumber || order.tableNumber || ticketTable;
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

                  createdFromLines = true;
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
                    table_number: tableNumber,
                    waiter_name: waiterName,
                    time: orderTime,
                    created_at: record.createdAt ? (record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()) : null,
                  });
                });
              }
            }
          }
        }

        // Filter by date range and sort
        // Note: record.date is in YYYY-MM-DD format (string), compare as strings
        const filteredRecords = allSalesRecords.filter(record => {
          const recordDateStr = record.date; // Should be YYYY-MM-DD format
          // Ensure we're comparing dates correctly (YYYY-MM-DD format)
          return recordDateStr >= startDate && recordDateStr <= endDate;
        });

        filteredRecords.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateB !== dateA) return dateB - dateA;
          const timeA = a.time ? a.time : '00:00:00';
          const timeB = b.time ? b.time : '00:00:00';
          return timeB.localeCompare(timeA);
        });

        // Paginate
        const total = filteredRecords.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
        const totalPages = Math.ceil(total / limit);

        return {
          success: true,
          records: paginatedRecords,
          total,
          page,
          totalPages,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] dailySales error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.message || 'Failed to fetch daily sales',
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
            console.warn(`Invalid locationId: ${filters.locationId}`);
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

        // Log in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`[categoriesProductsAggregate] Found ${products.length} products from products_aggregated`);
        }

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

          // Filter salesByDate, salesByWeek, salesByMonth by date range
          const startDateStr = startDate; // Already in YYYY-MM-DD format
          const endDateStr = endDate; // Already in YYYY-MM-DD format
          
          const filteredDaily = (product.salesByDate || []).filter((sale: any) => {
            const saleDate = sale.date; // Should be YYYY-MM-DD string
            return saleDate >= startDateStr && saleDate <= endDateStr;
          });

          const filteredWeekly = (product.salesByWeek || []); // Keep all for now, can filter by week range if needed

          const filteredMonthly = (product.salesByMonth || []).filter((sale: any) => {
            const monthDate = sale.month; // Should be YYYY-MM format
            const startMonth = startDateStr.substring(0, 7); // YYYY-MM
            const endMonth = endDateStr.substring(0, 7);
            return monthDate >= startMonth && monthDate <= endMonth;
          });

          // Calculate totals from filtered data
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
        
        // Log in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`[categoriesProductsAggregate] Processed ${productsProcessed} products: ${productsWithMainCategory} with mainCategory, ${productsWithoutMainCategory} without`);
        }

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

        // Log in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`[categoriesProductsAggregate] Returning ${categories.length} unified categories, ${mainCategories.length} main categories, ${categories.reduce((sum, cat) => sum + cat.products.length, 0)} total products`);
        }

        return {
          success: true,
          categories,
          mainCategories: mainCategories.length > 0 ? mainCategories : undefined,
          totals: grandTotals,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] categoriesProductsAggregate error:', error);
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
            console.warn(`Invalid locationId: ${filters.locationId}`);
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
        console.error('[GraphQL Resolver] categoriesMetadata error:', error);
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
            console.warn(`Invalid locationId: ${filters.locationId}`);
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
          // Filter salesByDate, salesByWeek, salesByMonth by date range
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

          // Calculate totals
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
        console.error('[GraphQL Resolver] categoryProducts error:', error);
        throw new Error(error.message || 'Failed to fetch category products');
      }
    },

    // Sales Aggregations
    waiterPerformance: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Debug logging
        console.log('[GraphQL Resolver] waiterPerformance:', {
          startDate,
          endDate,
          filters,
          totalRecords: records.length,
          recordsWithWaiter: records.filter(r => r.waiter_name).length,
          sampleRecords: records.slice(0, 3).map(r => ({
            waiter_name: r.waiter_name,
            date: r.date,
            location_name: r.location_name,
          })),
        });

        // Group by waiter_name
        const waiterMap = new Map<string, any>();

        for (const record of records) {
          if (!record.waiter_name) continue;
          
          const waiterKey = `${record.waiter_name}_${record.location_id || 'unknown'}`;
          const ticketKey = `${record.ticket_number}_${record.date}`;

          if (!waiterMap.has(waiterKey)) {
            waiterMap.set(waiterKey, {
              waiter_name: record.waiter_name,
              location_id: record.location_id,
              location_name: record.location_name,
              total_revenue: 0,
              total_items_sold: 0,
              ticketSet: new Set<string>(),
            });
          }

          const waiter = waiterMap.get(waiterKey)!;
          waiter.total_revenue += record.total_inc_vat || 0;
          waiter.total_items_sold += record.quantity || 0;
          waiter.ticketSet.add(ticketKey);
        }

        const result = Array.from(waiterMap.values()).map(waiter => ({
          waiter_name: waiter.waiter_name,
          location_id: waiter.location_id,
          location_name: waiter.location_name,
          total_revenue: Math.round(waiter.total_revenue * 100) / 100,
          total_transactions: waiter.ticketSet.size,
          total_items_sold: Math.round(waiter.total_items_sold * 100) / 100,
          average_ticket_value: waiter.ticketSet.size > 0 
            ? Math.round((waiter.total_revenue / waiter.ticketSet.size) * 100) / 100 
            : 0,
          average_items_per_transaction: waiter.ticketSet.size > 0
            ? Math.round((waiter.total_items_sold / waiter.ticketSet.size) * 100) / 100
            : 0,
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        return {
          success: true,
          records: result,
          total: result.length,
          error: null,
        };
      } catch (error: any) {
        console.error('[GraphQL Resolver] waiterPerformance error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch waiter performance',
        };
      }
    },

    revenueBreakdown: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by date and location
        const breakdownMap = new Map<string, any>();

        for (const record of records) {
          const key = `${record.date}_${record.location_id || 'unknown'}`;
          const ticketKey = `${record.ticket_number}_${record.date}`;

          if (!breakdownMap.has(key)) {
            breakdownMap.set(key, {
              date: record.date,
              location_id: record.location_id,
              location_name: record.location_name,
              total_revenue_ex_vat: 0,
              total_revenue_inc_vat: 0,
              total_vat: 0,
              ticketSet: new Set<string>(),
            });
          }

          const breakdown = breakdownMap.get(key)!;
          breakdown.total_revenue_ex_vat += record.total_ex_vat || 0;
          breakdown.total_revenue_inc_vat += record.total_inc_vat || 0;
          breakdown.total_vat += record.vat_amount || 0;
          breakdown.ticketSet.add(ticketKey);
        }

        const result = Array.from(breakdownMap.values()).map(breakdown => ({
          date: breakdown.date,
          location_id: breakdown.location_id,
          location_name: breakdown.location_name,
          total_revenue_ex_vat: Math.round(breakdown.total_revenue_ex_vat * 100) / 100,
          total_revenue_inc_vat: Math.round(breakdown.total_revenue_inc_vat * 100) / 100,
          total_vat: Math.round(breakdown.total_vat * 100) / 100,
          total_transactions: breakdown.ticketSet.size,
          average_transaction_value: breakdown.ticketSet.size > 0
            ? Math.round((breakdown.total_revenue_inc_vat / breakdown.ticketSet.size) * 100) / 100
            : 0,
          gross_profit: null,
        })).sort((a, b) => b.date.localeCompare(a.date));

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

    paymentMethodStats: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by payment_method
        const paymentMap = new Map<string, any>();
        let totalRevenue = 0;

        for (const record of records) {
          const paymentMethod = record.payment_method || 'Unknown';
          const key = `${paymentMethod}_${record.location_id || 'unknown'}`;
          const ticketKey = `${record.ticket_number}_${record.date}`;

          if (!paymentMap.has(key)) {
            paymentMap.set(key, {
              payment_method: paymentMethod,
              location_id: record.location_id,
              location_name: record.location_name,
              total_revenue: 0,
              ticketSet: new Set<string>(),
            });
          }

          const payment = paymentMap.get(key)!;
          payment.total_revenue += record.total_inc_vat || 0;
          payment.ticketSet.add(ticketKey);
          totalRevenue += record.total_inc_vat || 0;
        }

        const result = Array.from(paymentMap.values()).map(payment => ({
          payment_method: payment.payment_method,
          location_id: payment.location_id,
          location_name: payment.location_name,
          total_revenue: Math.round(payment.total_revenue * 100) / 100,
          total_transactions: payment.ticketSet.size,
          average_transaction_value: payment.ticketSet.size > 0
            ? Math.round((payment.total_revenue / payment.ticketSet.size) * 100) / 100
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
        console.error('[GraphQL Resolver] paymentMethodStats error:', error);
        return {
          success: false,
          records: [],
          total: 0,
          error: error.message || 'Failed to fetch payment method stats',
        };
      }
    },

    productPerformance: async (
      _: any,
      { startDate, endDate, page = 1, limit = 50, filters = {} }: { startDate: string; endDate: string; page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by product_name
        const productMap = new Map<string, any>();

        for (const record of records) {
          if (!record.product_name || record.product_name === 'Ticket Total') continue;
          
          const key = `${record.product_name}_${record.location_id || 'unknown'}`;
          const ticketKey = `${record.ticket_number}_${record.date}`;

          if (!productMap.has(key)) {
            productMap.set(key, {
              product_name: record.product_name,
              category: record.category,
              location_id: record.location_id,
              location_name: record.location_name,
              total_quantity_sold: 0,
              total_revenue: 0,
              total_profit: 0,
              total_unit_price: 0,
              unit_price_count: 0,
              ticketSet: new Set<string>(),
            });
          }

          const product = productMap.get(key)!;
          product.total_quantity_sold += record.quantity || 0;
          product.total_revenue += record.total_inc_vat || 0;
          if (record.cost_price) {
            product.total_profit += (record.total_inc_vat || 0) - ((record.cost_price || 0) * (record.quantity || 0));
          }
          if (record.unit_price) {
            product.total_unit_price += record.unit_price;
            product.unit_price_count++;
          }
          product.ticketSet.add(ticketKey);
        }

        const result = Array.from(productMap.values()).map(product => ({
          product_name: product.product_name,
          category: product.category,
          location_id: product.location_id,
          location_name: product.location_name,
          total_quantity_sold: Math.round(product.total_quantity_sold * 100) / 100,
          total_revenue: Math.round(product.total_revenue * 100) / 100,
          total_profit: product.total_profit !== 0 ? Math.round(product.total_profit * 100) / 100 : null,
          average_unit_price: product.unit_price_count > 0
            ? Math.round((product.total_unit_price / product.unit_price_count) * 100) / 100
            : 0,
          transaction_count: product.ticketSet.size,
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        const skip = (page - 1) * limit;
        const paginatedResult = result.slice(skip, skip + limit);
        const totalPages = Math.ceil(result.length / limit);

        return {
          success: true,
          records: paginatedResult,
          total: result.length,
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
    timeBasedAnalysis: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by hour of day
        const hourMap = new Map<string, any>();

        for (const record of records) {
          if (!record.time) continue;
          
          // Extract hour from time (format: HH:MM or HH:MM:SS)
          const timeMatch = record.time.match(/^(\d{1,2}):/);
          if (!timeMatch) continue;
          
          const hour = parseInt(timeMatch[1], 10);
          const key = `${hour}_${record.location_id || 'unknown'}`;

          if (!hourMap.has(key)) {
            hourMap.set(key, {
              hour,
              location_id: record.location_id,
              location_name: record.location_name,
              total_revenue: 0,
              total_items_sold: 0,
              ticketSet: new Set<string>(),
            });
          }

          const hourData = hourMap.get(key)!;
          hourData.total_revenue += record.total_inc_vat || 0;
          hourData.total_items_sold += record.quantity || 0;
          hourData.ticketSet.add(`${record.ticket_number}_${record.date}`);
        }

        const result = Array.from(hourMap.values()).map(hourData => ({
          hour: hourData.hour,
          location_id: hourData.location_id,
          location_name: hourData.location_name,
          total_revenue: Math.round(hourData.total_revenue * 100) / 100,
          total_transactions: hourData.ticketSet.size,
          total_items_sold: Math.round(hourData.total_items_sold * 100) / 100,
          average_transaction_value: hourData.ticketSet.size > 0
            ? Math.round((hourData.total_revenue / hourData.ticketSet.size) * 100) / 100
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

    tableAnalysis: async (
      _: any,
      { startDate, endDate, filters = {} }: { startDate: string; endDate: string; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by table_number
        const tableMap = new Map<string, any>();

        for (const record of records) {
          // Ensure table_number is a valid integer
          const tableNum = record.table_number != null 
            ? (typeof record.table_number === 'number' 
                ? record.table_number 
                : parseInt(String(record.table_number), 10))
            : null;
          
          // Skip if table_number is invalid (NaN or null)
          if (tableNum == null || isNaN(tableNum)) continue;
          
          const key = `${tableNum}_${record.location_id || 'unknown'}`;
          const ticketKey = `${record.ticket_number}_${record.date}`;

          if (!tableMap.has(key)) {
            tableMap.set(key, {
              table_number: tableNum,
              location_id: record.location_id,
              location_name: record.location_name,
              total_revenue: 0,
              total_items_sold: 0,
              ticketSet: new Set<string>(),
            });
          }

          const tableData = tableMap.get(key)!;
          tableData.total_revenue += record.total_inc_vat || 0;
          tableData.total_items_sold += record.quantity || 0;
          tableData.ticketSet.add(ticketKey);
        }

        const result = Array.from(tableMap.values()).map(tableData => ({
          table_number: tableData.table_number,
          location_id: tableData.location_id,
          location_name: tableData.location_name,
          total_revenue: Math.round(tableData.total_revenue * 100) / 100,
          total_transactions: tableData.ticketSet.size,
          total_items_sold: Math.round(tableData.total_items_sold * 100) / 100,
          average_transaction_value: tableData.ticketSet.size > 0
            ? Math.round((tableData.total_revenue / tableData.ticketSet.size) * 100) / 100
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

    transactionAnalysis: async (
      _: any,
      { startDate, endDate, page = 1, limit = 50, filters = {} }: { startDate: string; endDate: string; page?: number; limit?: number; filters?: any }
    ) => {
      try {
        const db = await getDatabase();
        const locations = await db.collection('locations').find({ isActive: true }).toArray();
        const locationMap = new Map(locations.map((loc: any) => [loc._id.toString(), loc]));

        const records = await extractSalesRecords(startDate, endDate, filters, locationMap);

        // Group by ticket_number
        const transactionMap = new Map<string, any>();

        for (const record of records) {
          if (!record.ticket_number) continue;
          
          const key = `${record.ticket_number}_${record.date}`;

          if (!transactionMap.has(key)) {
            transactionMap.set(key, {
              ticket_number: record.ticket_number,
              date: record.date,
              location_id: record.location_id,
              location_name: record.location_name,
              table_number: record.table_number,
              waiter_name: record.waiter_name,
              payment_method: record.payment_method,
              time: record.time,
              total_revenue: 0,
              total_items: 0,
              item_count: 0,
            });
          }

          const transaction = transactionMap.get(key)!;
          transaction.total_revenue += record.total_inc_vat || 0;
          transaction.total_items += record.quantity || 0;
          transaction.item_count++;
        }

        const result = Array.from(transactionMap.values()).map(transaction => ({
          ticket_number: transaction.ticket_number,
          date: transaction.date,
          location_id: transaction.location_id,
          location_name: transaction.location_name,
          table_number: transaction.table_number,
          waiter_name: transaction.waiter_name,
          payment_method: transaction.payment_method,
          time: transaction.time,
          total_revenue: Math.round(transaction.total_revenue * 100) / 100,
          total_items: Math.round(transaction.total_items * 100) / 100,
          item_count: transaction.item_count,
        })).sort((a, b) => {
          // Sort by date (newest first), then by time (newest first)
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return (b.time || '').localeCompare(a.time || '');
        });

        const skip = (page - 1) * limit;
        const paginatedResult = result.slice(skip, skip + limit);
        const totalPages = Math.ceil(result.length / limit);

        return {
          success: true,
          records: paginatedResult,
          total: result.length,
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
        
        const result = await db.collection('worker_profiles').insertOne(doc);
        const created = await db.collection('worker_profiles').findOne({ _id: result.insertedId });
        
        // Get user name
        let userName = null;
        if (created.eitje_user_id) {
          const user = await db.collection('eitje_raw_data').findOne({
            endpoint: 'users',
            'extracted.id': created.eitje_user_id
          });
          if (user) {
            const firstName = user.extracted?.first_name || user.rawApiResponse?.first_name || '';
            const lastName = user.extracted?.last_name || user.rawApiResponse?.last_name || '';
            userName = `${firstName} ${lastName}`.trim() || null;
          }
        }
        
        // Get location name
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
        
        return {
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
      } catch (error: any) {
        console.error('[GraphQL Resolver] createWorkerProfile error:', error);
        throw error;
      }
    },

    updateWorkerProfile: async (_: any, { id, input }: { id: string; input: any }) => {
      try {
        const db = await getDatabase();
        const update: any = {
          updated_at: new Date(),
        };
        
        if (input.eitjeUserId !== undefined) update.eitje_user_id = input.eitjeUserId;
        if (input.locationId !== undefined) update.location_id = input.locationId;
        if (input.contractType !== undefined) update.contract_type = input.contractType;
        if (input.contractHours !== undefined) update.contract_hours = input.contractHours;
        if (input.hourlyWage !== undefined) update.hourly_wage = input.hourlyWage;
        if (input.wageOverride !== undefined) update.wage_override = input.wageOverride;
        if (input.effectiveFrom !== undefined) update.effective_from = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
        if (input.effectiveTo !== undefined) update.effective_to = input.effectiveTo ? new Date(input.effectiveTo) : null;
        if (input.notes !== undefined) update.notes = input.notes;
        
        await db.collection('worker_profiles').updateOne(
          { _id: toObjectId(id) },
          { $set: update }
        );
        
        const updated = await db.collection('worker_profiles').findOne({ _id: toObjectId(id) });
        
        if (!updated) throw new Error('Worker profile not found after update');
        
        // Get user name
        let userName = null;
        if (updated.eitje_user_id) {
          const user = await db.collection('eitje_raw_data').findOne({
            endpoint: 'users',
            'extracted.id': updated.eitje_user_id
          });
          if (user) {
            const firstName = user.extracted?.first_name || user.rawApiResponse?.first_name || '';
            const lastName = user.extracted?.last_name || user.rawApiResponse?.last_name || '';
            userName = `${firstName} ${lastName}`.trim() || null;
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
        
        return {
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
      } catch (error: any) {
        console.error('[GraphQL Resolver] updateWorkerProfile error:', error);
        throw error;
      }
    },

    deleteWorkerProfile: async (_: any, { id }: { id: string }) => {
      try {
        const db = await getDatabase();
        const result = await db.collection('worker_profiles').deleteOne({ _id: toObjectId(id) });
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
  },

  // Field resolvers for relationships
  Location: {
    id: (parent: any) => {
      // ✅ Handle null/undefined _id gracefully
      if (!parent || !parent._id) {
        console.warn('[GraphQL] Location.id resolver called with null/undefined _id');
        return '';
      }
      return toId(parent._id);
    },
    users: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('unified_users').find({
        locationIds: parent._id,
        isActive: true,
      }).toArray();
    },
    teams: async (parent: any) => {
      const db = await getDatabase();
      return db.collection('unified_teams').find({
        locationIds: parent._id,
        isActive: true,
      }).toArray();
    },
    salesData: async (parent: any, { dateRange }: { dateRange?: { start: string; end: string } }) => {
      const db = await getDatabase();
      const query: any = { locationId: parent._id };
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
      const query: any = { locationId: parent._id };
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
      return db.collection('daily_dashboard').findOne({
        locationId: parent._id,
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
// ⚠️ EXCEPTION: Uses bork_raw_data because it needs transaction-level detail
// (ticket keys, order keys, waiter names, table numbers, payment methods)
// Aggregated collections don't have this level of detail
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

  // Filter by date range
  const filteredRecords = allSalesRecords.filter(record => {
    const recordDateStr = record.date;
    return recordDateStr >= startDate && recordDateStr <= endDate;
  });

  return filteredRecords;
}

