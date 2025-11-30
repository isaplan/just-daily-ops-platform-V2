/**
 * Eitje Data Verifier Service
 * 
 * Wraps the Node.js verifier script to be importable in Next.js API routes
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const DATA_FOLDER = path.join(process.cwd(), 'dev-docs', 'eitje-data-check-30NOV2025');

export type DateFilter = 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all';

/**
 * Get date range for filter
 */
function getDateRange(filter: DateFilter): { startDate: Date; endDate: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'this-week': {
      const dayOfWeek = today.getDay();
      const startDate = new Date(today);
      // Monday = 1, so subtract (dayOfWeek || 7) - 1 to get Monday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(today.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    
    case 'this-month': {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    
    case 'last-month': {
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    
    case 'this-year': {
      const startDate = new Date(today.getFullYear(), 0, 1);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    
    case 'last-year': {
      const startDate = new Date(today.getFullYear() - 1, 0, 1);
      const endDate = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    
    case 'all':
    default:
      return null; // No filter
  }
}

/**
 * Filter records by date range
 */
function filterRecordsByDate<T extends { dateKey: string }>(records: T[], dateRange: { startDate: Date; endDate: Date } | null): T[] {
  if (!dateRange) return records;
  
  return records.filter(record => {
    const recordDate = new Date(record.dateKey);
    return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
  });
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try DD/MM/YYYY
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(dateStr));
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  
  // Try YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  }
  
  // Try Date.parse
  const parsed = Date.parse(String(dateStr));
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  
  return null;
}

/**
 * Find actual data header row (skip metadata)
 */
function findDataHeaderRow(allData: any[][], keywords: string[] = []): number {
  const dataKeywords = [
    'datum', 'date', 'vestiging', 'location', 'omzet', 'revenue', 
    'uren', 'hours', 'werknemer', 'worker', 'naam', 'name',
    'team', 'teamnaam', 'team_name', 'uurloon', 'hourly'
  ];
  
  const searchKeywords = keywords.length > 0 ? keywords : dataKeywords;
  
  for (let i = 0; i < Math.min(50, allData.length); i++) {
    const row = allData[i];
    if (row && row.length > 3) {
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join('|');
      const matchCount = searchKeywords.filter(kw => rowStr.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Parse finance Excel file
 */
function parseFinanceFile(filePath: string, filename: string) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('table')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headerRowIndex = findDataHeaderRow(allData, ['datum', 'date', 'vestiging', 'location', 'omzet', 'revenue']);
    
    if (headerRowIndex === -1) {
      return { success: false, error: 'Could not find data header row' };
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex,
      defval: null
    });
    
    const revenueData: any[] = [];
    const locationMap = new Map<string, any>();
    
    jsonData.forEach((row: any, idx: number) => {
      if (!row || Object.keys(row).length < 3) return;
      
      const columns = Object.keys(row);
      let dateCol = columns.find((c: string) => /datum|date/i.test(c));
      let locationCol = columns.find((c: string) => /vestiging|location|zaak/i.test(c));
      let revenueCol = columns.find((c: string) => /omzet|revenue|inkomsten|totaal/i.test(c));
      
      if (!revenueCol) {
        revenueCol = columns.find((c: string) => {
          const val = row[c];
          return typeof val === 'number' && val > 100;
        });
      }
      
      if (dateCol && locationCol && revenueCol) {
        const date = parseDate(row[dateCol]);
        const location = String(row[locationCol] || '').trim();
        const revenue = parseFloat(row[revenueCol]) || 0;
        
        if (date && location && revenue > 0) {
          const dateKey = date.toISOString().split('T')[0];
          const key = `${location}_${dateKey}`;
          
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              location,
              date,
              dateKey,
              revenue: 0,
              rowIndex: idx + headerRowIndex + 2
            });
          }
          
          locationMap.get(key)!.revenue += revenue;
        }
      }
    });
    
    return {
      success: true,
      filename,
      type: 'financien',
      totalRows: jsonData.length,
      revenueRecords: Array.from(locationMap.values()),
      sampleData: Array.from(locationMap.values()).slice(0, 5),
      columns: Object.keys(jsonData[0] || {})
    };
  } catch (error: any) {
    return { success: false, error: error.message, filename };
  }
}

/**
 * Parse worked hours Excel file
 */
function parseHoursFile(filePath: string, filename: string) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('table')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headerRowIndex = findDataHeaderRow(allData, ['datum', 'date', 'uren', 'hours', 'werknemer', 'worker', 'naam', 'name']);
    
    if (headerRowIndex === -1) {
      return { success: false, error: 'Could not find data header row' };
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex,
      defval: null
    });
    
    const locationDateMap = new Map<string, any>();
    
    jsonData.forEach((row: any, idx: number) => {
      if (!row || Object.keys(row).length < 3) return;
      
      const columns = Object.keys(row);
      let dateCol = columns.find((c: string) => /datum|date/i.test(c));
      let locationCol = columns.find((c: string) => /vestiging|location|zaak/i.test(c));
      let hoursCol = columns.find((c: string) => /uren|hours|gewerkte/i.test(c));
      let workerCol = columns.find((c: string) => /werknemer|worker|naam|name/i.test(c));
      let teamCol = columns.find((c: string) => /team|teamnaam/i.test(c));
      
      if (dateCol && locationCol && hoursCol) {
        const date = parseDate(row[dateCol]);
        const location = String(row[locationCol] || '').trim();
        const hours = parseFloat(row[hoursCol]) || 0;
        const worker = workerCol ? String(row[workerCol] || '').trim() : null;
        const team = teamCol ? String(row[teamCol] || '').trim() : null;
        
        if (date && location && hours > 0) {
          const dateKey = date.toISOString().split('T')[0];
          const key = `${location}_${dateKey}`;
          
          if (!locationDateMap.has(key)) {
            locationDateMap.set(key, {
              location,
              date,
              dateKey,
              totalHours: 0,
              workerCount: 0,
              workers: new Set<string>(),
              teams: new Set<string>(),
              records: []
            });
          }
          
          const entry = locationDateMap.get(key)!;
          entry.totalHours += hours;
          entry.records.push({ worker, team, hours, rowIndex: idx + headerRowIndex + 2 });
          if (worker) entry.workers.add(worker);
          if (team) entry.teams.add(team);
        }
      }
    });
    
    const hoursRecords = Array.from(locationDateMap.values()).map(entry => ({
      location: entry.location,
      date: entry.date,
      dateKey: entry.dateKey,
      totalHours: entry.totalHours,
      workerCount: entry.workers.size,
      teamCount: entry.teams.size,
      workers: Array.from(entry.workers),
      teams: Array.from(entry.teams),
      recordCount: entry.records.length
    }));
    
    return {
      success: true,
      filename,
      type: 'gewerkte-uren',
      totalRows: jsonData.length,
      hoursRecords,
      sampleData: hoursRecords.slice(0, 5),
      columns: Object.keys(jsonData[0] || {})
    };
  } catch (error: any) {
    return { success: false, error: error.message, filename };
  }
}

