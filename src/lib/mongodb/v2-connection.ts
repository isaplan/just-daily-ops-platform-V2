/**
 * MongoDB V2 Connection Utility
 * 
 * Handles MongoDB Atlas connection with proper serverless/Next.js optimization
 */

import { MongoClient, Db } from 'mongodb';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add your MONGODB_URI to .env.local');
  }
  return uri;
}

function getDbName(): string {
  return process.env.MONGODB_DB_NAME || 'just-daily-ops-v2';
}

const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 10000, // Increased from 5000 to 10000 (10 seconds)
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000, // Added: Connection timeout
  retryWrites: true,
  retryReads: true,
};

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  const uri = getMongoUri();

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getDbName());
}

/**
 * Get MongoDB client (for advanced operations)
 */
export async function getClient(): Promise<MongoClient> {
  return getClientPromise();
}

// Export a function to get the client promise (lazy initialization)
export default getClientPromise;

