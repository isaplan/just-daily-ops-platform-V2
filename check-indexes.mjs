import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeDatabase } from './src/lib/mongodb/v2-indexes.ts';

try {
  await initializeDatabase();
  console.log('\n✅ MongoDB indexes verification complete');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
