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
      let hoursCol = columns.find((c: string) => /uren|hours|gewerkte/i.test(c));
      let wageCostCol = columns.find((c: string) => /loonkosten|wage|cost|arbeidskosten/i.test(c));
      let revenuePerHourCol = columns.find((c: string) => /revenue.*hour|omzet.*uur|productiviteit|productivity/i.test(c));
      let laborCostPercentCol = columns.find((c: string) => /labor.*cost.*%|loonkosten.*%|arbeidskosten.*%/i.test(c));
      
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
        const hours = hoursCol ? parseFloat(row[hoursCol]) || 0 : 0;
        const wageCost = wageCostCol ? parseFloat(row[wageCostCol]) || 0 : 0;
        const revenuePerHour = revenuePerHourCol ? parseFloat(row[revenuePerHourCol]) || 0 : (hours > 0 ? revenue / hours : 0);
        const laborCostPercentage = laborCostPercentCol ? parseFloat(row[laborCostPercentCol]) || 0 : (revenue > 0 ? (wageCost / revenue) * 100 : 0);
        
        if (date && location && revenue > 0) {
          const dateKey = date.toISOString().split('T')[0];
          const key = `${location}_${dateKey}`;
          
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              location,
              date,
              dateKey,
              revenue: 0,
              hours: 0,
              wageCost: 0,
              revenuePerHour: 0,
              laborCostPercentage: 0,
              rowIndex: idx + headerRowIndex + 2
            });
          }
          
          const entry = locationMap.get(key)!;
          entry.revenue += revenue;
          if (hours > 0) entry.hours += hours;
          if (wageCost > 0) entry.wageCost += wageCost;
          // Recalculate productivity metrics after aggregation
          entry.revenuePerHour = entry.hours > 0 ? entry.revenue / entry.hours : 0;
          entry.laborCostPercentage = entry.revenue > 0 ? (entry.wageCost / entry.revenue) * 100 : 0;
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
    
    // Keep both aggregated and worker-level records
    const hoursRecords = Array.from(locationDateMap.values()).map(entry => ({
      location: entry.location,
      date: entry.date,
      dateKey: entry.dateKey,
      totalHours: entry.totalHours,
      workerCount: entry.workers.size,
      teamCount: entry.teams.size,
      workers: Array.from(entry.workers),
      teams: Array.from(entry.teams),
      recordCount: entry.records.length,
      // Keep worker-level records for detailed verification
      workerRecords: entry.records, // Array of { worker, team, hours, rowIndex }
      sourceFile: filename // Track which file this came from
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
  
  console.log(`[Finance Verification] Starting verification with ${financeRecords.length} finance records`);
  
  if (financeRecords.length === 0) {
    console.log(`[Finance Verification] No finance records to verify - returning empty results`);
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
  
  // Process all records - aggregate by location/date first to avoid duplicates
  recordMap.forEach((records, key) => {
    const dbRecord = dbRecordMap.get(key);
    
    // Aggregate all records with the same location/date (from multiple files)
    const firstRecord = records[0];
    const locationId = getLocationId(locationMap, firstRecord.location);
    if (!locationId) return;
    
    // Aggregate all finance data for this location/date
    const aggregatedExcelRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const aggregatedExcelHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);
    const aggregatedExcelWageCost = records.reduce((sum, r) => sum + (r.wageCost || 0), 0);
    
    // Calculate productivity from Excel data (use Excel hours if available, otherwise use DB hours)
    // Finance files may have pre-calculated productivity, or we calculate from revenue/hours
    const excelRevenuePerHour = aggregatedExcelHours > 0 
      ? aggregatedExcelRevenue / aggregatedExcelHours 
      : (records[0]?.revenuePerHour || 0);
    const excelLaborCostPercentage = aggregatedExcelRevenue > 0
      ? (aggregatedExcelWageCost / aggregatedExcelRevenue) * 100
      : (records[0]?.laborCostPercentage || 0);
    
    if (!dbRecord) {
      discrepancies.push({
        type: 'missing_data',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelRevenue: aggregatedExcelRevenue,
        dbRevenue: null,
        difference: aggregatedExcelRevenue,
        message: `No aggregated record found for ${firstRecord.location} on ${firstRecord.dateKey}`
      });
      return;
    }
    
    const dbRevenue = dbRecord.totalRevenue || 0;
    const dbHours = dbRecord.totalHoursWorked || 0;
    const dbWageCost = dbRecord.totalWageCost || 0;
    const dbRevenuePerHour = dbRecord.revenuePerHour || 0;
    const dbLaborCostPercentage = dbRecord.laborCostPercentage || 0;
    
    // Verify revenue match
    const revenueDifference = Math.abs(aggregatedExcelRevenue - dbRevenue);
    const revenuePercentDiff = dbRevenue > 0 ? (revenueDifference / dbRevenue) * 100 : 100;
    const revenueMatch = revenueDifference < 1 || revenuePercentDiff < 1;
    
    // Verify productivity metrics (revenue/hour and labor cost %)
    // Use DB hours for calculation if Excel hours not available
    const calculatedExcelRevenuePerHour = aggregatedExcelHours > 0 
      ? aggregatedExcelRevenue / aggregatedExcelHours 
      : (dbHours > 0 ? aggregatedExcelRevenue / dbHours : 0);
    
    const revenuePerHourDifference = Math.abs(calculatedExcelRevenuePerHour - dbRevenuePerHour);
    const revenuePerHourPercentDiff = dbRevenuePerHour > 0 ? (revenuePerHourDifference / dbRevenuePerHour) * 100 : 100;
    const revenuePerHourMatch = revenuePerHourDifference < 1 || revenuePerHourPercentDiff < 1;
    
    const calculatedExcelLaborCostPercentage = aggregatedExcelRevenue > 0
      ? (aggregatedExcelWageCost > 0 ? (aggregatedExcelWageCost / aggregatedExcelRevenue) * 100 : (dbWageCost / aggregatedExcelRevenue) * 100)
      : 0;
    
    const laborCostPercentDifference = Math.abs(calculatedExcelLaborCostPercentage - dbLaborCostPercentage);
    const laborCostPercentMatch = laborCostPercentDifference < 1;
    
    const isMatch = revenueMatch && revenuePerHourMatch && laborCostPercentMatch;
    
    // Create only ONE verification entry per location/date
    verifications.push({
      location: firstRecord.location,
      locationId: locationId.toString(),
      date: firstRecord.dateKey,
      excelRevenue: aggregatedExcelRevenue,
      dbRevenue,
      difference: revenueDifference,
      percentDiff: revenuePercentDiff.toFixed(2),
      isMatch,
      dbHours,
      dbWageCost,
      dbRevenuePerHour,
      dbLaborCostPercentage,
      // Productivity verification metrics
      excelHours: aggregatedExcelHours,
      excelWageCost: aggregatedExcelWageCost,
      excelRevenuePerHour: calculatedExcelRevenuePerHour,
      excelLaborCostPercentage: calculatedExcelLaborCostPercentage,
      revenuePerHourDifference: revenuePerHourDifference,
      revenuePerHourPercentDiff: revenuePerHourPercentDiff.toFixed(2),
      laborCostPercentDifference: laborCostPercentDifference.toFixed(2),
      revenueMatch,
      revenuePerHourMatch,
      laborCostPercentMatch
    });
    
    if (!revenueMatch) {
      discrepancies.push({
        type: 'revenue_mismatch',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelRevenue: aggregatedExcelRevenue,
        dbRevenue,
        difference: revenueDifference,
        percentDiff: revenuePercentDiff.toFixed(2),
        message: `Revenue mismatch: Excel ${aggregatedExcelRevenue.toFixed(2)}€ vs DB ${dbRevenue.toFixed(2)}€ (${revenuePercentDiff.toFixed(2)}% difference)`
      });
    }
    
    if (!revenuePerHourMatch) {
      discrepancies.push({
        type: 'productivity_mismatch',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelRevenuePerHour: calculatedExcelRevenuePerHour,
        dbRevenuePerHour: dbRevenuePerHour,
        difference: revenuePerHourDifference,
        percentDiff: revenuePerHourPercentDiff.toFixed(2),
        message: `Productivity mismatch: Excel ${calculatedExcelRevenuePerHour.toFixed(2)}€/h vs DB ${dbRevenuePerHour.toFixed(2)}€/h (${revenuePerHourPercentDiff.toFixed(2)}% difference)`
      });
    }
    
    if (!laborCostPercentMatch) {
      discrepancies.push({
        type: 'labor_cost_mismatch',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelLaborCostPercentage: calculatedExcelLaborCostPercentage,
        dbLaborCostPercentage: dbLaborCostPercentage,
        difference: laborCostPercentDifference,
        message: `Labor cost % mismatch: Excel ${calculatedExcelLaborCostPercentage.toFixed(2)}% vs DB ${dbLaborCostPercentage.toFixed(2)}% (${laborCostPercentDifference.toFixed(2)}% difference)`
      });
    }
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
  
  // Process all records - aggregate by location/date first to avoid duplicates
  recordMap.forEach((records, key) => {
    const dbRecord = dbRecordMap.get(key);
    
    // Aggregate all records with the same location/date (from multiple files)
    const firstRecord = records[0];
    const locationId = getLocationId(locationMap, firstRecord.location);
    if (!locationId) return;
    
    // Sum hours and combine worker/team counts across all records for this location/date
    const aggregatedExcelHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const allWorkers = new Set<string>();
    const allTeams = new Set<string>();
    records.forEach(r => {
      if (r.workers && Array.isArray(r.workers)) {
        r.workers.forEach((w: string) => allWorkers.add(w));
      }
      if (r.teams && Array.isArray(r.teams)) {
        r.teams.forEach((t: string) => allTeams.add(t));
      }
    });
    
    if (!dbRecord) {
      discrepancies.push({
        type: 'missing_data',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelHours: aggregatedExcelHours,
        dbHours: null,
        difference: aggregatedExcelHours,
        message: `No aggregated record found for ${firstRecord.location} on ${firstRecord.dateKey}`
      });
      return;
    }
    
    const dbHours = dbRecord.totalHoursWorked || 0;
    const difference = Math.abs(aggregatedExcelHours - dbHours);
    const percentDiff = dbHours > 0 ? (difference / dbHours) * 100 : 100;
    
    const isMatch = difference < 0.5 || percentDiff < 5;
    
    // Create only ONE verification entry per location/date
    verifications.push({
      location: firstRecord.location,
      locationId: locationId.toString(),
      date: firstRecord.dateKey,
      excelHours: aggregatedExcelHours,
      dbHours,
      difference,
      percentDiff: percentDiff.toFixed(2),
      isMatch,
      workerCount: allWorkers.size || firstRecord.workerCount || 0,
      teamCount: allTeams.size || firstRecord.teamCount || 0,
      dbRevenue: dbRecord.totalRevenue || 0,
      dbWageCost: dbRecord.totalWageCost || 0,
      dbRevenuePerHour: dbRecord.revenuePerHour || 0,
      dbLaborCostPercentage: dbRecord.laborCostPercentage || 0
    });
    
    if (!isMatch) {
      discrepancies.push({
        type: 'hours_mismatch',
        location: firstRecord.location,
        locationId: locationId.toString(),
        date: firstRecord.dateKey,
        excelHours: aggregatedExcelHours,
        dbHours,
        difference,
        percentDiff: percentDiff.toFixed(2),
        message: `Hours mismatch: Excel ${aggregatedExcelHours.toFixed(2)}h vs DB ${dbHours.toFixed(2)}h (${percentDiff.toFixed(2)}% difference)`
      });
    }
  });
  
  return { verifications, discrepancies };
}

/**
 * Verify worker-level hours data (per worker per day)
 * ONLY uses "gewerkte uren" (worked hours) Excel files - NOT finance files
 */
async function verifyWorkerLevelHours(db: any, hoursRecords: any[], locationMap: Map<string, ObjectId>) {
  const workerVerifications: any[] = [];
  const workerDiscrepancies: any[] = [];
  
  if (hoursRecords.length === 0) {
    console.log('[Worker-Level Verification] No hours records found - only using "gewerkte uren" Excel files');
    return { workerVerifications, workerDiscrepancies };
  }
  
  console.log(`[Worker-Level Verification] Using ONLY "gewerkte uren" Excel files (${hoursRecords.length} location/date records)`);
  
  // Collect all worker records from Excel (ONLY from "gewerkte uren" files)
  const excelWorkerRecords: Array<{ location: string; locationId: ObjectId; date: string; dateKey: string; worker: string; team: string | null; hours: number; sourceFile: string }> = [];
  
  hoursRecords.forEach(record => {
    const locationId = getLocationId(locationMap, record.location);
    if (!locationId || !record.workerRecords || !Array.isArray(record.workerRecords)) return;
    
    record.workerRecords.forEach((workerRecord: any) => {
      if (workerRecord.worker && workerRecord.hours > 0) {
        excelWorkerRecords.push({
          location: record.location,
          locationId,
          date: record.dateKey,
          dateKey: record.dateKey,
          worker: workerRecord.worker,
          team: workerRecord.team || null,
          hours: workerRecord.hours,
          sourceFile: record.sourceFile || 'unknown'
        });
      }
    });
  });
  
  if (excelWorkerRecords.length === 0) {
    return { workerVerifications, workerDiscrepancies };
  }
  
  // Get date range (as YYYY-MM-DD strings)
  const dateKeys = Array.from(new Set(excelWorkerRecords.map(r => r.dateKey))).sort();
  const minDateStr = dateKeys[0];
  const maxDateStr = dateKeys[dateKeys.length - 1];
  
  // Get location IDs
  const locationIds = Array.from(new Set(excelWorkerRecords.map(r => r.locationId)));
  
  console.log(`[Worker-Level Verification] Querying processed_hours_aggregated for ${dateKeys.length} dates, ${locationIds.length} locations`);
  console.log(`[Worker-Level Verification] Date range: ${minDateStr} to ${maxDateStr}`);
  console.log(`[Worker-Level Verification] Excel worker records: ${excelWorkerRecords.length}`);
  
  // Query processed_hours_aggregated for worker-level hours
  // Date field is stored as YYYY-MM-DD string in processed_hours_aggregated
  const dbWorkerRecords = await db.collection('processed_hours_aggregated')
    .find({
      locationId: { $in: locationIds },
      date: { $in: dateKeys } // Use exact date match (date is stored as string YYYY-MM-DD)
    })
    .toArray();
  
  console.log(`[Worker-Level Verification] Found ${dbWorkerRecords.length} DB worker records from processed_hours_aggregated`);
  
  // Diagnostic: Check raw and aggregated data for November 2025
  const nov2025Dates = dateKeys.filter(d => d.startsWith('2025-11'));
  const diagnostics: any = {
    november2025: null
  };
  
  if (nov2025Dates.length > 0) {
    console.log(`[Worker-Level Verification] Running diagnostics for November 2025 (${nov2025Dates.length} dates)`);
    
    // Check eitje_raw_data
    const rawDataQuery = {
      locationId: { $in: locationIds },
      endpoint: 'time_registration_shifts',
      $or: [
        { date: { $in: nov2025Dates.map(d => new Date(d)) } },
        { 'extracted.date': { $in: nov2025Dates } }
      ]
    };
    const rawDataCount = await db.collection('eitje_raw_data').countDocuments(rawDataQuery);
    
    // Get sample raw data to check structure
    const rawDataSample = await db.collection('eitje_raw_data')
      .find(rawDataQuery)
      .limit(5)
      .toArray();
    
    // Check processed_hours_aggregated
    const processedCount = await db.collection('processed_hours_aggregated')
      .countDocuments({
        locationId: { $in: locationIds },
        date: { $in: nov2025Dates }
      });
    
    // Get unique workers from processed_hours_aggregated for Nov 2025
    const processedWorkers = await db.collection('processed_hours_aggregated')
      .distinct('userName', {
        locationId: { $in: locationIds },
        date: { $in: nov2025Dates }
      });
    
    // Check eitje_aggregated (daily totals)
    const aggregatedCount = await db.collection('eitje_aggregated')
      .countDocuments({
        locationId: { $in: locationIds },
        date: { $in: nov2025Dates.map(d => new Date(d)) }
      });
    
    // Get Excel workers for Nov 2025
    const excelNov2025Workers = excelWorkerRecords
      .filter(r => r.dateKey.startsWith('2025-11'))
      .map(r => r.worker.toLowerCase().trim());
    const uniqueExcelWorkers = Array.from(new Set(excelNov2025Workers));
    
    // Get DB workers for Nov 2025 (from processed_hours_aggregated)
    const dbNov2025Workers = processedWorkers.map((w: string) => w.toLowerCase().trim());
    
    // Find missing workers (in Excel but not in DB)
    const missingWorkers = uniqueExcelWorkers.filter(excelWorker => 
      !dbNov2025Workers.some(dbWorker => 
        dbWorker === excelWorker || 
        dbWorker.includes(excelWorker) || 
        excelWorker.includes(dbWorker)
      )
    );
    
    diagnostics.november2025 = {
      dates: nov2025Dates.length,
      excelWorkers: uniqueExcelWorkers.length,
      dbWorkers: dbNov2025Workers.length,
      missingWorkers: missingWorkers.length,
      missingWorkerNames: missingWorkers.slice(0, 20), // First 20 missing workers
      rawDataRecords: rawDataCount,
      processedRecords: processedCount,
      aggregatedRecords: aggregatedCount,
      rawDataSample: rawDataSample.length > 0 ? {
        hasData: true,
        sampleDate: rawDataSample[0].date,
        sampleEndpoint: rawDataSample[0].endpoint,
        hasExtracted: !!rawDataSample[0].extracted
      } : { hasData: false },
      mismatchAnalysis: null // Will be populated after verification
    };
    
    console.log(`[Worker-Level Verification] November 2025 Diagnostics:`);
    console.log(`  - Excel workers: ${uniqueExcelWorkers.length}`);
    console.log(`  - DB workers (processed_hours_aggregated): ${dbNov2025Workers.length}`);
    console.log(`  - Missing workers: ${missingWorkers.length}`);
    console.log(`  - Raw data records: ${rawDataCount}`);
    console.log(`  - Processed records: ${processedCount}`);
    console.log(`  - Aggregated records: ${aggregatedCount}`);
    if (missingWorkers.length > 0) {
      console.log(`  - Missing worker names (first 10): ${missingWorkers.slice(0, 10).join(', ')}`);
    }
  }
  
  // Build lookup map: locationId_dateKey_workerName_teamName -> dbRecord
  // Match Excel structure: one worker per day per location per team
  const dbWorkerMap = new Map<string, any>();
  dbWorkerRecords.forEach((dbRecord: any) => {
    // Date is stored as YYYY-MM-DD string in processed_hours_aggregated
    const dateKey = dbRecord.date instanceof Date 
      ? dbRecord.date.toISOString().split('T')[0]
      : String(dbRecord.date).split('T')[0].substring(0, 10); // Ensure YYYY-MM-DD format
    const workerName = (dbRecord.userName || dbRecord.user_name || dbRecord.name || '').trim();
    const teamName = ((dbRecord.teamName || dbRecord.team_name || '').trim()).toLowerCase();
    if (workerName && dbRecord.locationId) {
      const locationIdStr = dbRecord.locationId instanceof ObjectId 
        ? dbRecord.locationId.toString() 
        : String(dbRecord.locationId);
      // Key includes team to match Excel structure
      const key = `${locationIdStr}_${dateKey}_${workerName.toLowerCase().trim()}_${teamName}`;
      if (!dbWorkerMap.has(key)) {
        dbWorkerMap.set(key, []);
      }
      dbWorkerMap.get(key)!.push(dbRecord);
    }
  });
  
  console.log(`[Worker-Level Verification] Built DB worker map with ${dbWorkerMap.size} unique worker/date/location combinations`);
  
  // Aggregate Excel worker records by location/date/worker/team
  // There can only be ONE worker per day per location per team
  const excelWorkerMap = new Map<string, any>();
  const duplicateKeys = new Set<string>();
  
  excelWorkerRecords.forEach(excelRecord => {
    const locationIdStr = excelRecord.locationId instanceof ObjectId 
      ? excelRecord.locationId.toString() 
      : String(excelRecord.locationId);
    const workerName = excelRecord.worker.trim();
    const teamName = (excelRecord.team || '').trim().toLowerCase();
    // Key includes team to ensure uniqueness: location_date_worker_team
    const key = `${locationIdStr}_${excelRecord.dateKey}_${workerName.toLowerCase().trim()}_${teamName}`;
    
    if (excelWorkerMap.has(key)) {
      // Duplicate found - this shouldn't happen if Excel is correct
      duplicateKeys.add(key);
      console.warn(`[Worker-Level Verification] Duplicate worker record found: ${key} - Excel may have duplicate rows`);
      // Take the maximum hours (or could take first/last - but max seems safer)
      const existing = excelWorkerMap.get(key)!;
      existing.excelHours = Math.max(existing.excelHours, excelRecord.hours);
    } else {
      excelWorkerMap.set(key, {
        location: excelRecord.location,
        locationId: excelRecord.locationId,
        date: excelRecord.dateKey,
        worker: workerName, // Keep original case for display
        team: excelRecord.team || null,
        excelHours: excelRecord.hours, // Don't sum - each record should be unique
        sourceFiles: new Set<string>()
      });
    }
    const entry = excelWorkerMap.get(key)!;
    entry.sourceFiles.add(excelRecord.sourceFile);
  });
  
  if (duplicateKeys.size > 0) {
    console.warn(`[Worker-Level Verification] Found ${duplicateKeys.size} duplicate worker/day/location/team combinations in Excel`);
  }
  
  console.log(`[Worker-Level Verification] Built Excel worker map with ${excelWorkerMap.size} unique worker/date/location combinations`);
  
  // Show ALL Excel workers (even if not found in DB) - Excel is source of truth
  let matchCount = 0;
  let mismatchCount = 0;
  let notFoundCount = 0;
  const mismatchReasons: Map<string, number> = new Map();
  
  excelWorkerMap.forEach((excelEntry, key) => {
    const dbRecords = dbWorkerMap.get(key) || [];
    
    // Sum hours from all DB records for this worker/location/date/team
    const dbHours = dbRecords.reduce((sum: number, r: any) => {
      return sum + (parseFloat(r.hoursWorked) || parseFloat(r.hours_worked) || parseFloat(r.workedHours) || 0);
    }, 0);
    
    const difference = Math.abs(excelEntry.excelHours - dbHours);
    const percentDiff = dbHours > 0 ? (difference / dbHours) * 100 : (excelEntry.excelHours > 0 ? 100 : 0);
    const isMatch = difference < 0.1 || percentDiff < 1;
    
    // Track mismatch reasons for diagnostics
    if (dbRecords.length === 0) {
      notFoundCount++;
      const reason = 'worker_not_found_in_db';
      mismatchReasons.set(reason, (mismatchReasons.get(reason) || 0) + 1);
    } else if (!isMatch) {
      mismatchCount++;
      if (dbHours === 0) {
        const reason = 'db_hours_zero';
        mismatchReasons.set(reason, (mismatchReasons.get(reason) || 0) + 1);
      } else if (excelEntry.excelHours > dbHours) {
        const reason = 'excel_hours_higher';
        mismatchReasons.set(reason, (mismatchReasons.get(reason) || 0) + 1);
      } else {
        const reason = 'db_hours_higher';
        mismatchReasons.set(reason, (mismatchReasons.get(reason) || 0) + 1);
      }
    } else {
      matchCount++;
    }
    
    // Always add to verifications - show ALL Excel workers
    workerVerifications.push({
      location: excelEntry.location,
      locationId: excelEntry.locationId.toString(),
      date: excelEntry.date,
      worker: excelEntry.worker,
      team: excelEntry.team || null,
      excelHours: excelEntry.excelHours,
      dbHours,
      difference,
      percentDiff: percentDiff.toFixed(2),
      isMatch: dbRecords.length > 0 ? isMatch : false, // Not a match if not found in DB
      sourceFiles: Array.from(excelEntry.sourceFiles),
      dbRecordCount: dbRecords.length,
      foundInDb: dbRecords.length > 0
    });
    
    if (dbRecords.length === 0) {
      // Worker not found in database - check if it's November 2025 and provide diagnostic info
      const isNov2025 = excelEntry.date.startsWith('2025-11');
      const diagnosticInfo = isNov2025 
        ? ' (November 2025 - check if cron job processed this date correctly)'
        : '';
      
      workerDiscrepancies.push({
        type: 'worker_not_found',
        location: excelEntry.location,
        locationId: excelEntry.locationId.toString(),
        date: excelEntry.date,
        worker: excelEntry.worker,
        team: excelEntry.team || null,
        excelHours: excelEntry.excelHours,
        dbHours: 0,
        message: `Worker "${excelEntry.worker}" (${excelEntry.team || 'no team'}) not found in processed_hours_aggregated for ${excelEntry.location} on ${excelEntry.date} - Excel shows ${excelEntry.excelHours.toFixed(2)}h${diagnosticInfo}`
      });
    } else if (!isMatch) {
      // Worker found but hours don't match
      workerDiscrepancies.push({
        type: 'worker_hours_mismatch',
        location: excelEntry.location,
        locationId: excelEntry.locationId.toString(),
        date: excelEntry.date,
        worker: excelEntry.worker,
        team: excelEntry.team || null,
        excelHours: excelEntry.excelHours,
        dbHours,
        difference,
        percentDiff: percentDiff.toFixed(2),
        message: `Worker hours mismatch for ${excelEntry.worker} (${excelEntry.team || 'no team'}) at ${excelEntry.location} on ${excelEntry.date}: Excel ${excelEntry.excelHours.toFixed(2)}h vs DB ${dbHours.toFixed(2)}h (${percentDiff.toFixed(2)}% difference)`
      });
    }
  });
  
  // Log summary statistics
  console.log(`[Worker-Level Verification] Summary:`);
  console.log(`  - Total Excel workers: ${excelWorkerMap.size}`);
  console.log(`  - Matches: ${matchCount} (${((matchCount / excelWorkerMap.size) * 100).toFixed(1)}%)`);
  console.log(`  - Mismatches: ${mismatchCount} (${((mismatchCount / excelWorkerMap.size) * 100).toFixed(1)}%)`);
  console.log(`  - Not found in DB: ${notFoundCount} (${((notFoundCount / excelWorkerMap.size) * 100).toFixed(1)}%)`);
  console.log(`  - Total DB records queried: ${dbWorkerRecords.length}`);
  console.log(`  - Unique DB worker/date/location combinations: ${dbWorkerMap.size}`);
  
  if (mismatchReasons.size > 0) {
    console.log(`[Worker-Level Verification] Mismatch reasons:`);
    mismatchReasons.forEach((count, reason) => {
      console.log(`  - ${reason}: ${count}`);
    });
  }
  
  // Add diagnostic info about potential matching issues
  if (notFoundCount > 0 || mismatchCount > 0) {
    console.log(`[Worker-Level Verification] Potential issues:`);
    console.log(`  1. Worker name matching: Excel and DB worker names must match exactly (case-insensitive, but accents/spaces matter)`);
    console.log(`  2. Team name matching: Excel and DB team names must match exactly (case-insensitive)`);
    console.log(`  3. Date format: Excel dates must match DB dates (YYYY-MM-DD format)`);
    console.log(`  4. Location matching: Excel location names must match DB location names`);
    console.log(`  5. Aggregation: Raw data must be aggregated into processed_hours_aggregated via /api/eitje/v2/aggregate-processed-hours`);
    console.log(`  6. Type filtering: Only "Gewerkte Uren" type is aggregated (other types like breaks might be excluded)`);
    console.log(`  7. Multiple shifts: A worker might have multiple shifts per day in DB, but Excel shows one total`);
    
    // Sample a few mismatches for detailed analysis
    const sampleMismatches = workerVerifications
      .filter(v => !v.isMatch)
      .slice(0, 5);
    
    if (sampleMismatches.length > 0) {
      console.log(`[Worker-Level Verification] Sample mismatches (first 5):`);
      sampleMismatches.forEach((v, idx) => {
        console.log(`  ${idx + 1}. ${v.worker} (${v.team || 'no team'}) at ${v.location} on ${v.date}:`);
        console.log(`     Excel: ${v.excelHours}h, DB: ${v.dbHours}h, Diff: ${v.difference.toFixed(2)}h (${v.percentDiff}%)`);
        console.log(`     Key used: ${v.locationId}_${v.date}_${v.worker.toLowerCase()}_${(v.team || '').toLowerCase()}`);
      });
    }
  }
  
  // Add mismatch analysis to diagnostics
  if (diagnostics && diagnostics.november2025) {
    diagnostics.november2025.mismatchAnalysis = {
      totalExcelWorkers: excelWorkerMap.size,
      matches: matchCount,
      mismatches: mismatchCount,
      notFound: notFoundCount,
      matchRate: excelWorkerMap.size > 0 ? ((matchCount / excelWorkerMap.size) * 100).toFixed(1) : '0',
      mismatchReasons: Object.fromEntries(mismatchReasons),
      potentialIssues: [
        notFoundCount > 0 ? 'Workers not found in processed_hours_aggregated - may need to run aggregation cron job' : null,
        mismatchCount > 0 ? 'Hours don\'t match - check worker name/team matching, date format, or multiple shifts per day' : null,
        dbWorkerMap.size < excelWorkerMap.size ? 'Fewer DB records than Excel records - some workers may not be aggregated' : null
      ].filter(Boolean) as string[]
    };
  }
  
  return { workerVerifications, workerDiscrepancies, diagnostics };
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
      console.log(`[File Detection] Found finance file: ${file}`);
      const parsed = parseFinanceFile(filePath, file);
      if (parsed.success) {
        console.log(`[File Detection] Successfully parsed finance file: ${file} (${parsed.revenueRecords.length} records)`);
        financeFiles.push(parsed);
      } else {
        console.warn(`[File Detection] Failed to parse finance file: ${file} - ${parsed.error}`);
      }
    } else if (lower.includes('gewerkte-uren') || lower.includes('gewerkte_uren') || lower.includes('gewerkte uren')) {
      // Only use "gewerkte uren" (worked hours) files for worker-level verification
      const parsed = parseHoursFile(filePath, file);
      if (parsed.success) {
        hoursFiles.push(parsed);
      }
    }
  }
  
  console.log(`[File Detection] Total finance files found: ${financeFiles.length}, Total hours files found: ${hoursFiles.length}`);
  
  const allFinanceRecords: any[] = [];
  financeFiles.forEach(file => {
    file.revenueRecords.forEach((record: any) => {
      allFinanceRecords.push({ ...record, sourceFile: file.filename });
    });
  });
  
  console.log(`[Data Collection] Total finance records collected: ${allFinanceRecords.length}`);
  console.log(`[Data Collection] Finance records date range: ${allFinanceRecords.length > 0 ? `${allFinanceRecords[0].dateKey} to ${allFinanceRecords[allFinanceRecords.length - 1].dateKey}` : 'N/A'}`);
  
  const allHoursRecords: any[] = [];
  hoursFiles.forEach(file => {
    file.hoursRecords.forEach((record: any) => {
      allHoursRecords.push({ ...record, sourceFile: file.filename });
    });
  });
  
  // Get actual date range of data in Excel files
  const allDates = [
    ...allFinanceRecords.map(r => new Date(r.dateKey)),
    ...allHoursRecords.map(r => new Date(r.dateKey))
  ].filter(d => !isNaN(d.getTime()));
  
  const actualMinDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
  const actualMaxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;
  
  // Get unique dates for diagnostics (sorted, most recent first)
  const uniqueDates = Array.from(new Set([
    ...allFinanceRecords.map(r => r.dateKey),
    ...allHoursRecords.map(r => r.dateKey)
  ])).sort().reverse().slice(0, 50); // Last 50 dates
  
  // Apply date filter
  const dateRange = getDateRange(dateFilter);
  const filteredFinanceRecords = filterRecordsByDate(allFinanceRecords, dateRange);
  const filteredHoursRecords = filterRecordsByDate(allHoursRecords, dateRange);
  
  console.log(`[Date Filter] Filter: ${dateFilter}, Date range: ${dateRange ? `${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}` : 'all'}`);
  console.log(`[Date Filter] Finance records after filter: ${filteredFinanceRecords.length} (from ${allFinanceRecords.length})`);
  console.log(`[Date Filter] Hours records after filter: ${filteredHoursRecords.length} (from ${allHoursRecords.length})`);
  
  // Build location map once (batch load)
  const locationMap = await buildLocationMap(db);
  
  // Verify in parallel (both use the same location map)
  // NOTE: Worker-level verification ONLY uses "gewerkte uren" files (filteredHoursRecords), NOT finance files
  const [financeVerification, hoursVerification, workerHoursVerification] = await Promise.all([
    verifyFinanceData(db, filteredFinanceRecords, locationMap),
    verifyHoursData(db, filteredHoursRecords, locationMap),
    verifyWorkerLevelHours(db, filteredHoursRecords, locationMap) // ONLY "gewerkte uren" files
  ]);
  
  // Extract diagnostics from worker verification
  const diagnostics = workerHoursVerification.diagnostics || null;
  
  const totalVerified = financeVerification.verifications.length + hoursVerification.verifications.length;
  const totalDiscrepancies = financeVerification.discrepancies.length + hoursVerification.discrepancies.length;
  const matchCount = financeVerification.verifications.filter((v: any) => v.isMatch).length + 
                    hoursVerification.verifications.filter((v: any) => v.isMatch).length;
  
  return {
    success: true,
    dateFilter,
    dateRange: dateRange ? {
      start: dateRange.startDate.toISOString().split('T')[0],
      end: dateRange.endDate.toISOString().split('T')[0]
    } : null,
    actualDataRange: actualMinDate && actualMaxDate ? {
      start: actualMinDate.toISOString().split('T')[0],
      end: actualMaxDate.toISOString().split('T')[0]
    } : null,
    sampleDates: uniqueDates, // For debugging - show what dates are actually in the files
    summary: {
      totalVerified,
      matchCount,
      discrepancyCount: totalDiscrepancies
    },
    finance: {
      files: financeFiles.length,
      records: allFinanceRecords.length,
      filteredRecords: filteredFinanceRecords.length,
      verifications: financeVerification.verifications,
      discrepancies: financeVerification.discrepancies
    },
    hours: {
      files: hoursFiles.length,
      records: allHoursRecords.length,
      filteredRecords: filteredHoursRecords.length,
      verifications: hoursVerification.verifications,
      discrepancies: hoursVerification.discrepancies,
      // Worker-level verification (per worker per day)
      workerVerifications: workerHoursVerification.workerVerifications,
      workerDiscrepancies: workerHoursVerification.workerDiscrepancies
    },
    // Diagnostics for November 2025 (after cron job)
    diagnostics
  };
}

