/**
 * Save Bork API connections to MongoDB
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getDatabase } from '../src/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

config({ path: resolve(process.cwd(), '.env.local') });

const connections = [
  {
    location: 'Bar Bea',
    locationId: '550e8400-e29b-41d4-a716-446655440002',
    apiKey: '1f518c6dce0a466d8d0f7c95b0717de4',
    baseUrl: 'https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com',
  },
  {
    location: 'Van Kinsbergen',
    locationId: '550e8400-e29b-41d4-a716-446655440001',
    apiKey: '1f518c6dce0a466d8d0f7c95b0717de4',
    baseUrl: 'https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com',
  },
  {
    location: "L'Amour Toujours",
    locationId: '550e8400-e29b-41d4-a716-446655440003',
    apiKey: '1f518c6dce0a466d8d0f7c95b0717de4',
    baseUrl: 'https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com',
  },
];

async function saveConnections() {
  try {
    const db = await getDatabase();

    for (const conn of connections) {
      // Find location by name
      const location = await db.collection('locations').findOne({
        name: conn.location,
      });

      if (!location) {
        console.log(`❌ Location not found: ${conn.location}`);
        continue;
      }

      // Check if connection already exists
      const existing = await db.collection('api_credentials').findOne({
        provider: 'bork',
        locationId: location._id,
      });

      if (existing) {
        // Update existing
        await db.collection('api_credentials').updateOne(
          { _id: existing._id },
          {
            $set: {
              apiKey: conn.apiKey,
              baseUrl: conn.baseUrl,
              isActive: true,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`✅ Updated: ${conn.location} (${location._id})`);
      } else {
        // Create new
        await db.collection('api_credentials').insertOne({
          locationId: location._id,
          provider: 'bork',
          apiKey: conn.apiKey,
          baseUrl: conn.baseUrl,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created: ${conn.location} (${location._id})`);
      }
    }

    // Verify
    const active = await db.collection('api_credentials').find({
      provider: 'bork',
      isActive: true,
    }).toArray();

    console.log(`\n✅ Total active Bork connections: ${active.length}`);
    active.forEach((conn) => {
      console.log(`   - Location ID: ${conn.locationId}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

saveConnections();


