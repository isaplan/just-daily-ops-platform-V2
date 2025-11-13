/**
 * Test MongoDB Connection
 * 
 * Tests the MongoDB Atlas connection
 * Usage: npx tsx scripts/v2-migration/test-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabase } from '@/lib/mongodb/v2-connection';

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    
    const db = await getDatabase();
    const adminDb = db.admin();
    
    // Test connection by listing databases
    const result = await adminDb.listDatabases();
    
    console.log('✅ Connection successful!');
    console.log(`📊 Connected to database: ${db.databaseName}`);
    console.log(`📦 Available databases: ${result.databases.map((d: any) => d.name).join(', ')}`);
    
    // Test basic operation
    const collections = await db.listCollections().toArray();
    console.log(`📚 Collections in current database: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('   Collections:', collections.map((c: any) => c.name).join(', '));
    } else {
      console.log('   (No collections yet - database is empty)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

testConnection();