/**
 * Build location name to ID map (batch load all locations once)
 */
async function buildLocationMap(db: any): Promise<Map<string, ObjectId>> {
  const locations = await db.collection('locations')
    .find({ isActive: true })
    .toArray();
  
  const locationMap = new Map<string, ObjectId>();
  
  locations.forEach((loc: any) => {
    const name = loc.name?.toLowerCase().trim();
    if (name) {
      locationMap.set(name, loc._id);
      // Also add variations (remove extra spaces, etc.)
      const normalized = name.replace(/\s+/g, ' ').trim();
      if (normalized !== name) {
        locationMap.set(normalized, loc._id);
      }
    }
  });
  
  return locationMap;
}

/**
 * Get location ID from name using pre-built map
 */
function getLocationId(locationMap: Map<string, ObjectId>, locationName: string): ObjectId | null {
  const normalized = locationName.toLowerCase().trim();
  return locationMap.get(normalized) || null;
}

/**
 * Verify finance data against eitje_aggregated (optimized with batch loading)
 */
async function verifyFinanceData(db: any, financeRecords: any[], locationMap: Map<string, ObjectId>) {
  const verifications: any[] = [];
  const discrepancies: any[] = [];
  
  if (financeRecords.length === 0) {
    return { verifications, discrepancies };
  }
  
  // Extract unique location IDs and date range
  const locationIds = new Set<ObjectId>();
  const dateKeys = new Set<string>();
  const recordMap = new Map<string, any>();
  
  financeRecords.forEach(record => {
    const locationId = getLocationId(locationMap, record.location);
    if (locationId) {
      locationIds.add(locationId);
      dateKeys.add(record.dateKey);
      const key = `${locationId.toString()}_${record.dateKey}`;
      if (!recordMap.has(key)) {
        recordMap.set(key, []);
      }
      recordMap.get(key)!.push(record);
    } else {
      discrepancies.push({
        type: 'missing_location',
        location: record.location,
        date: record.dateKey,
        excelRevenue: record.revenue,
        message: `Location "${record.location}" not found in database`
      });
    }
  });
  
  if (locationIds.size === 0) {
    return { verifications, discrepancies };
  }
  
  // Batch load all eitje_aggregated records for the date range
  const minDate = new Date(Math.min(...Array.from(dateKeys).map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...Array.from(dateKeys).map(d => new Date(d + 'T23:59:59.999Z').getTime())));
  
  const dbRecords = await db.collection('eitje_aggregated')
    .find({
      locationId: { $in: Array.from(locationIds) },
      date: { $gte: minDate, $lte: maxDate }
    })
    .toArray();
  
  // Build lookup map: locationId_dateKey -> dbRecord
  const dbRecordMap = new Map<string, any>();
  dbRecords.forEach((dbRecord: any) => {
    const dateKey = new Date(dbRecord.date).toISOString().split('T')[0];
    const key = `${dbRecord.locationId.toString()}_${dateKey}`;
    dbRecordMap.set(key, dbRecord);
  });
  
  // Process all records
  recordMap.forEach((records, key) => {
    const dbRecord = dbRecordMap.get(key);
    
    records.forEach((record: any) => {
      const locationId = getLocationId(locationMap, record.location);
      if (!locationId) return;
      
      if (!dbRecord) {
        discrepancies.push({
          type: 'missing_data',
          location: record.location,
          locationId: locationId.toString(),
          date: record.dateKey,
          excelRevenue: record.revenue,
          dbRevenue: null,
          difference: record.revenue,
          message: `No aggregated record found for ${record.location} on ${record.dateKey}`
        });
        return;
      }
      
      const excelRevenue = record.revenue;
      const dbRevenue = dbRecord.totalRevenue || 0;
      const difference = Math.abs(excelRevenue - dbRevenue);
      const percentDiff = dbRevenue > 0 ? (difference / dbRevenue) * 100 : 100;
      
      const isMatch = difference < 1 || percentDiff < 1;
      
      verifications.push({
        location: record.location,
        locationId: locationId.toString(),
        date: record.dateKey,
        excelRevenue,
        dbRevenue,
        difference,
        percentDiff: percentDiff.toFixed(2),
        isMatch,
        dbHours: dbRecord.totalHoursWorked || 0,
        dbWageCost: dbRecord.totalWageCost || 0,
        dbRevenuePerHour: dbRecord.revenuePerHour || 0,
        dbLaborCostPercentage: dbRecord.laborCostPercentage || 0
      });
      
      if (!isMatch) {
        discrepancies.push({
          type: 'revenue_mismatch',
          location: record.location,
          locationId: locationId.toString(),
          date: record.dateKey,
          excelRevenue,
          dbRevenue,
          difference,
          percentDiff: percentDiff.toFixed(2),
          message: `Revenue mismatch: Excel ${excelRevenue.toFixed(2)}€ vs DB ${dbRevenue.toFixed(2)}€ (${percentDiff.toFixed(2)}% difference)`
        });
      }
    });
  });
  
  return { verifications, discrepancies };
}

