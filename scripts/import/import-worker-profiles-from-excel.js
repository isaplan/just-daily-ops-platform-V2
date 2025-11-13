/**
 * Import Worker Profiles from Excel File
 * 
 * Reads Excel file with worker start/stop dates, contract types, and hourly wages
 * Updates worker_profiles table with correct effective_from, effective_to, contract_type, hourly_wage
 * 
 * Usage: node scripts/import/import-worker-profiles-from-excel.js <path-to-excel-file>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use anon key (RLS allows UPDATE for authenticated, but we'll only UPDATE existing profiles)
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check .env.local file.');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Find column index by searching for keywords in header row
 */
function findColumnIndex(headers, keywords) {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  for (const keyword of keywords) {
    const index = lowerHeaders.findIndex(h => h.includes(keyword.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Parse date from Excel cell (handles various formats)
 */
function parseDate(cellValue) {
  if (!cellValue) return null;
  
  // If it's an Excel date number
  if (typeof cellValue === 'number') {
    const date = XLSX.SSF.parse_date_code(cellValue);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  // If it's a string, try to parse it
  if (typeof cellValue === 'string') {
    // Handle formats like "0501'24" (DDMM'YY)
    const match = cellValue.match(/^(\d{2})(\d{2})'(\d{2})$/);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      return `${fullYear}-${month}-${day}`;
    }
    
    // Try standard date parsing
    const parsed = new Date(cellValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Parse date in DD/MM/YYYY format (e.g., "01/04/2025")
 */
function parseDateDDMMYYYY(dateString) {
  if (!dateString) return null;
  
  const match = String(dateString).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Fallback to standard parseDate
  return parseDate(dateString);
}

/**
 * Parse hourly wage from cell (handles "€19" or "€12,5" format)
 */
function parseHourlyWage(cellValue) {
  if (!cellValue) return null;
  
  if (typeof cellValue === 'number') {
    return cellValue;
  }
  
  if (typeof cellValue === 'string') {
    // Remove currency symbols (€, $), spaces
    // Replace comma with dot for decimal separator (e.g., "€12,5" -> "12.5")
    let cleaned = cellValue.trim()
      .replace(/[€$]/g, '')
      .replace(/\s/g, '')
      .replace(',', '.');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Match worker name to eitje_user_id
 */
async function findEitjeUserId(workerName) {
  if (!workerName) return null;
  
  // Try to find in processed_v2 by user_name
  const { data, error } = await supabase
    .from('eitje_time_registration_shifts_processed_v2')
    .select('user_id, user_name')
    .ilike('user_name', `%${workerName.trim()}%`)
    .limit(1);
  
  if (error) {
    console.warn(`Error finding user for "${workerName}":`, error.message);
    return null;
  }
  
  if (data && data.length > 0) {
    return data[0].user_id;
  }
  
  // Try eitje_users table as fallback
  const { data: usersData, error: usersError } = await supabase
    .from('eitje_users')
    .select('eitje_user_id, name')
    .ilike('name', `%${workerName.trim()}%`)
    .limit(1);
  
  if (usersError) {
    console.warn(`Error finding user in eitje_users for "${workerName}":`, usersError.message);
    return null;
  }
  
  if (usersData && usersData.length > 0) {
    return usersData[0].eitje_user_id;
  }
  
  return null;
}

/**
 * Find location_id from location name
 */
async function findLocationId(locationName) {
  if (!locationName) return null;
  
  const { data, error } = await supabase
    .from('locations')
    .select('id, name')
    .ilike('name', `%${locationName.trim()}%`)
    .limit(1);
  
  if (error) {
    console.warn(`Error finding location for "${locationName}":`, error.message);
    return null;
  }
  
  if (data && data.length > 0) {
    return data[0].id;
  }
  
  return null;
}

/**
 * Load contract types from "log" sheet
 */
function loadContractTypesFromLogSheet(workbook) {
  const contractTypes = new Set();
  
  if (!workbook.SheetNames.includes('log')) {
    console.warn('⚠️  No "log" sheet found, skipping contract type extraction');
    return contractTypes;
  }
  
  try {
    const logSheet = workbook.Sheets['log'];
    const logData = XLSX.utils.sheet_to_json(logSheet, { header: 1, defval: '' });
    
    // Headers are at row 38 (index 37), data starts at row 39 (index 38)
    if (logData.length > 37) {
      const headers = logData[37].map(h => String(h || '').trim());
      const contractTypeCol = headers.findIndex(h => 
        h.toLowerCase().includes('contracttype') || 
        h.toLowerCase().includes('contract type') ||
        h.toLowerCase().includes('type')
      );
      
      if (contractTypeCol !== -1) {
        // Extract unique contract types from data rows
        for (let i = 38; i < logData.length; i++) {
          const row = logData[i] || [];
          const contractType = row[contractTypeCol] ? String(row[contractTypeCol]).trim() : null;
          if (contractType && contractType.length > 0) {
            contractTypes.add(contractType);
          }
        }
        console.log(`📋 Found ${contractTypes.size} unique contract types in "log" sheet:`, Array.from(contractTypes).join(', '));
      }
    }
  } catch (error) {
    console.warn('⚠️  Error reading "log" sheet:', error.message);
  }
  
  return contractTypes;
}

/**
 * Main import function
 */
async function importWorkerProfiles(excelFilePath) {
  console.log('📊 Importing worker profiles from Excel file...\n');
  console.log(`File: ${excelFilePath}\n`);
  
  try {
    // Step 1: Read Excel file
    const fileBuffer = readFileSync(excelFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Load contract types from "log" sheet (for reference)
    const contractTypesFromLog = loadContractTypesFromLogSheet(workbook);
    
    // Get first sheet (main data)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (data.length < 2) {
      console.error('❌ Excel file has no data rows');
      return;
    }
    
    console.log(`📋 Found ${data.length} rows in sheet "${sheetName}"\n`);
    
    // Step 2: Find header row (look for "▲ naam" in first column - this is the actual data header)
    // The actual header row has "▲ naam" and multiple columns (contracttype, uurloon, etc.)
    let headerRow = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i] || [];
      const firstCell = String(row[0] || '').trim();
      // Look for header row with "▲ naam" (the actual data header, not just "Naam")
      // Also check that it has multiple columns (the real header has 10 columns)
      if ((firstCell === '▲ naam' || firstCell.includes('▲ naam')) && row.length >= 5) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      console.error('❌ Could not find header row');
      return;
    }
    
    const headers = data[headerRow].map(h => String(h || '').trim());
    console.log('📋 Headers found:', headers.join(', '), '\n');
    
    // Map columns based on known structure:
    // Column 0: "▲ naam" (Name)
    // Column 1: "contracttype" (Contract Type)
    // Column 2: "uurloon" (Hourly Wage)
    // Column 4: "contractvestiging" (Location Name)
    // Column 6: "einddatum contract" (End Date)
    // Column 7: "startdatum contract" (Start Date)
    // Column 9: "support ID" (Eitje User ID)
    const nameCol = 0;
    const contractTypeCol = 1;
    const hourlyWageCol = 2;
    const locationNameCol = 4;
    const endDateCol = 6;
    const startDateCol = 7;
    const eitjeUserIdCol = 9;
    
    console.log('📋 Column mapping:');
    console.log(`  Name: column ${nameCol} (${headers[nameCol] || 'N/A'})`);
    console.log(`  Contract Type: column ${contractTypeCol} (${headers[contractTypeCol] || 'N/A'})`);
    console.log(`  Hourly Wage: column ${hourlyWageCol} (${headers[hourlyWageCol] || 'N/A'})`);
    console.log(`  Location: column ${locationNameCol} (${headers[locationNameCol] || 'N/A'})`);
    console.log(`  Start Date: column ${startDateCol} (${headers[startDateCol] || 'N/A'})`);
    console.log(`  End Date: column ${endDateCol} (${headers[endDateCol] || 'N/A'})`);
    console.log(`  Eitje User ID: column ${eitjeUserIdCol} (${headers[eitjeUserIdCol] || 'N/A'})`);
    console.log('');
    
    // Step 3: Parse data rows
    const dataRows = data.slice(headerRow + 1);
    const updates = [];
    const errors = [];
    
    console.log(`📊 Processing ${dataRows.length} data rows...\n`);
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] || [];
      const workerName = row[nameCol] ? String(row[nameCol]).trim() : null;
      
      if (!workerName || workerName === '') {
        continue; // Skip empty rows
      }
      
      // Get eitje_user_id directly from column 9 (support ID) - PRIMARY MATCHING METHOD
      // The support ID in Excel matches eitje_user_id in the database, use it directly
      const rawEitjeUserId = row[eitjeUserIdCol];
      let eitjeUserId = null;
      
      if (rawEitjeUserId) {
        // Parse as integer - this is the eitje_user_id from the database
        const parsed = parseInt(String(rawEitjeUserId).trim(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          eitjeUserId = parsed;
          // Use support ID directly - it matches the database
        }
      }
      
      // Fallback: try to find by name ONLY if support ID is missing or invalid
      // This handles cases where the person isn't in the database yet
      if (!eitjeUserId) {
        console.warn(`⚠️  Row ${i + headerRow + 2}: No valid support ID for "${workerName}", trying name match...`);
        eitjeUserId = await findEitjeUserId(workerName);
        if (!eitjeUserId) {
          errors.push(`Row ${i + headerRow + 2}: Could not find user "${workerName}" (no support ID and name not found)`);
          console.warn(`⚠️  Row ${i + headerRow + 2}: Could not find user "${workerName}" (no support ID and name not found)`);
          continue;
        }
        console.log(`✅ Found user "${workerName}" by name match: user_id ${eitjeUserId}`);
      }
      
      // Parse dates (format: DD/MM/YYYY)
      const startDateRaw = row[startDateCol];
      const endDateRaw = row[endDateCol];
      const startDate = startDateRaw ? parseDateDDMMYYYY(String(startDateRaw)) : null;
      const endDate = endDateRaw ? parseDateDDMMYYYY(String(endDateRaw)) : null;
      
      // Parse contract type, hourly wage, and location
      const contractType = row[contractTypeCol] ? String(row[contractTypeCol]).trim() : null;
      const hourlyWage = row[hourlyWageCol] ? parseHourlyWage(row[hourlyWageCol]) : null;
      const locationName = row[locationNameCol] ? String(row[locationNameCol]).trim() : null;
      
      // Find location_id from location name
      const locationId = locationName ? await findLocationId(locationName) : null;
      
      updates.push({
        eitje_user_id: eitjeUserId,
        worker_name: workerName,
        location_id: locationId,
        location_name: locationName,
        effective_from: startDate,
        effective_to: endDate || null, // NULL = active
        contract_type: contractType || null,
        hourly_wage: hourlyWage || null,
        row_number: i + headerRow + 2
      });
    }
    
    console.log(`\n📊 Found ${updates.length} valid worker profiles to update`);
    console.log(`⚠️  ${errors.length} errors\n`);
    
    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(err => console.log(`  - ${err}`));
      console.log('');
    }
    
    // Step 4: Upsert worker_profiles (INSERT new contracts, UPDATE existing ones)
    console.log('💾 Upserting worker_profiles...\n');
    
    let successCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      try {
        // Check if a profile exists for this exact combination:
        // eitje_user_id + location_id + effective_from (the unique constraint)
        let query = supabase
          .from('worker_profiles')
          .select('*')
          .eq('eitje_user_id', update.eitje_user_id);
        
        // Handle effective_from: use .is() for null, .eq() for date
        if (update.effective_from) {
          query = query.eq('effective_from', update.effective_from);
        } else {
          query = query.is('effective_from', null);
        }
        
        // Handle location_id: use .is('location_id', null) for null, .eq() for UUID
        if (update.location_id) {
          query = query.eq('location_id', update.location_id);
        } else {
          query = query.is('location_id', null);
        }
        
        const { data: existingProfile, error: fetchError } = await query.maybeSingle();
        
        if (fetchError) {
          console.error(`❌ Error fetching profile for ${update.worker_name}:`, fetchError.message);
          errorCount++;
          continue;
        }
        
        if (existingProfile) {
          // Profile exists for this contract - UPDATE missing values only (don't override existing)
          const updateData = {};
          
          // Only update fields that are missing (NULL/empty) in existing profile
          if (!existingProfile.effective_to && update.effective_to) {
            updateData.effective_to = update.effective_to;
          }
          if (!existingProfile.contract_type && update.contract_type) {
            updateData.contract_type = update.contract_type;
          }
          if (!existingProfile.hourly_wage && update.hourly_wage !== null && update.hourly_wage !== undefined) {
            updateData.hourly_wage = update.hourly_wage;
            updateData.wage_override = true; // Set override if hourly wage is provided
          }
          if (!existingProfile.location_id && update.location_id) {
            updateData.location_id = update.location_id;
          }
          
          // Only update if there are changes
          if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date().toISOString();
            
            const { error: updateError } = await supabase
              .from('worker_profiles')
              .update(updateData)
              .eq('id', existingProfile.id);
            
            if (updateError) {
              console.error(`❌ Error updating profile ${existingProfile.id} for ${update.worker_name}:`, updateError.message);
              errorCount++;
            } else {
              console.log(`✅ Updated ${update.worker_name} (user_id: ${update.eitje_user_id}, contract: ${update.effective_from || 'N/A'})`);
              updateCount++;
              successCount++;
            }
          } else {
            console.log(`ℹ️  No changes needed for ${update.worker_name} (user_id: ${update.eitje_user_id}, contract: ${update.effective_from || 'N/A'})`);
            successCount++;
          }
        } else {
          // Profile doesn't exist for this contract - INSERT new contract
          const insertData = {
            eitje_user_id: update.eitje_user_id,
            location_id: update.location_id || null,
            effective_from: update.effective_from || null,
            effective_to: update.effective_to || null,
            contract_type: update.contract_type || null,
            hourly_wage: update.hourly_wage || null,
            wage_override: update.hourly_wage ? true : false,
            notes: `Imported from Excel file${update.location_name ? ` (Location: ${update.location_name})` : ''}`
          };
          
          const { error: insertError } = await supabase
            .from('worker_profiles')
            .insert(insertData);
          
          if (insertError) {
            console.error(`❌ Error creating profile for ${update.worker_name}:`, insertError.message);
            errorCount++;
          } else {
            console.log(`➕ Created new contract for ${update.worker_name} (user_id: ${update.eitje_user_id}, contract: ${update.effective_from || 'N/A'}${update.location_name ? `, location: ${update.location_name}` : ''})`);
            insertCount++;
            successCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Exception processing ${update.worker_name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Total processed: ${updates.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   - New contracts created: ${insertCount}`);
    console.log(`   - Existing contracts updated: ${updateCount}`);
    console.log(`   Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
const excelFilePath = process.argv[2];

if (!excelFilePath) {
  console.error('❌ Please provide path to Excel file');
  console.log('Usage: node scripts/import/import-worker-profiles-from-excel.js <path-to-excel-file>');
  process.exit(1);
}

const fullPath = path.isAbsolute(excelFilePath) 
  ? excelFilePath 
  : path.join(process.cwd(), excelFilePath);

importWorkerProfiles(fullPath).catch(console.error);

