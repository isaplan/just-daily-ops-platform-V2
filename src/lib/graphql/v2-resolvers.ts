/**
 * GraphQL Resolvers - V2
 * 
 * Resolvers for GraphQL API
 * Handles relationships and data fetching from MongoDB
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

// Helper to convert ObjectId to string
const toId = (id: ObjectId | string | undefined): string => {
  if (!id) throw new Error('ID is required');
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
    // Locations
    locations: async () => {
      const db = await getDatabase();
      return db.collection('locations').find({ isActive: true }).toArray();
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
      const query: any = { isActive: true };
      if (locationId) {
        query.locationIds = toObjectId(locationId);
      }
      return db.collection('unified_teams').find(query).toArray();
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
      { locationId, startDate, endDate }: { locationId: string; startDate: string; endDate: string }
    ) => {
      const db = await getDatabase();
      return db.collection('bork_aggregated').find({
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }).sort({ date: -1 }).toArray();
    },

    // Labor Aggregated
    laborAggregated: async (
      _: any,
      { locationId, startDate, endDate }: { locationId: string; startDate: string; endDate: string }
    ) => {
      const db = await getDatabase();
      return db.collection('eitje_aggregated').find({
        locationId: toObjectId(locationId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }).sort({ date: -1 }).toArray();
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
  },

  Mutation: {
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
  },

  // Field resolvers for relationships
  Location: {
    id: (parent: any) => toId(parent._id),
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