/**
 * Verify hours data against eitje_aggregated (optimized with batch loading)
 */
async function verifyHoursData(db: any, hoursRecords: any[], locationMap: Map<string, ObjectId>) {
  const verifications: any[] = [];
  const discrepancies: any[] = [];
  
  if (hoursRecords.length === 0) {
    return { verifications, discrepancies };
  }
  
  // Extract unique location IDs and date range
  const locationIds = new Set<ObjectId>();
  const dateKeys = new Set<string>();
  const recordMap = new Map<string, any>();
  
  hoursRecords.forEach(record => {
    const locationId = getLocationId(locationMap, record.location);
    if (locationId) {
      locationIds.add(locationId);
      dateKeys.add(record.dateKey);
      const key = `${locationId.toString()}_${record.dateKey}`;
      if (!recordMap.has(key)) {
        recordMap.set(key, []);
      }
      recordMap.get(key)!.push(record);
    } else {
      discrepancies.push({
        type: 'missing_location',
        location: record.location,
        date: record.dateKey,
        excelHours: record.totalHours,
        message: `Location "${record.location}" not found in database`
      });
    }
  });
  
  if (locationIds.size === 0) {
    return { verifications, discrepancies };
  }
  
  // Batch load all eitje_aggregated records for the date range
  const minDate = new Date(Math.min(...Array.from(dateKeys).map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...Array.from(dateKeys).map(d => new Date(d + 'T23:59:59.999Z').getTime())));
  
  const dbRecords = await db.collection('eitje_aggregated')
    .find({
      locationId: { $in: Array.from(locationIds) },
      date: { $gte: minDate, $lte: maxDate }
    })
    .toArray();
  
  // Build lookup map: locationId_dateKey -> dbRecord
  const dbRecordMap = new Map<string, any>();
  dbRecords.forEach((dbRecord: any) => {
    const dateKey = new Date(dbRecord.date).toISOString().split('T')[0];
    const key = `${dbRecord.locationId.toString()}_${dateKey}`;
    dbRecordMap.set(key, dbRecord);
  });
  
  // Process all records
  recordMap.forEach((records, key) => {
    const dbRecord = dbRecordMap.get(key);
    
    records.forEach((record: any) => {
      const locationId = getLocationId(locationMap, record.location);
      if (!locationId) return;
      
      if (!dbRecord) {
        discrepancies.push({
          type: 'missing_data',
          location: record.location,
          locationId: locationId.toString(),
          date: record.dateKey,
          excelHours: record.totalHours,
          dbHours: null,
          difference: record.totalHours,
          message: `No aggregated record found for ${record.location} on ${record.dateKey}`
        });
        return;
      }
      
      const excelHours = record.totalHours;
      const dbHours = dbRecord.totalHoursWorked || 0;
      const difference = Math.abs(excelHours - dbHours);
      const percentDiff = dbHours > 0 ? (difference / dbHours) * 100 : 100;
      
      const isMatch = difference < 0.5 || percentDiff < 5;
      
      verifications.push({
        location: record.location,
        locationId: locationId.toString(),
        date: record.dateKey,
        excelHours,
        dbHours,
        difference,
        percentDiff: percentDiff.toFixed(2),
        isMatch,
        workerCount: record.workerCount,
        teamCount: record.teamCount,
        dbRevenue: dbRecord.totalRevenue || 0,
        dbWageCost: dbRecord.totalWageCost || 0,
        dbRevenuePerHour: dbRecord.revenuePerHour || 0,
        dbLaborCostPercentage: dbRecord.laborCostPercentage || 0
      });
      
      if (!isMatch) {
        discrepancies.push({
          type: 'hours_mismatch',
          location: record.location,
          locationId: locationId.toString(),
          date: record.dateKey,
          excelHours,
          dbHours,
          difference,
          percentDiff: percentDiff.toFixed(2),
          message: `Hours mismatch: Excel ${excelHours.toFixed(2)}h vs DB ${dbHours.toFixed(2)}h (${percentDiff.toFixed(2)}% difference)`
        });
      }
    });
  });
  
  return { verifications, discrepancies };
}

