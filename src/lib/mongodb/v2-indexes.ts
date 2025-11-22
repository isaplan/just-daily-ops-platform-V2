/**
 * MongoDB V2 Index Definitions
 * 
 * Creates all necessary indexes for optimal query performance
 */

import { Db, IndexSpecification } from 'mongodb';
import { getDatabase } from './v2-connection';

/**
 * Create all indexes for the database
 */
export async function createAllIndexes(): Promise<void> {
  const db = await getDatabase();

  // Locations indexes
  await db.collection('locations').createIndexes([
    { key: { name: 1 } },
    { key: { code: 1 } },
    { key: { isActive: 1 } },
    { key: { name: 1, code: 1 } }, // Compound index
  ]);

  // Unified Users indexes
  await db.collection('unified_users').createIndexes([
    { key: { email: 1 } },
    { key: { locationIds: 1 } },
    { key: { teamIds: 1 } },
    { key: { isActive: 1 } },
    { key: { 'systemMappings.system': 1, 'systemMappings.externalId': 1 } },
    { key: { locationIds: 1, isActive: 1 } }, // Compound for common queries
  ]);

  // Unified Teams indexes
  await db.collection('unified_teams').createIndexes([
    { key: { name: 1 } },
    { key: { locationIds: 1 } },
    { key: { memberIds: 1 } },
    { key: { isActive: 1 } },
    { key: { 'systemMappings.system': 1, 'systemMappings.externalId': 1 } },
  ]);

  // API Credentials indexes
  await db.collection('api_credentials').createIndexes([
    { key: { locationId: 1 } },
    { key: { provider: 1 } },
    { key: { isActive: 1 } },
    { key: { locationId: 1, provider: 1, isActive: 1 } }, // Compound
  ]);

  // Bork Raw Data indexes
  await db.collection('bork_raw_data').createIndexes([
    { key: { locationId: 1, date: -1 } }, // Most important - compound for queries
    { key: { date: -1 } },
    { key: { importId: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Bork Aggregated indexes
  await db.collection('bork_aggregated').createIndexes([
    { key: { locationId: 1, date: -1 } }, // Critical for dashboard queries
    { key: { date: -1 } },
  ]);

  // Eitje Raw Data indexes
  await db.collection('eitje_raw_data').createIndexes([
    { key: { locationId: 1, date: -1, endpoint: 1 } }, // Compound for queries
    { key: { date: -1 } },
    { key: { endpoint: 1 } },
    { key: { environmentId: 1 } },
  ]);

  // Eitje Aggregated indexes
  await db.collection('eitje_aggregated').createIndexes([
    { key: { locationId: 1, date: -1 } }, // Critical for dashboard queries
    { key: { date: -1 } },
  ]);

  // PowerBI Raw Data indexes
  await db.collection('powerbi_raw_data').createIndexes([
    { key: { locationId: 1, year: -1, month: -1 } }, // Compound for P&L queries
    { key: { importId: 1 } },
  ]);

  // PowerBI Aggregated indexes
  await db.collection('powerbi_aggregated').createIndexes([
    { key: { locationId: 1, year: -1, month: -1 } }, // Critical for P&L queries
  ]);

  // Daily Dashboard indexes (MOST IMPORTANT for dashboard performance)
  await db.collection('daily_dashboard').createIndexes([
    { key: { locationId: 1, date: -1 } }, // Primary query pattern
    { key: { date: -1 } },
  ]);

  // Data Imports indexes
  await db.collection('data_imports').createIndexes([
    { key: { importType: 1 } },
    { key: { status: 1 } },
    { key: { locationId: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Products catalog indexes
  await db.collection('products').createIndexes([
    { key: { productName: 1 } }, // Unique product names
    { key: { category: 1 } },
    { key: { workloadLevel: 1 } },
    { key: { mepLevel: 1 } },
    { key: { isActive: 1 } },
    { key: { productName: 1, category: 1 } }, // Compound for lookups
  ]);

  // Products aggregated indexes (fast product lookups)
  await db.collection('products_aggregated').createIndexes([
    { key: { productName: 1, locationId: 1 } }, // Compound for product+location lookups
    { key: { productName: 1 } }, // Product name lookups
    { key: { locationId: 1 } }, // Location-specific products
    { key: { category: 1 } }, // Category filtering
    { key: { mainCategory: 1 } }, // Main category (Bar/Keuken/Other)
    { key: { lastSeen: -1 } }, // Sort by most recent
    { key: { averagePrice: 1 } }, // Price sorting
    { key: { totalQuantitySold: -1 } }, // Popularity sorting
    // ✅ PERFORMANCE: Compound indexes for common query patterns
    { key: { locationId: 1, lastSeen: -1, productName: 1 } }, // Location + sort + product
    { key: { category: 1, lastSeen: -1 } }, // Category + sort
    { key: { isActive: 1, lastSeen: -1 } }, // Active filter + sort
    { key: { productName: 1, locationId: 1, lastSeen: -1 } }, // Product lookup + sort
  ]);

  // Menus indexes
  await db.collection('menus').createIndexes([
    { key: { title: 1 } },
    { key: { startDate: -1 } }, // Sort by start date
    { key: { endDate: -1 } },
    { key: { isActive: 1 } },
    { key: { startDate: 1, endDate: 1 } }, // Compound for date range queries
  ]);

  // Daily Dashboard - Kitchen indexes
  await db.collection('daily_dashboard_kitchen').createIndexes([
    { key: { locationId: 1, date: -1, timeRange: 1 } }, // Compound index for queries
    { key: { date: -1 } },
    { key: { locationId: 1, date: -1 } }, // Alternative compound
  ]);

  console.log('✅ All MongoDB indexes created successfully');
}

/**
 * Initialize database with indexes (call this once on setup)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await createAllIndexes();
    console.log('✅ Database initialized with all indexes');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

