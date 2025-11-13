/**
 * Initialize MongoDB V2 Database
 * 
 * Run this script once to set up the database with indexes
 * Usage: npx tsx scripts/v2-migration/initialize-db.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeDatabase } from '@/lib/mongodb/v2-indexes';

async function main() {
  try {
    console.log('🚀 Initializing MongoDB V2 database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

main();

