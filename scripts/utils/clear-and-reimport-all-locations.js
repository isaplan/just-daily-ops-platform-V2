const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const POWERBI_FILES_DIR = 'dev-docs/powerbi-upload-final-files-2023-2024-SEPT2025';

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Location mapping
const LOCATION_MAPPING = {
  'kinsbergen': { uuid: '550e8400-e29b-41d4-a716-446655440001', name: 'Van Kinsbergen' },
  'barbea': { uuid: '550e8400-e29b-41d4-a716-446655440002', name: 'BarBea Labour' },
  'lamour': { uuid: '550e8400-e29b-41d4-a716-446655440003', name: "l'Amour-Toujour" }
};

console.log('=== PowerBI Complete Re-import Script ===\n');

function detectLocationFromExcelContent(data) {
  // Check first 5 rows for location indicators
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i] || [];
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('van kinsbergen')) return 'kinsbergen';
    if (rowStr.includes('barbea') || rowStr.includes('bar bea')) return 'barbea';
    if (rowStr.includes('amour') || rowStr.includes('toujours')) return 'lamour';
  }
  return null;
}

function parsePowerBISheet(workbook, locationId, importId) {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  const norm = (v) => (v === null || v === undefined ? "" : v.toString().trim());
  const lower = (v) => norm(v).toLowerCase();

  const parseAmount = (val) => {
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    const s = norm(val).replace(/\s+/g, "");
    if (!s) return 0;
    // Handle European formats: 1.234,56 -> 1234.56
    let normalized = s;
    if (/^-?[\d.,]+$/.test(s)) {
      if (s.includes(",") && s.includes(".")) {
        normalized = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        normalized = s.replace(",", ".");
      }
    }
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  // Detect header row by searching for typical column headers within first 15 rows
  let headerRowIndex = -1;
  let headerRow;
  for (let r = 0; r < Math.min(15, data.length); r++) {
    const row = data[r] || [];
    // Handle both array and single string cases
    const cells = Array.isArray(row) ? row.map(lower) : [lower(row)];
    const hasYear = cells.some((c) => /\bjaar\b|\byear\b/.test(c));
    const hasMonth = cells.some((c) => /\bmnd\b|\bmaand\b|\bmonth\b/.test(c));
    const hasRgs = cells.some((c) => /rgsniveau2|rgs niveau 2/.test(c));
    const hasGrootboek = cells.some((c) => /grootboek/.test(c));
    // Also check for the actual PowerBI column names
    const hasRgsSchema = cells.some((c) => /rgs-schema.*rgsniveau2/i.test(c));
    const hasGrootboekCol = cells.some((c) => /^grootboek$/i.test(c));
    // Check for PowerBI specific patterns
    const hasPowerBIHeaders = cells.some((c) => /rgs-schema.*rgsniveau2/i.test(c)) && 
                             cells.some((c) => /rgs-schema.*rgsniveau3/i.test(c)) &&
                             cells.some((c) => /^grootboek$/i.test(c));
    // Prioritize PowerBI headers over generic year/month detection
    // Only consider it a valid header if it's an array with proper PowerBI structure
    const isValidHeader = Array.isArray(row) && row.length > 3 && (
      hasPowerBIHeaders || 
      (hasRgsSchema && hasGrootboekCol) || 
      (hasRgs && hasGrootboek)
    );
    
    if (isValidHeader || (hasYear && hasMonth && Array.isArray(row) && row.length > 3)) {
      headerRowIndex = r;
      headerRow = row;
      break;
    }
  }

  // Default indices (legacy export)
  let glCol = 0;
  let categoryCol = 1;
  let subcategoryCol = 2;
  let yearCol = 4;
  let monthCol = 5;
  let amountCol = 6;

  if (headerRow) {
    const cells = headerRow.map(lower);
    const findIdx = (regex) => cells.findIndex((c) => regex.test(c));

    const trySet = (current, idx) => (idx >= 0 ? idx : current);
    // Updated regex patterns to match PowerBI format
    glCol = trySet(glCol, findIdx(/rgs-schema.*rgsniveau2|rgsniveau2|gl.?account|rekening/i));
    categoryCol = trySet(categoryCol, findIdx(/rgs-schema.*rgsniveau3|rgsniveau3|categorie|category/i));
    subcategoryCol = trySet(subcategoryCol, findIdx(/^grootboek$|grootboek|subcat|subcategorie/i));
    yearCol = trySet(yearCol, findIdx(/kalender.*jaar|jaar|\byear\b/i));
    monthCol = trySet(monthCol, findIdx(/^mnd$|\bmnd\b|\bmaand\b|\bmonth\b/i));
    amountCol = trySet(amountCol, findIdx(/forecast|bedrag|amount|waarde|value|actueel|actual|omzet|spent|kosten/i));
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 2; // Skip possible filter + header rows

  console.log(`  Header row: ${headerRowIndex}, Start row: ${startRow}`);
  console.log(`  Columns: GL=${glCol}, Category=${categoryCol}, Subcategory=${subcategoryCol}, Year=${yearCol}, Month=${monthCol}, Amount=${amountCol}`);

  let records = [];
  const yearMonthCombinations = new Set();
  const skippedRows = [];

  // Iterate all data rows after the detected header
  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || [];
    if (!row || row.length === 0) {
      skippedRows.push({ index: i, reason: "Empty row" });
      continue;
    }

    const glAccount = norm(row[glCol]);
    const category = norm(row[categoryCol]);
    const subcategoryVal = norm(row[subcategoryCol]);
    const subcategory = subcategoryVal || null;

    if (!glAccount) {
      skippedRows.push({ index: i, reason: "Missing GL account" });
      continue;
    }

    // Year detection: prefer designated column, else scan row for a 4-digit year
    let year = null;
    const yearRaw = row[yearCol];
    if (yearRaw !== undefined && yearRaw !== null) {
      const y = parseInt(norm(yearRaw));
      if (!Number.isNaN(y)) year = y;
    }
    if (year === null) {
      for (const cell of row) {
        const m = norm(cell).match(/\b(20\d{2})\b/);
        if (m) {
          year = parseInt(m[1]);
          break;
        }
      }
    }
    if (year === null || year < 2015 || year > 2035) {
      skippedRows.push({ index: i, reason: `Invalid year: ${norm(yearRaw)}` });
      continue;
    }

    // Month detection: number (1-12) or Dutch month name
    const monthCell = row[monthCol];
    let month = 0;
    if (typeof monthCell === "number") {
      month = Math.round(monthCell);
    } else {
      const mStr = lower(monthCell);
      if (mStr) {
        // Simple month mapping
        const monthMap = {
          'jan': 1, 'feb': 2, 'maa': 3, 'mrt': 3, 'apr': 4, 'mei': 5, 'jun': 6,
          'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'nov': 11, 'dec': 12
        };
        month = monthMap[mStr] || 0;
      }
    }
    if (!month) {
      // Fallback: scan row for any month-like cell
      for (const cell of row) {
        const c = lower(cell);
        if (!c) continue;
        const asNum = parseInt(c);
        if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) {
          month = asNum;
          break;
        }
      }
    }
    if (month < 1 || month > 12) {
      skippedRows.push({ index: i, reason: `Invalid month value in row` });
      continue;
    }

    // Amount parsing
    const amount = parseAmount(row[amountCol]);

    yearMonthCombinations.add(`${year}-${month}`);

    records.push({
      location_id: locationId,
      gl_account: glAccount,
      category,
      subcategory,
      year,
      month,
      amount,
      import_id: importId,
    });
  }

  // Deduplicate by unique constraint key (location_id, year, month, gl_account) and sum amounts
  const agg = new Map();
  for (const r of records) {
    // CRITICAL: Key must match the unique constraint: (location_id, year, month, gl_account)
    const key = `${r.location_id}|${r.year}|${r.month}|${r.gl_account}`;
    const existing = agg.get(key);
    if (existing) {
      existing.amount += r.amount;
      // Keep first category/subcategory when aggregating
    } else {
      agg.set(key, { ...r });
    }
  }
  records = Array.from(agg.values());

  console.log(`  Parsed: ${records.length} records, ${skippedRows.length} skipped, ${yearMonthCombinations.size} year-month combinations`);

  if (records.length === 0) {
    console.error("  WARNING: No records parsed! Check column structure and data format.");
  }

  return { records, yearMonthCombinations };
}

