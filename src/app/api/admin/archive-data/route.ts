/**
 * POST /api/admin/archive-data
 * 
 * Archives raw data older than specified months (default: 1 month / 4 weeks)
 * - Compresses raw data + aggregated data to JSON.gz files
 * - Keeps aggregated data in MongoDB (used by UI)
 * - Deletes archived raw data from MongoDB
 * 
 * Rationale: Financial data is updated within max 4 weeks, so data older than 1 month
 * is unlikely to change. Aggregated data remains in MongoDB for UI.
 * 
 * Query params:
 * - months: number (default: 1) - Keep data newer than this many months
 * - dryRun: boolean (default: false) - If true, only shows what would be archived
 * - provider: 'bork' | 'eitje' | 'all' (default: 'all')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

// Use maximum compression level (9) for best compression ratio
const gzipAsync = promisify(gzip);
const GZIP_LEVEL = 9; // Maximum compression (slower but ~10-15% better compression)

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface ArchiveStats {
  provider: string;
  recordsFound: number;
  recordsArchived: number;
  recordsDeleted: number;
  totalSizeBefore: number; // bytes
  totalSizeAfter: number; // bytes
  archiveFiles: string[];
  errors: string[];
}

export async function POST(request: NextRequest) {
  const stats: ArchiveStats[] = [];
  let totalSpaceFreed = 0;

  try {
    const { searchParams } = new URL(request.url);
    const monthsToKeep = parseInt(searchParams.get('months') || '1', 10); // Default: 1 month (4 weeks)
    const dryRun = searchParams.get('dryRun') === 'true';
    const provider = searchParams.get('provider') || 'all';

    const db = await getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);

    console.log(`[Archive Data] Starting archival process`);
    console.log(`[Archive Data] Cutoff date: ${cutoffDate.toISOString()} (keeping data newer than ${monthsToKeep} month(s) / ${monthsToKeep * 4} weeks)`);
    console.log(`[Archive Data] Dry run: ${dryRun}`);

    // Create archive directory
    const archiveDir = join(process.cwd(), 'data-archives');
    if (!dryRun) {
      try {
        await mkdir(archiveDir, { recursive: true });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }

    // Archive Bork data
    if (provider === 'all' || provider === 'bork') {
      const borkStats = await archiveBorkData(db, cutoffDate, archiveDir, dryRun);
      stats.push(borkStats);
      totalSpaceFreed += borkStats.totalSizeBefore - borkStats.totalSizeAfter;
    }

    // Archive Eitje data
    if (provider === 'all' || provider === 'eitje') {
      const eitjeStats = await archiveEitjeData(db, cutoffDate, archiveDir, dryRun);
      stats.push(eitjeStats);
      totalSpaceFreed += eitjeStats.totalSizeBefore - eitjeStats.totalSizeAfter;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      monthsToKeep,
      cutoffDate: cutoffDate.toISOString(),
      stats,
      totalSpaceFreedMB: Math.round((totalSpaceFreed / 1024 / 1024) * 100) / 100,
      message: dryRun 
        ? `Dry run completed. Would archive ${stats.reduce((sum, s) => sum + s.recordsFound, 0)} records.`
        : `Archival completed. Archived ${stats.reduce((sum, s) => sum + s.recordsArchived, 0)} records, freed ${Math.round((totalSpaceFreed / 1024 / 1024) * 100) / 100} MB.`,
    });
  } catch (error: any) {
    console.error('[Archive Data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to archive data',
        stats,
      },
      { status: 500 }
    );
  }
}

async function archiveBorkData(
  db: any,
  cutoffDate: Date,
  archiveDir: string,
  dryRun: boolean
): Promise<ArchiveStats> {
  const stats: ArchiveStats = {
    provider: 'bork',
    recordsFound: 0,
    recordsArchived: 0,
    recordsDeleted: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
    archiveFiles: [],
    errors: [],
  };

  try {
    // Find records older than cutoff date
    const oldRecords = await db.collection('bork_raw_data')
      .find({
        date: { $lt: cutoffDate },
      })
      .toArray();

    stats.recordsFound = oldRecords.length;

    if (oldRecords.length === 0) {
      return stats;
    }

    // Group by location and month for efficient archiving
    const recordsByLocationMonth = new Map<string, any[]>();
    
    for (const record of oldRecords) {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const locationId = record.locationId.toString();
      const key = `${locationId}-${year}-${month}`;
      
      if (!recordsByLocationMonth.has(key)) {
        recordsByLocationMonth.set(key, []);
      }
      recordsByLocationMonth.get(key)!.push(record);
    }

    // Calculate total size before
    stats.totalSizeBefore = JSON.stringify(oldRecords).length;

    // Archive each group
    for (const [key, records] of recordsByLocationMonth.entries()) {
      try {
        const [locationId, year, month] = key.split('-');
        const archiveFileName = `bork-${locationId}-${year}-${String(month).padStart(2, '0')}.json.gz`;
        const archivePath = join(archiveDir, archiveFileName);

        if (!dryRun) {
          // Fetch corresponding aggregated data for the same date range
          const dateRangeStart = new Date(parseInt(year), parseInt(month) - 1, 1);
          const dateRangeEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
          
          const aggregatedData = await db.collection('bork_aggregated')
            .find({
              locationId: new ObjectId(locationId),
              date: { $gte: dateRangeStart, $lte: dateRangeEnd },
            })
            .toArray();

          // Create archive structure with both raw and aggregated data
          const archiveData = {
            metadata: {
              provider: 'bork',
              locationId: locationId,
              year: parseInt(year),
              month: parseInt(month),
              archivedAt: new Date().toISOString(),
              rawRecordsCount: records.length,
              aggregatedRecordsCount: aggregatedData.length,
            },
            rawData: records,
            aggregatedData: aggregatedData,
          };

          // Compress and save with maximum compression
          // Use compact JSON (no pretty printing) for smaller size
          const jsonData = JSON.stringify(archiveData); // Compact JSON (no indentation)
          const compressed = await gzipAsync(Buffer.from(jsonData), { level: GZIP_LEVEL });
          await writeFile(archivePath, compressed);
          
          // Delete raw data from MongoDB (keep aggregated data - it's small and used by UI)
          const recordIds = records.map((r: any) => r._id);
          const deleteResult = await db.collection('bork_raw_data').deleteMany({
            _id: { $in: recordIds },
          });
          
          stats.recordsDeleted += deleteResult.deletedCount;
          stats.archiveFiles.push(archiveFileName);
          
          console.log(`[Archive Data] Archived ${records.length} raw records + ${aggregatedData.length} aggregated records for ${key}`);
        }
        
        stats.recordsArchived += records.length;
      } catch (error: any) {
        stats.errors.push(`Error archiving ${key}: ${error.message}`);
        console.error(`[Archive Data] Error archiving ${key}:`, error);
      }
    }

    // Calculate size after (only aggregated data remains)
    const remainingRecords = await db.collection('bork_raw_data')
      .find({ date: { $lt: cutoffDate } })
      .toArray();
    stats.totalSizeAfter = remainingRecords.length > 0 
      ? JSON.stringify(remainingRecords).length 
      : 0;

  } catch (error: any) {
    stats.errors.push(`Error processing Bork data: ${error.message}`);
    console.error('[Archive Data] Error archiving Bork data:', error);
  }

  return stats;
}

async function archiveEitjeData(
  db: any,
  cutoffDate: Date,
  archiveDir: string,
  dryRun: boolean
): Promise<ArchiveStats> {
  const stats: ArchiveStats = {
    provider: 'eitje',
    recordsFound: 0,
    recordsArchived: 0,
    recordsDeleted: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
    archiveFiles: [],
    errors: [],
  };

  try {
    // Find records older than cutoff date
    const oldRecords = await db.collection('eitje_raw_data')
      .find({
        date: { $lt: cutoffDate },
      })
      .toArray();

    stats.recordsFound = oldRecords.length;

    if (oldRecords.length === 0) {
      return stats;
    }

    // Group by endpoint, location, and month
    const recordsByGroup = new Map<string, any[]>();
    
    for (const record of oldRecords) {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const locationId = record.locationId?.toString() || 'unknown';
      const endpoint = record.endpoint || 'unknown';
      const key = `${endpoint}-${locationId}-${year}-${month}`;
      
      if (!recordsByGroup.has(key)) {
        recordsByGroup.set(key, []);
      }
      recordsByGroup.get(key)!.push(record);
    }

    // Calculate total size before
    stats.totalSizeBefore = JSON.stringify(oldRecords).length;

    // Archive each group
    for (const [key, records] of recordsByGroup.entries()) {
      try {
        const [endpoint, locationId, year, month] = key.split('-');
        const archiveFileName = `eitje-${endpoint}-${locationId}-${year}-${String(month).padStart(2, '0')}.json.gz`;
        const archivePath = join(archiveDir, archiveFileName);

        if (!dryRun) {
          // Fetch corresponding aggregated data for the same date range
          const dateRangeStart = new Date(parseInt(year), parseInt(month) - 1, 1);
          const dateRangeEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
          
          const aggregatedData = await db.collection('eitje_aggregated')
            .find({
              locationId: new ObjectId(locationId),
              date: { $gte: dateRangeStart, $lte: dateRangeEnd },
            })
            .toArray();

          // Create archive structure with both raw and aggregated data
          const archiveData = {
            metadata: {
              provider: 'eitje',
              endpoint: endpoint,
              locationId: locationId,
              year: parseInt(year),
              month: parseInt(month),
              archivedAt: new Date().toISOString(),
              rawRecordsCount: records.length,
              aggregatedRecordsCount: aggregatedData.length,
            },
            rawData: records,
            aggregatedData: aggregatedData,
          };

          // Compress and save with maximum compression
          // Use compact JSON (no pretty printing) for smaller size
          const jsonData = JSON.stringify(archiveData); // Compact JSON (no indentation)
          const compressed = await gzipAsync(Buffer.from(jsonData), { level: GZIP_LEVEL });
          await writeFile(archivePath, compressed);
          
          // Delete raw data from MongoDB (keep aggregated data - it's small and used by UI)
          const recordIds = records.map((r: any) => r._id);
          const deleteResult = await db.collection('eitje_raw_data').deleteMany({
            _id: { $in: recordIds },
          });
          
          stats.recordsDeleted += deleteResult.deletedCount;
          stats.archiveFiles.push(archiveFileName);
          
          console.log(`[Archive Data] Archived ${records.length} raw records + ${aggregatedData.length} aggregated records for ${key}`);
        }
        
        stats.recordsArchived += records.length;
      } catch (error: any) {
        stats.errors.push(`Error archiving ${key}: ${error.message}`);
        console.error(`[Archive Data] Error archiving ${key}:`, error);
      }
    }

    // Calculate size after
    const remainingRecords = await db.collection('eitje_raw_data')
      .find({ date: { $lt: cutoffDate } })
      .toArray();
    stats.totalSizeAfter = remainingRecords.length > 0 
      ? JSON.stringify(remainingRecords).length 
      : 0;

  } catch (error: any) {
    stats.errors.push(`Error processing Eitje data: ${error.message}`);
    console.error('[Archive Data] Error archiving Eitje data:', error);
  }

  return stats;
}