/**
 * Main verification function
 */
export async function verifyEitjeData(dateFilter: DateFilter = 'all') {
  const db = await getDatabase();
  
  if (!fs.existsSync(DATA_FOLDER)) {
    return { success: false, error: 'Data folder not found' };
  }
  
  const files = fs.readdirSync(DATA_FOLDER)
    .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
  
  const financeFiles: any[] = [];
  const hoursFiles: any[] = [];
  
  for (const file of files) {
    const filePath = path.join(DATA_FOLDER, file);
    const lower = file.toLowerCase();
    
    if (lower.includes('financien')) {
      const parsed = parseFinanceFile(filePath, file);
      if (parsed.success) {
        financeFiles.push(parsed);
      }
    } else if (lower.includes('gewerkte-uren')) {
      const parsed = parseHoursFile(filePath, file);
      if (parsed.success) {
        hoursFiles.push(parsed);
      }
    }
  }
  
  const allFinanceRecords: any[] = [];
  financeFiles.forEach(file => {
    file.revenueRecords.forEach((record: any) => {
      allFinanceRecords.push({ ...record, sourceFile: file.filename });
    });
  });
  
  const allHoursRecords: any[] = [];
  hoursFiles.forEach(file => {
    file.hoursRecords.forEach((record: any) => {
      allHoursRecords.push({ ...record, sourceFile: file.filename });
    });
  });
  
  // Apply date filter
  const dateRange = getDateRange(dateFilter);
  const filteredFinanceRecords = filterRecordsByDate(allFinanceRecords, dateRange);
  const filteredHoursRecords = filterRecordsByDate(allHoursRecords, dateRange);
  
  // Build location map once (batch load)
  const locationMap = await buildLocationMap(db);
  
  // Verify in parallel (both use the same location map)
  const [financeVerification, hoursVerification] = await Promise.all([
    verifyFinanceData(db, filteredFinanceRecords, locationMap),
    verifyHoursData(db, filteredHoursRecords, locationMap)
  ]);
  
  const totalVerified = financeVerification.verifications.length + hoursVerification.verifications.length;
  const totalDiscrepancies = financeVerification.discrepancies.length + hoursVerification.discrepancies.length;
  const matchCount = financeVerification.verifications.filter((v: any) => v.isMatch).length + 
                    hoursVerification.verifications.filter((v: any) => v.isMatch).length;
  
  return {
    success: true,
    summary: {
      totalVerified,
      matchCount,
      discrepancyCount: totalDiscrepancies
    },
    finance: {
      files: financeFiles.length,
      records: allFinanceRecords.length,
      verifications: financeVerification.verifications,
      discrepancies: financeVerification.discrepancies
    },
    hours: {
      files: hoursFiles.length,
      records: allHoursRecords.length,
      verifications: hoursVerification.verifications,
      discrepancies: hoursVerification.discrepancies
    }
  };
}