async function clearExistingData(year) {
  console.log(`🗑️  Clearing existing powerbi_pnl_data for year ${year}...`);
  const { error, count } = await supabase
    .from('powerbi_pnl_data')
    .delete({ count: 'exact' })
    .eq('year', year);

  if (error) {
    console.error(`❌ Failed to clear data for year ${year}:`, error.message);
    throw error;
  } else {
    console.log(`✅ Cleared ${count ?? 0} records for year ${year}`);
  }
}

async function reimportAllData() {
  console.log('📊 Re-importing all PowerBI data with correct location mapping...');
  
  // Clear existing 2025 data
  await clearExistingData(2025);
  
  const files = fs.readdirSync(POWERBI_FILES_DIR).filter(file => file.endsWith('.xlsx')).sort();
  console.log(`Found ${files.length} Excel files to process\n`);

  let totalProcessed = 0;
  const locationStats = {};

  for (const fileName of files) {
    const filePath = path.join(POWERBI_FILES_DIR, fileName);
    console.log(`📁 Processing: ${fileName}`);
    
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    // Detect location from Excel content
    const detectedLocation = detectLocationFromExcelContent(data);
    
    if (!detectedLocation) {
      console.log(`  ❌ Could not detect location for ${fileName}`);
      continue;
    }
    
    const locationInfo = LOCATION_MAPPING[detectedLocation];
    const locationId = locationInfo.uuid;
    const importId = `reimport-${Date.now()}-${fileName.replace('.xlsx', '')}`;

    console.log(`  📍 Location: ${locationInfo.name} (${locationId})`);

    try {
      const { records, yearMonthCombinations } = parsePowerBISheet(workbook, locationId, importId);
      
      if (records.length === 0) {
        console.log(`  ⚠️  No records to insert from ${fileName}`);
        continue;
      }

      // Delete existing data for the specific year-month combinations found in this file
      for (const combo of yearMonthCombinations) {
        const [year, month] = combo.split('-').map(Number);
        await supabase
          .from('powerbi_pnl_data')
          .delete()
          .eq('location_id', locationId)
          .eq('year', year)
          .eq('month', month);
      }

      // Insert new records
      const { error } = await supabase.from('powerbi_pnl_data').insert(records);
      if (error) {
        throw new Error(`Database insert error: ${error.message}`);
      }
      
      console.log(`  ✅ Inserted ${records.length} records`);
      totalProcessed += records.length;
      
      // Track stats per location
      if (!locationStats[detectedLocation]) {
        locationStats[detectedLocation] = { files: 0, records: 0 };
      }
      locationStats[detectedLocation].files++;
      locationStats[detectedLocation].records += records.length;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${fileName}:`, error.message);
    }
    
    console.log();
  }

  console.log('🎉 Re-import complete!');
  console.log(`Total records processed: ${totalProcessed}`);
  console.log('\nLocation breakdown:');
  for (const [location, stats] of Object.entries(locationStats)) {
    const locationInfo = LOCATION_MAPPING[location];
    console.log(`  ${locationInfo.name}: ${stats.files} files, ${stats.records} records`);
  }
}

// Run the re-import
reimportAllData().catch(error => {
  console.error('❌ Re-import failed:', error);
  process.exit(1);
});
