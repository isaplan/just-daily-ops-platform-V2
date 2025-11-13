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
      const teamIds = parent.teamStats.map((stat: any) => stat.teamId);
      const teams = await db.collection('unified_teams').find({
        _id: { $in: teamIds },
      }).toArray();
      const teamMap = new Map(teams.map((t: any) => [t._id.toString(), t]));
      return parent.teamStats.map((stat: any) => ({
        team: teamMap.get(stat.teamId.toString()),
        hours: stat.hours,
        cost: stat.cost,
      }));
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
};

