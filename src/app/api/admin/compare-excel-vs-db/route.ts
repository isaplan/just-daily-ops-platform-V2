/**
 * POST /api/admin/compare-excel-vs-db
 * 
 * Compares Excel exports from eitje-data-check-30NOV2025 against:
 * 1. eitje_raw_data (raw data)
 * 2. processed_hours_aggregated (aggregated hours)
 * 3. eitje_aggregated (aggregated finance)
 * 
 * Shows missing entries and data mismatches
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const DATA_FOLDER = path.join(process.cwd(), 'dev-docs', 'eitje-data-check-30NOV2025');

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

interface ExcelHoursRecord {
  date: string; // YYYY-MM-DD
  location: string;
  worker: string;
  team: string | null;
  hours: number;
  sourceFile: string;
}

interface ExcelFinanceRecord {
  date: string; // YYYY-MM-DD
  location: string;
  revenue: number;
  hours: number;
  wageCost: number;
  revenuePerHour: number;
  laborCostPercentage: number;
  team?: string; // Keuken or Bediening
  sourceFile: string;
}

function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr);
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return null;
}

function findDataHeaderRow(allData: any[][], keywords: string[]): number {
  for (let i = 0; i < Math.min(50, allData.length); i++) {
    const row = allData[i];
    if (row && row.length > 3) {
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join('|');
      const matchCount = keywords.filter(kw => rowStr.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        return i;
      }
    }
  }
  return -1;
}

async function parseExcelHoursFiles(): Promise<ExcelHoursRecord[]> {
  const records: ExcelHoursRecord[] = [];
  
  if (!fs.existsSync(DATA_FOLDER)) {
    return records;
  }
  
  const files = fs.readdirSync(DATA_FOLDER)
    .filter(file => (file.toLowerCase().includes('gewerkte-uren') || file.toLowerCase().includes('gewerkte_uren') || file.toLowerCase().includes('gewerkte uren')) && (file.endsWith('.xlsx') || file.endsWith('.xls')));
  
  for (const file of files) {
    const filePath = path.join(DATA_FOLDER, file);
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('table')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headerRowIndex = findDataHeaderRow(allData, ['datum', 'date', 'uren', 'hours', 'werknemer', 'worker', 'naam', 'name']);
      
      if (headerRowIndex === -1) continue;
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: headerRowIndex,
        defval: null
      });
      
      jsonData.forEach((row: any) => {
        if (!row || Object.keys(row).length < 3) return;
        
        const columns = Object.keys(row);
        const dateCol = columns.find((c: string) => /datum|date/i.test(c));
        const locationCol = columns.find((c: string) => /vestiging|location|zaak/i.test(c));
        const hoursCol = columns.find((c: string) => /uren|hours|gewerkte/i.test(c));
        const workerCol = columns.find((c: string) => /werknemer|worker|naam|name/i.test(c));
        const teamCol = columns.find((c: string) => /team|teamnaam/i.test(c));
        
        if (dateCol && locationCol && hoursCol && workerCol) {
          const date = parseDate(row[dateCol]);
          const location = String(row[locationCol] || '').trim();
          const hours = parseFloat(row[hoursCol]) || 0;
          const worker = String(row[workerCol] || '').trim();
          const team = teamCol ? String(row[teamCol] || '').trim() : null;
          
          if (date && location && hours > 0 && worker) {
            records.push({
              date: date.toISOString().split('T')[0],
              location,
              worker,
              team,
              hours,
              sourceFile: file
            });
          }
        }
      });
    } catch (error: any) {
      console.error(`[Compare] Error parsing ${file}:`, error.message);
    }
  }
  
  return records;
}

async function parseExcelFinanceFiles(): Promise<ExcelFinanceRecord[]> {
  const records: ExcelFinanceRecord[] = [];
  
  if (!fs.existsSync(DATA_FOLDER)) {
    return records;
  }
  
  const files = fs.readdirSync(DATA_FOLDER)
    .filter(file => file.toLowerCase().includes('financien') && (file.endsWith('.xlsx') || file.endsWith('.xls')));
  
  for (const file of files) {
    const filePath = path.join(DATA_FOLDER, file);
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('table')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headerRowIndex = findDataHeaderRow(allData, ['datum', 'date', 'vestiging', 'location', 'omzet', 'revenue']);
      
      if (headerRowIndex === -1) continue;
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: headerRowIndex,
        defval: null
      });
      
      jsonData.forEach((row: any) => {
        if (!row || Object.keys(row).length < 3) return;
        
        const columns = Object.keys(row);
        const dateCol = columns.find((c: string) => /datum|date/i.test(c));
        const locationCol = columns.find((c: string) => /vestiging|location|zaak/i.test(c));
        const revenueCol = columns.find((c: string) => /omzet|revenue|inkomsten|totaal/i.test(c));
        const hoursCol = columns.find((c: string) => /uren|hours|gewerkte/i.test(c));
        const wageCostCol = columns.find((c: string) => /loonkosten|wage|cost|arbeidskosten/i.test(c));
        const teamCol = columns.find((c: string) => /team|teamnaam|keuken|bediening/i.test(c));
        
        if (dateCol && locationCol && revenueCol) {
          const date = parseDate(row[dateCol]);
          const location = String(row[locationCol] || '').trim();
          const revenue = parseFloat(row[revenueCol]) || 0;
          const hours = hoursCol ? parseFloat(row[hoursCol]) || 0 : 0;
          const wageCost = wageCostCol ? parseFloat(row[wageCostCol]) || 0 : 0;
          const team = teamCol ? String(row[teamCol] || '').trim() : null;
          
          if (date && location && revenue > 0) {
            records.push({
              date: date.toISOString().split('T')[0],
              location,
              revenue,
              hours,
              wageCost,
              revenuePerHour: hours > 0 ? revenue / hours : 0,
              laborCostPercentage: revenue > 0 ? (wageCost / revenue) * 100 : 0,
              team,
              sourceFile: file
            });
          }
        }
      });
    } catch (error: any) {
      console.error(`[Compare] Error parsing ${file}:`, error.message);
    }
  }
  
  return records;
}

async function buildLocationMap(db: any): Promise<Map<string, ObjectId>> {
  const locations = await db.collection('locations').find({}).toArray();
  const map = new Map<string, ObjectId>();
  
  locations.forEach((loc: any) => {
    const name = (loc.name || '').trim().toLowerCase();
    if (name) {
      map.set(name, loc._id);
    }
  });
  
  return map;
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    console.log('[Compare Excel vs DB] Starting comparison...');
    
    // Step 1: Parse Excel files
    console.log('[Compare] Parsing Excel hours files...');
    const excelHoursRecords = await parseExcelHoursFiles();
    console.log(`[Compare] Found ${excelHoursRecords.length} Excel hours records`);
    
    console.log('[Compare] Parsing Excel finance files...');
    const excelFinanceRecords = await parseExcelFinanceFiles();
    console.log(`[Compare] Found ${excelFinanceRecords.length} Excel finance records`);
    
    // Step 2: Build location map
    const locationMap = await buildLocationMap(db);
    console.log(`[Compare] Built location map with ${locationMap.size} locations`);
    
    // Step 3: Compare Hours - Excel vs Raw Data
    console.log('[Compare] Comparing hours: Excel vs eitje_raw_data...');
    const hoursComparison = {
      excelTotal: excelHoursRecords.length,
      rawDataMatches: 0,
      rawDataMissing: [] as any[],
      rawDataMismatches: [] as any[]
    };
    
    // Group Excel records by location/date/worker/team
    const excelHoursMap = new Map<string, ExcelHoursRecord[]>();
    excelHoursRecords.forEach(record => {
      const locationId = locationMap.get(record.location.toLowerCase());
      if (!locationId) return;
      
      const key = `${locationId.toString()}_${record.date}_${record.worker.toLowerCase()}_${(record.team || '').toLowerCase()}`;
      if (!excelHoursMap.has(key)) {
        excelHoursMap.set(key, []);
      }
      excelHoursMap.get(key)!.push(record);
    });
    
    // Query raw data for all dates
    const dates = Array.from(new Set(excelHoursRecords.map(r => r.date)));
    const locationIds = Array.from(new Set(
      excelHoursRecords
        .map(r => locationMap.get(r.location.toLowerCase()))
        .filter(Boolean) as ObjectId[]
    ));
    
    const rawDataRecords = await db.collection('eitje_raw_data')
      .find({
        endpoint: 'time_registration_shifts',
        locationId: { $in: locationIds },
        date: { $in: dates.map(d => new Date(d)) }
      })
      .toArray();
    
    console.log(`[Compare] Found ${rawDataRecords.length} raw data records`);
    
    // Compare each Excel record
    excelHoursMap.forEach((excelRecords, key) => {
      const excelTotalHours = excelRecords.reduce((sum, r) => sum + r.hours, 0);
      const [locationId, date, worker, team] = key.split('_');
      
      // Find matching raw data records
      const matchingRaw = rawDataRecords.filter((r: any) => {
        const rLocationId = (r.locationId instanceof ObjectId ? r.locationId.toString() : String(r.locationId));
        const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
        const extracted = r.extracted || {};
        const raw = r.rawApiResponse || {};
        const rWorker = (extracted.userName || extracted.user_name || raw.user_name || raw.userName || '').toLowerCase().trim();
        const rTeam = ((extracted.teamName || extracted.team_name || raw.team_name || raw.teamName || '') || '').toLowerCase().trim();
        
        return rLocationId === locationId && 
               rDate === date && 
               rWorker === worker &&
               rTeam === team;
      });
      
      if (matchingRaw.length === 0) {
        hoursComparison.rawDataMissing.push({
          location: excelRecords[0].location,
          date,
          worker: excelRecords[0].worker,
          team: excelRecords[0].team,
          excelHours: excelTotalHours,
          dbHours: 0
        });
      } else {
        // Calculate DB hours from raw data
        const dbHours = matchingRaw.reduce((sum: number, r: any) => {
          const extracted = r.extracted || {};
          const raw = r.rawApiResponse || {};
          const startTime = extracted.start || extracted.start_time || raw.start || raw.start_time;
          const endTime = extracted.end || extracted.end_time || raw.end || raw.end_time;
          const breakMinutes = extracted.breakMinutes || extracted.break_minutes || raw.break_minutes || raw.breakMinutes || 0;
          
          if (startTime && endTime) {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end.getTime() - start.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return sum + Math.max(0, diffHours - (breakMinutes / 60));
          }
          return sum + (parseFloat(extracted.workedHours) || parseFloat(extracted.worked_hours) || parseFloat(raw.hours_worked) || 0);
        }, 0);
        
        const difference = Math.abs(excelTotalHours - dbHours);
        const percentDiff = dbHours > 0 ? (difference / dbHours) * 100 : (excelTotalHours > 0 ? 100 : 0);
        
        if (difference > 0.1) {
          hoursComparison.rawDataMismatches.push({
            location: excelRecords[0].location,
            date,
            worker: excelRecords[0].worker,
            team: excelRecords[0].team,
            excelHours: excelTotalHours,
            dbHours: Math.round(dbHours * 100) / 100,
            difference: Math.round(difference * 100) / 100,
            percentDiff: Math.round(percentDiff * 100) / 100,
            matchingRecordsCount: matchingRaw.length,
            sampleRawRecord: matchingRaw[0] ? {
              hasStartEnd: !!(matchingRaw[0].extracted?.start || matchingRaw[0].rawApiResponse?.start),
              hasWorkedHours: !!(matchingRaw[0].extracted?.workedHours || matchingRaw[0].rawApiResponse?.hours_worked),
              userId: matchingRaw[0].extracted?.userId || matchingRaw[0].rawApiResponse?.user_id
            } : null
          });
        } else {
          hoursComparison.rawDataMatches++;
        }
      }
    });
    
    // Step 4: Compare Hours - Excel vs Aggregated Data
    console.log('[Compare] Comparing hours: Excel vs processed_hours_aggregated...');
    const aggregatedHoursComparison = {
      excelTotal: excelHoursRecords.length,
      aggregatedMatches: 0,
      aggregatedMissing: [] as any[],
      aggregatedMismatches: [] as any[]
    };
    
    const aggregatedRecords = await db.collection('processed_hours_aggregated')
      .find({
        locationId: { $in: locationIds },
        date: { $in: dates }
      })
      .toArray();
    
    console.log(`[Compare] Found ${aggregatedRecords.length} aggregated hours records`);
    
    excelHoursMap.forEach((excelRecords, key) => {
      const excelTotalHours = excelRecords.reduce((sum, r) => sum + r.hours, 0);
      const [locationId, date, worker, team] = key.split('_');
      
      const matchingAggregated = aggregatedRecords.filter((r: any) => {
        const rLocationId = (r.locationId instanceof ObjectId ? r.locationId.toString() : String(r.locationId));
        const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
        const rWorker = (r.userName || r.user_name || '').toLowerCase().trim();
        const rTeam = ((r.teamName || r.team_name || '') || '').toLowerCase().trim();
        
        return rLocationId === locationId && 
               rDate === date && 
               rWorker === worker &&
               rTeam === team;
      });
      
      if (matchingAggregated.length === 0) {
        aggregatedHoursComparison.aggregatedMissing.push({
          location: excelRecords[0].location,
          date,
          worker: excelRecords[0].worker,
          team: excelRecords[0].team,
          excelHours: excelTotalHours,
          dbHours: 0
        });
      } else {
        const dbHours = matchingAggregated.reduce((sum: number, r: any) => {
          return sum + (parseFloat(r.hoursWorked) || parseFloat(r.hours_worked) || parseFloat(r.workedHours) || 0);
        }, 0);
        
        const difference = Math.abs(excelTotalHours - dbHours);
        if (difference > 0.1) {
          aggregatedHoursComparison.aggregatedMismatches.push({
            location: excelRecords[0].location,
            date,
            worker: excelRecords[0].worker,
            team: excelRecords[0].team,
            excelHours: excelTotalHours,
            dbHours,
            difference
          });
        } else {
          aggregatedHoursComparison.aggregatedMatches++;
        }
      }
    });
    
    // Sample analysis: Show first 10 mismatches with details
    const sampleMismatches = hoursComparison.rawDataMismatches.slice(0, 10);
    const sampleMissing = hoursComparison.rawDataMissing.slice(0, 10);
    
    return NextResponse.json({
      success: true,
      summary: {
        excelHoursRecords: excelHoursRecords.length,
        excelFinanceRecords: excelFinanceRecords.length,
        locationsFound: locationMap.size,
        uniqueExcelWorkers: excelHoursMap.size
      },
      hoursComparison: {
        rawData: {
          ...hoursComparison,
          matchRate: excelHoursMap.size > 0 ? ((hoursComparison.rawDataMatches / excelHoursMap.size) * 100).toFixed(1) + '%' : '0%',
          sampleMismatches,
          sampleMissing
        },
        aggregated: aggregatedHoursComparison
      },
      analysis: {
        question: 'Does our raw data (eitje_raw_data) match Excel (source of truth)?',
        answer: hoursComparison.rawDataMatches === excelHoursMap.size 
          ? 'YES - All Excel records match raw data' 
          : `NO - ${hoursComparison.rawDataMissing.length} missing, ${hoursComparison.rawDataMismatches.length} mismatches`,
        conclusion: hoursComparison.rawDataMissing.length > 0 || hoursComparison.rawDataMismatches.length > 0
          ? 'Our API is NOT capturing all data correctly. Some workers/dates are missing or hours don\'t match.'
          : 'Our API data matches Excel perfectly.'
      },
      financeComparison: {
        // TODO: Add finance comparison
        message: 'Finance comparison not yet implemented'
      }
    });
    
  } catch (error: any) {
    console.error('[Compare Excel vs DB] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to compare Excel vs DB',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

