/**
 * POST /api/bork/v2/master-sync
 * Sync master data from Bork API to MongoDB
 * 
 * Body:
 * - locationId: string (required) - Location UUID
 * - endpoint: string (required) - 'product_groups' | 'payment_methods' | 'cost_centers' | 'users'
 * - baseUrl: string (required) - Bork API base URL
 * - apiKey: string (required) - Bork API key
 * 
 * GET /api/bork/v2/master-sync
 * Get master data sync status
 * 
 * Query params:
 * - locationId: optional - filter by location
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import {
  fetchBorkProductGroups,
  fetchBorkPaymentMethods,
  fetchBorkCostCenters,
  fetchBorkUsers,
} from '@/lib/bork/v2-master-data-client';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, endpoint, baseUrl, apiKey } = body;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'endpoint is required' },
        { status: 400 }
      );
    }

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'baseUrl and apiKey are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Resolve locationId to ObjectId (handles both UUID and ObjectId formats)
    let locationObjectId: ObjectId | null = null;
    let location;
    
    // Method 1: Try ObjectId
    try {
      locationObjectId = new ObjectId(locationId);
      location = await db.collection('locations').findOne({
        _id: locationObjectId,
      });
    } catch (error) {
      // Not a valid ObjectId, continue to other methods
    }

    // Method 2: Try to find by systemMappings (for UUID locationIds)
    if (!location) {
      location = await db.collection('locations').findOne({
        'systemMappings.externalId': locationId,
        'systemMappings.system': 'bork',
      });
      
      if (location) {
        locationObjectId = location._id;
      }
    }

    if (!locationObjectId) {
      return NextResponse.json(
        { success: false, error: `Location not found for locationId: ${locationId}` },
        { status: 404 }
      );
    }

    let recordsSaved = 0;

    // Fetch data from Bork API based on endpoint
    let apiData: any[] = [];

    switch (endpoint) {
      case 'product_groups':
        apiData = await fetchBorkProductGroups(baseUrl, apiKey);
        break;
      case 'payment_methods':
        apiData = await fetchBorkPaymentMethods(baseUrl, apiKey);
        break;
      case 'cost_centers':
        apiData = await fetchBorkCostCenters(baseUrl, apiKey);
        break;
      case 'users':
        apiData = await fetchBorkUsers(baseUrl, apiKey);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown endpoint: ${endpoint}` },
          { status: 400 }
        );
    }

    if (apiData.length === 0) {
      return NextResponse.json({
        success: true,
        recordsSaved: 0,
        message: `No ${endpoint} data found for this location`,
      });
    }

    // Handle different endpoints with different sync strategies
    if (endpoint === 'users') {
      // Sync to unified_users with system mappings
      for (const item of apiData) {
        const borkUserId = item.Key || null;
        const userName = item.Name || null;
        const email = item.Email || item.email || null;
        const nationalId = item.NationalId || null;
        const personelId = item.PersonelId || null;
        
        if (!borkUserId) continue;

        // Parse name: "First Last" or "First Middle Last"
        const nameParts = userName ? userName.trim().split(/\s+/) : [];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        // Find existing unified user by email or name
        let unifiedUser = null;
        if (email) {
          unifiedUser = await db.collection('unified_users').findOne({ email });
        }
        
        if (!unifiedUser && firstName && lastName) {
          unifiedUser = await db.collection('unified_users').findOne({
            firstName,
            lastName,
          });
        }

        // Create or update unified user
        const now = new Date();
        if (!unifiedUser) {
          // Create new unified user
          const newUser = {
            firstName,
            lastName,
            email: email || null,
            employeeNumber: personelId || nationalId || null,
            isActive: item.IsActive !== undefined ? item.IsActive : (item.isActive !== undefined ? item.isActive : true),
            locationIds: [locationObjectId],
            teamIds: [],
            systemMappings: [{
              system: 'bork',
              externalId: borkUserId.toString(),
              rawData: item,
            }],
            createdAt: now,
            updatedAt: now,
          };
          
          const result = await db.collection('unified_users').insertOne(newUser);
          unifiedUser = { _id: result.insertedId, ...newUser };
          recordsSaved++;
        } else {
          // Update existing unified user
          const updateData: any = {
            updatedAt: now,
          };

          // Update name if missing
          if (!unifiedUser.firstName && firstName) updateData.firstName = firstName;
          if (!unifiedUser.lastName && lastName) updateData.lastName = lastName;
          if (!unifiedUser.email && email) updateData.email = email;
          if (!unifiedUser.employeeNumber && (personelId || nationalId)) {
            updateData.employeeNumber = personelId || nationalId;
          }

          // Add locationId if not already in array
          const locationIds = unifiedUser.locationIds || [];
          if (!locationIds.some((id: ObjectId) => id.toString() === locationObjectId.toString())) {
            updateData.locationIds = [...locationIds, locationObjectId];
          }

          // Add or update Bork system mapping
          const systemMappings = unifiedUser.systemMappings || [];
          const borkMappingIndex = systemMappings.findIndex((m: any) => m.system === 'bork' && m.externalId === borkUserId.toString());
          
          if (borkMappingIndex >= 0) {
            systemMappings[borkMappingIndex] = {
              system: 'bork',
              externalId: borkUserId.toString(),
              rawData: item,
            };
          } else {
            systemMappings.push({
              system: 'bork',
              externalId: borkUserId.toString(),
              rawData: item,
            });
          }
          updateData.systemMappings = systemMappings;

          await db.collection('unified_users').updateOne(
            { _id: unifiedUser._id },
            { $set: updateData }
          );
          recordsSaved++;
        }
      }
    } else if (endpoint === 'cost_centers') {
      // Sync to locations with system mappings
      for (const item of apiData) {
        const borkCenterId = item.Key || null;
        const centerName = item.Name || null;
        const centerNumber = item.CenterNr || null;
        
        if (!borkCenterId || !centerName) continue;

        // Find existing location by name or system mapping
        let location = await db.collection('locations').findOne({
          $or: [
            { name: centerName },
            { name: { $regex: new RegExp(`^${centerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { 'systemMappings.system': 'bork', 'systemMappings.externalId': borkCenterId.toString() },
          ],
        });

        // Create or update location
        const now = new Date();
        if (!location) {
          // Create new location
          const newLocation = {
            name: centerName,
            code: centerNumber || null,
            isActive: true,
            systemMappings: [{
              system: 'bork',
              externalId: borkCenterId.toString(),
              rawData: item,
            }],
            createdAt: now,
            updatedAt: now,
          };
          
          const result = await db.collection('locations').insertOne(newLocation);
          location = { _id: result.insertedId, ...newLocation };
          recordsSaved++;
        } else {
          // Update existing location
          const updateData: any = {
            updatedAt: now,
          };

          // Update code if missing
          if (!location.code && centerNumber) {
            updateData.code = centerNumber;
          }

          // Add or update Bork system mapping
          const systemMappings = location.systemMappings || [];
          const borkMappingIndex = systemMappings.findIndex((m: any) => m.system === 'bork' && m.externalId === borkCenterId.toString());
          
          if (borkMappingIndex >= 0) {
            systemMappings[borkMappingIndex] = {
              system: 'bork',
              externalId: borkCenterId.toString(),
              rawData: item,
            };
          } else {
            systemMappings.push({
              system: 'bork',
              externalId: borkCenterId.toString(),
              rawData: item,
            });
          }
          updateData.systemMappings = systemMappings;

          await db.collection('locations').updateOne(
            { _id: location._id },
            { $set: updateData }
          );
          recordsSaved++;
        }
      }
    } else {
      // Reference data: product_groups and payment_methods
      // Store in separate collections as lookup tables
      const collectionName = endpoint === 'product_groups' ? 'bork_product_groups' : 'bork_payment_methods';
      
      // Delete existing records for this location
      await db.collection(collectionName).deleteMany({ locationId: locationObjectId });

      // Prepare documents for insertion
      const documents = apiData.map((item) => {
        const doc: any = {
          locationId: locationObjectId,
          rawApiResponse: item,
          lastSyncDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (endpoint === 'product_groups') {
          // Actual fields from Bork API: Key, Name, LeftNr, RightNr, GroupLevel, ColorKey, Data, $type
          doc.groupId = item.Key || null;
          doc.groupName = item.Name || null;
          doc.leftNr = item.LeftNr !== undefined ? item.LeftNr : null;
          doc.rightNr = item.RightNr !== undefined ? item.RightNr : null;
          doc.groupLevel = item.GroupLevel !== undefined ? item.GroupLevel : null;
          doc.colorKey = item.ColorKey || null;
          doc.data = item.Data || null;
          doc.type = item.$type || null;
          // Parent relationship: Check if there's a ParentKey field, otherwise use LeftNr/RightNr hierarchy
          doc.parentGroupId = item.ParentKey || item.ParentGroupKey || null;
          doc.parentGroupName = item.ParentName || item.ParentGroupName || null;
        } else if (endpoint === 'payment_methods') {
          // Actual fields from Bork API: Key, Name, LeftNr, RightNr, GroupLevel, ColorKey, Data, $type
          doc.paymentMethodId = item.Key || null;
          doc.paymentMethodName = item.Name || null;
          doc.leftNr = item.LeftNr !== undefined ? item.LeftNr : null;
          doc.rightNr = item.RightNr !== undefined ? item.RightNr : null;
          doc.groupLevel = item.GroupLevel !== undefined ? item.GroupLevel : null;
          doc.colorKey = item.ColorKey || null;
          doc.data = item.Data || null;
          doc.type = item.$type || null;
          // Parent relationship
          doc.parentGroupId = item.ParentKey || item.ParentGroupKey || null;
          doc.parentGroupName = item.ParentName || item.ParentGroupName || null;
        }

        return doc;
      });

      // Insert documents
      if (documents.length > 0) {
        const result = await db.collection(collectionName).insertMany(documents);
        recordsSaved = result.insertedCount;
      }
    }

    console.log(`[API /bork/v2/master-sync] Synced ${recordsSaved} ${endpoint} records for location ${locationId}`);

    return NextResponse.json({
      success: true,
      recordsSaved,
      message: `Successfully synced ${recordsSaved} ${endpoint} records`,
      endpoint,
      locationId,
    });
  } catch (error: unknown) {
    console.error('[API /bork/v2/master-sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync master data',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const db = await getDatabase();

    // Build query
    const query: any = {};
    if (locationId && locationId !== 'all') {
      // Resolve locationId to ObjectId (handles both UUID and ObjectId formats)
      let locationObjectId: ObjectId | null = null;
      
      // Method 1: Try ObjectId
      try {
        locationObjectId = new ObjectId(locationId);
        const location = await db.collection('locations').findOne({
          _id: locationObjectId,
        });
        if (location) {
          query.locationId = locationObjectId;
        }
      } catch (error) {
        // Not a valid ObjectId, try systemMappings
        const location = await db.collection('locations').findOne({
          'systemMappings.externalId': locationId,
          'systemMappings.system': 'bork',
        });
        
        if (location) {
          query.locationId = location._id;
        } else {
          console.warn(`Invalid locationId: ${locationId}`);
        }
      }
    }

    // Get counts for each collection
    // Note: users are in unified_users, cost_centers are in locations
    const [productGroups, paymentMethods, costCenters, users] = await Promise.all([
      db.collection('bork_product_groups').countDocuments(query),
      db.collection('bork_payment_methods').countDocuments(query),
      // Cost centers are in locations collection with system mappings
      // Note: Cost centers ARE locations, so we count all locations with Bork mappings
      db.collection('locations').countDocuments({
        'systemMappings.system': 'bork',
      }),
      // Users are in unified_users collection with system mappings
      query.locationId
        ? db.collection('unified_users').countDocuments({
            locationIds: query.locationId,
            'systemMappings.system': 'bork',
          })
        : db.collection('unified_users').countDocuments({
            'systemMappings.system': 'bork',
          }),
    ]);

    // Get last sync dates
      const getLastSync = async (collectionName: string, useSystemMapping: boolean = false, useLocationIds: boolean = false) => {
      let findQuery: any = {};
      
      if (useSystemMapping) {
        if (useLocationIds && query.locationId) {
          // For users: filter by locationIds array
          findQuery = {
            locationIds: query.locationId,
            'systemMappings.system': 'bork',
          };
        } else {
          // For cost centers: just filter by system mapping (cost centers ARE locations)
          findQuery = { 'systemMappings.system': 'bork' };
        }
      } else {
        // For reference data (product_groups, payment_methods)
        findQuery = query;
      }
      
      const lastRecord = await db.collection(collectionName)
        .find(findQuery)
        .sort({ updatedAt: -1, lastSyncDate: -1 })
        .limit(1)
        .toArray();
      return lastRecord[0]?.lastSyncDate || lastRecord[0]?.updatedAt || null;
    };

    const [productGroupsLastSync, paymentMethodsLastSync, costCentersLastSync, usersLastSync] = await Promise.all([
      getLastSync('bork_product_groups'),
      getLastSync('bork_payment_methods'),
      getLastSync('locations', true, false), // Cost centers are in locations (no locationIds filter)
      getLastSync('unified_users', true, true), // Users are in unified_users (filter by locationIds)
    ]);

    // Get sample records for verification
    const getSample = async (collectionName: string, limit: number = 2) => {
      const samples = await db.collection(collectionName)
        .find(query)
        .limit(limit)
        .toArray();
      return samples.map((record: any) => {
        const sample: any = {
          _id: record._id,
          locationId: record.locationId,
          lastSyncDate: record.lastSyncDate,
        };
        
        // Include ALL extracted fields
        if (collectionName === 'bork_product_groups') {
          sample.groupId = record.groupId;
          sample.groupName = record.groupName;
          sample.leftNr = record.leftNr;
          sample.rightNr = record.rightNr;
          sample.groupLevel = record.groupLevel;
          sample.colorKey = record.colorKey;
          sample.data = record.data;
          sample.type = record.type;
          sample.parentGroupId = record.parentGroupId;
          sample.parentGroupName = record.parentGroupName;
        } else if (collectionName === 'bork_payment_methods') {
          sample.paymentMethodId = record.paymentMethodId;
          sample.paymentMethodName = record.paymentMethodName;
          sample.leftNr = record.leftNr;
          sample.rightNr = record.rightNr;
          sample.groupLevel = record.groupLevel;
          sample.colorKey = record.colorKey;
          sample.data = record.data;
          sample.type = record.type;
          sample.parentGroupId = record.parentGroupId;
          sample.parentGroupName = record.parentGroupName;
        } else if (collectionName === 'locations') {
          // Cost centers are in locations collection
          sample.centerName = record.name;
          sample.centerId = record.systemMappings?.find((m: any) => m.system === 'bork')?.externalId || null;
          sample.centerNumber = record.code;
          sample.rawData = record.systemMappings?.find((m: any) => m.system === 'bork')?.rawData || null;
        } else if (collectionName === 'unified_users') {
          // Users are in unified_users collection
          sample.userName = record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : record.firstName || record.lastName || null;
          sample.userId = record.systemMappings?.find((m: any) => m.system === 'bork')?.externalId || null;
          sample.email = record.email;
          sample.nationalId = record.employeeNumber || null;
          sample.isActive = record.isActive;
          sample.rawData = record.systemMappings?.find((m: any) => m.system === 'bork')?.rawData || null;
        }
        
        return sample;
      });
    };

    // Build query for samples (cost centers and users need special handling)
    const costCentersQuery = { 'systemMappings.system': 'bork' }; // Cost centers ARE locations
    const usersQuery = query.locationId
      ? { locationIds: query.locationId, 'systemMappings.system': 'bork' }
      : { 'systemMappings.system': 'bork' };

    const [productGroupsSamples, paymentMethodsSamples, costCentersSamples, usersSamples] = await Promise.all([
      getSample('bork_product_groups'),
      getSample('bork_payment_methods'),
      (async () => {
        const samples = await db.collection('locations')
          .find(costCentersQuery)
          .limit(2)
          .toArray();
        return samples.map((record: any) => {
          const sample: any = {
            _id: record._id,
            locationId: record._id, // Location IS the cost center
            lastSyncDate: record.updatedAt,
            centerName: record.name,
            centerId: record.systemMappings?.find((m: any) => m.system === 'bork')?.externalId || null,
            centerNumber: record.code,
            rawData: record.systemMappings?.find((m: any) => m.system === 'bork')?.rawData || null,
          };
          return sample;
        });
      })(),
      (async () => {
        const samples = await db.collection('unified_users')
          .find(usersQuery)
          .limit(2)
          .toArray();
        return samples.map((record: any) => {
          const sample: any = {
            _id: record._id,
            locationId: record.locationIds?.[0] || null,
            lastSyncDate: record.updatedAt,
            userName: record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : record.firstName || record.lastName || null,
            userId: record.systemMappings?.find((m: any) => m.system === 'bork')?.externalId || null,
            email: record.email,
            nationalId: record.employeeNumber || null,
            isActive: record.isActive,
            rawData: record.systemMappings?.find((m: any) => m.system === 'bork')?.rawData || null,
          };
          return sample;
        });
      })(),
    ]);

    return NextResponse.json({
      success: true,
      status: {
        product_groups: {
          count: productGroups,
          lastSync: productGroupsLastSync,
          samples: productGroupsSamples,
        },
        payment_methods: {
          count: paymentMethods,
          lastSync: paymentMethodsLastSync,
          samples: paymentMethodsSamples,
        },
        cost_centers: {
          count: costCenters,
          lastSync: costCentersLastSync,
          samples: costCentersSamples,
        },
        users: {
          count: users,
          lastSync: usersLastSync,
          samples: usersSamples,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[API /bork/v2/master-sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get master data status',
      },
      { status: 500 }
    );
  }
}

