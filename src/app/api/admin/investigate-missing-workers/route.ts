/**
 * POST /api/admin/investigate-missing-workers
 * 
 * CRITICAL DATA INTEGRITY CHECK:
 * - Compare eitje_aggregated workers vs worker_profiles
 * - Compare bork_raw_data workers vs worker_profiles
 * - Compare unified_users vs worker_profiles
 * - Find all missing workers
 * - Check if workers from Excel file exist in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    console.log('[Investigate Missing Workers] Starting comprehensive data integrity check...');
    
    // Step 1: Get all workers from Excel file
    const excelWorkers = new Map<string, { name: string; eitjeId?: number }>();
    try {
      const excelPath = path.join(
        process.cwd(),
        'dev-docs',
        'eitje-data-check-271025-031126',
        'eitje-in-actieve-overzicht-werknermers-contracten-2024 - 08 11 2025 -V2.xlsx'
      );
      
      if (fs.existsSync(excelPath)) {
        const fileBuffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Find header row
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(30, allData.length); i++) {
          const row = allData[i];
          if (row && row.length > 1) {
            const rowStr = row.map(cell => String(cell || '').toLowerCase()).join('|');
            if (rowStr.includes('naam') || rowStr.includes('name') || rowStr.includes('support id')) {
              headerRowIndex = i;
              break;
            }
          }
        }
        
        if (headerRowIndex >= 0) {
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            range: headerRowIndex,
            defval: null
          }) as any[];
          
          jsonData.forEach((row: any) => {
            const name = row['▲ naam'] || row['naam'] || row['name'] || row['Naam'];
            const eitjeId = row['support ID'] || row['support_id'] || row['eitje_id'];
            if (name) {
              excelWorkers.set(name.toString().trim(), {
                name: name.toString().trim(),
                eitjeId: eitjeId ? Number(eitjeId) : undefined
              });
            }
          });
          
          console.log(`[Investigate Missing Workers] Found ${excelWorkers.size} workers in Excel file`);
        }
      }
    } catch (excelError: any) {
      console.warn('[Investigate Missing Workers] Could not read Excel file:', excelError.message);
    }
    
    // Step 2: Get all workers from eitje_aggregated
    const eitjeAggregatedWorkers = await db.collection('eitje_aggregated')
      .aggregate([
        {
          $group: {
            _id: '$unifiedUserId',
            eitjeUserId: { $first: '$eitjeUserId' },
            userName: { $first: '$userName' },
            locationName: { $first: '$locationName' },
            sampleRecord: { $first: '$$ROOT' }
          }
        }
      ])
      .toArray();
    
    console.log(`[Investigate Missing Workers] Found ${eitjeAggregatedWorkers.length} unique workers in eitje_aggregated`);
    
    // Step 3: Get all workers from bork_raw_data (via waiter_name)
    const borkWorkers = await db.collection('bork_raw_data')
      .aggregate([
        {
          $match: {
            waiter_name: { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$waiter_name',
            waiterName: { $first: '$waiter_name' },
            locationId: { $first: '$locationId' },
            sampleRecord: { $first: '$$ROOT' }
          }
        }
      ])
      .toArray();
    
    console.log(`[Investigate Missing Workers] Found ${borkWorkers.length} unique waiters in bork_raw_data`);
    
    // Step 4: Get all worker_profiles
    const workerProfiles = await db.collection('worker_profiles').find({}).toArray();
    const workerProfilesByEitjeId = new Map<number, any>();
    const workerProfilesByName = new Map<string, any>();
    
    workerProfiles.forEach(profile => {
      if (profile.eitje_user_id) {
        workerProfilesByEitjeId.set(Number(profile.eitje_user_id), profile);
      }
      const name = profile.user_name || profile.userName || profile.unifiedUserName;
      if (name) {
        workerProfilesByName.set(name.toString().trim().toLowerCase(), profile);
      }
    });
    
    console.log(`[Investigate Missing Workers] Found ${workerProfiles.length} worker profiles`);
    
    // Step 5: Get all unified_users
    const unifiedUsers = await db.collection('unified_users').find({}).toArray();
    const unifiedUsersByEitjeId = new Map<number, any>();
    const unifiedUsersByName = new Map<string, any>();
    
    unifiedUsers.forEach(user => {
      const eitjeMapping = user.systemMappings?.find((m: any) => m.system === 'eitje');
      if (eitjeMapping?.externalId) {
        const eitjeId = Number(eitjeMapping.externalId);
        unifiedUsersByEitjeId.set(eitjeId, user);
      }
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (name) {
        unifiedUsersByName.set(name.toLowerCase(), user);
      }
    });
    
    console.log(`[Investigate Missing Workers] Found ${unifiedUsers.length} unified users`);
    
    // Step 6: Find missing workers
    const missingFromWorkerProfiles: any[] = [];
    const missingFromUnifiedUsers: any[] = [];
    const missingFromExcel: any[] = [];
    
    // Check eitje_aggregated workers
    for (const eitjeWorker of eitjeAggregatedWorkers) {
      const eitjeUserId = eitjeWorker.eitjeUserId;
      const userName = eitjeWorker.userName;
      
      if (eitjeUserId) {
        // Check if exists in worker_profiles
        if (!workerProfilesByEitjeId.has(eitjeUserId)) {
          missingFromWorkerProfiles.push({
            source: 'eitje_aggregated',
            eitjeUserId,
            userName,
            locationName: eitjeWorker.locationName,
            unifiedUserId: eitjeWorker._id?.toString(),
          });
        }
        
        // Check if exists in unified_users
        if (!unifiedUsersByEitjeId.has(eitjeUserId)) {
          missingFromUnifiedUsers.push({
            source: 'eitje_aggregated',
            eitjeUserId,
            userName,
            locationName: eitjeWorker.locationName,
          });
        }
      }
    }
    
    // Check Excel workers
    for (const [excelName, excelData] of excelWorkers.entries()) {
      if (excelData.eitjeId) {
        if (!workerProfilesByEitjeId.has(excelData.eitjeId)) {
          missingFromExcel.push({
            name: excelName,
            eitjeId: excelData.eitjeId,
            source: 'excel_file',
          });
        }
      } else {
        // Try to find by name
        const found = workerProfilesByName.get(excelName.toLowerCase());
        if (!found) {
          missingFromExcel.push({
            name: excelName,
            eitjeId: null,
            source: 'excel_file',
          });
        }
      }
    }
    
    // Step 7: Check the 3 specific missing workers
    const specificWorkers = [
      { name: 'Joost Hansen', location: 'Kinsbergen' },
      { name: 'Bran van de Berg', location: 'Kinsbergen' },
      { name: 'Daniel Kaatee', location: 'BarBea' },
    ];
    
    const specificWorkerStatus: any[] = [];
    
    for (const worker of specificWorkers) {
      const nameLower = worker.name.toLowerCase();
      const foundInProfiles = workerProfilesByName.get(nameLower);
      const foundInUnified = unifiedUsersByName.get(nameLower);
      
      // Check in eitje_raw_data
      const eitjeUser = await db.collection('eitje_raw_data').findOne({
        endpoint: 'users',
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$extracted.first_name', ' ', '$extracted.last_name'] },
                regex: new RegExp(`^${worker.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
              }
            }
          },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$rawApiResponse.first_name', ' ', '$rawApiResponse.last_name'] },
                regex: new RegExp(`^${worker.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
              }
            }
          }
        ]
      });
      
      // Check in eitje_aggregated
      const eitjeAggregated = await db.collection('eitje_aggregated').findOne({
        userName: { $regex: new RegExp(`^${worker.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      specificWorkerStatus.push({
        name: worker.name,
        location: worker.location,
        inWorkerProfiles: !!foundInProfiles,
        inUnifiedUsers: !!foundInUnified,
        inEitjeRawData: !!eitjeUser,
        inEitjeAggregated: !!eitjeAggregated,
        eitjeUserId: eitjeUser?.extracted?.id || eitjeUser?.rawApiResponse?.id || eitjeAggregated?.eitjeUserId,
        workerProfileId: foundInProfiles?._id?.toString(),
        unifiedUserId: foundInUnified?._id?.toString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        totalExcelWorkers: excelWorkers.size,
        totalEitjeAggregatedWorkers: eitjeAggregatedWorkers.length,
        totalBorkWorkers: borkWorkers.length,
        totalWorkerProfiles: workerProfiles.length,
        totalUnifiedUsers: unifiedUsers.length,
        missingFromWorkerProfiles: missingFromWorkerProfiles.length,
        missingFromUnifiedUsers: missingFromUnifiedUsers.length,
        missingFromExcel: missingFromExcel.length,
      },
      missingFromWorkerProfiles: missingFromWorkerProfiles.slice(0, 50), // Limit to first 50
      missingFromUnifiedUsers: missingFromUnifiedUsers.slice(0, 50),
      missingFromExcel: missingFromExcel.slice(0, 50),
      specificWorkerStatus,
      recommendations: [
        missingFromWorkerProfiles.length > 0 && 'Create worker profiles for workers in eitje_aggregated',
        missingFromUnifiedUsers.length > 0 && 'Create unified_users for workers in eitje_aggregated',
        missingFromExcel.length > 0 && 'Import missing workers from Excel file',
        'Auto-create workers when found in Eitje/Bork data',
        'Add "New User" tab in /labor/workers page for manual creation',
      ].filter(Boolean),
    });
    
  } catch (error: any) {
    console.error('[Investigate Missing Workers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to investigate missing workers',
      },
      { status: 500 }
    );
  }
}

