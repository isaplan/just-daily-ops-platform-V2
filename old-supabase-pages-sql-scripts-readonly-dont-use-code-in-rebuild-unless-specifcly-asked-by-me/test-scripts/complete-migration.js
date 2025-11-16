/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/complete-migration.js
 */

#!/usr/bin/env node

/**
 * COMPLETE MIGRATION - Find ALL data and migrate EVERYTHING
 * No settling for less - get ALL records!
 */

const fs = require('fs');
const https = require('https');

// Database configurations
const OLD_DB = {
    url: 'https://cajxmwyiwrhzryvawjkm.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ'
};

const NEW_DB = {
    url: 'https://vrucbxdudchboznunndz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o'
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'apikey': options.apikey,
                'Authorization': `Bearer ${options.apikey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

function csvToJSON(csvContent) {
    const lines = csvContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const record = {};
            
            headers.forEach((header, index) => {
                let value = values[index];
                
                // Convert specific fields to appropriate types
                if (header === 'year' || header === 'month') {
                    value = parseInt(value);
                } else if (header === 'amount') {
                    value = parseFloat(value);
                }
                
                record[header] = value;
            });
            
            records.push(record);
        }
    }
    
    return records;
}

async function importCSVFile(csvPath, tableName) {
    console.log(`\n📊 IMPORTING ${tableName} from CSV:`);
    console.log('='.repeat(60));
    
    try {
        // Read CSV file
        console.log(`📁 Reading CSV: ${csvPath}`);
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const records = csvToJSON(csvContent);
        console.log(`📊 Parsed ${records.length} records from CSV`);
        
        // Clear existing data
        console.log(`🗑️  Clearing existing ${tableName}...`);
        try {
            await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
                method: 'DELETE',
                apikey: NEW_DB.key
            });
        } catch (error) {
            console.log(`⚠️  Clear warning: ${error.message}`);
        }
        
        // Import in batches
        const batchSize = 1000;
        const totalBatches = Math.ceil(records.length / batchSize);
        
        console.log(`📦 Importing in ${totalBatches} batches...`);
        
        let totalImported = 0;
        
        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, records.length);
            const batch = records.slice(start, end);
            
            console.log(`📤 Batch ${i + 1}/${totalBatches}: ${batch.length} records...`);
            
            try {
                const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
                    method: 'POST',
                    apikey: NEW_DB.key,
                    body: batch
                });
                
                if (response.status === 201) {
                    totalImported += batch.length;
                    console.log(`✅ Batch ${i + 1} imported (${batch.length} records)`);
                } else {
                    console.log(`❌ Batch ${i + 1} failed: ${response.status}`);
                    console.log(`Response:`, response.data);
                }
            } catch (error) {
                console.log(`❌ Batch ${i + 1} error: ${error.message}`);
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n📊 ${tableName} Import Summary:`);
        console.log(`📁 CSV Records: ${records.length.toLocaleString()}`);
        console.log(`📤 Imported: ${totalImported.toLocaleString()}`);
        console.log(`✅ Success Rate: ${((totalImported / records.length) * 100).toFixed(1)}%`);
        
        return { totalRecords: records.length, importedRecords: totalImported };
        
    } catch (error) {
        console.log(`❌ Import failed: ${error.message}`);
        return { totalRecords: 0, importedRecords: 0 };
    }
}

async function findALLRecords(db, tableName, dbName) {
    console.log(`\n🔍 FINDING ALL RECORDS for ${tableName} in ${dbName}:`);
    console.log('='.repeat(60));
    
    let totalCount = 0;
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    let batchNumber = 1;
    
    while (hasMore) {
        try {
            console.log(`📦 Batch ${batchNumber}: Records ${offset + 1}-${offset + limit}...`);
            
            const response = await makeRequest(`${db.url}/rest/v1/${tableName}?limit=${limit}&offset=${offset}`, {
                apikey: db.key
            });
            
            if (response.status === 200) {
                const records = response.data;
                const batchCount = records.length;
                totalCount += batchCount;
                
                console.log(`✅ Got ${batchCount} records (Total: ${totalCount})`);
                
                if (batchCount < limit) {
                    hasMore = false;
                    console.log(`🏁 End reached (${batchCount} < ${limit})`);
                } else {
                    offset += limit;
                    batchNumber++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                console.log(`❌ Batch ${batchNumber} failed: ${response.status}`);
                hasMore = false;
            }
        } catch (error) {
            console.log(`❌ Batch ${batchNumber} error: ${error.message}`);
            hasMore = false;
        }
    }
    
    console.log(`📊 FINAL COUNT for ${tableName}: ${totalCount.toLocaleString()} records`);
    return totalCount;
}

async function completeMigration() {
    console.log('🚀 COMPLETE MIGRATION - FINDING ALL DATA');
    console.log('='.repeat(80));
    
    // Step 1: Import CSV files
    console.log('\n📊 STEP 1: IMPORTING CSV FILES');
    console.log('='.repeat(50));
    
    const csvFiles = [
        {
            path: '/Users/alviniomolina/Downloads/powerbi_pnl_data-export-2025-10-23_00-45-26.csv',
            table: 'powerbi_pnl_data'
        },
        {
            path: '/Users/alviniomolina/Downloads/pnl_line_items-export-2025-10-23_00-51-44.csv',
            table: 'pnl_line_items'
        }
    ];
    
    const importResults = {};
    
    for (const csvFile of csvFiles) {
        if (fs.existsSync(csvFile.path)) {
            const result = await importCSVFile(csvFile.path, csvFile.table);
            importResults[csvFile.table] = result;
        } else {
            console.log(`⚠️  CSV file not found: ${csvFile.path}`);
        }
    }
    
    // Step 2: Find ALL records in both databases
    console.log('\n📊 STEP 2: FINDING ALL RECORDS IN BOTH DATABASES');
    console.log('='.repeat(60));
    
    const tables = [
        'locations',
        'api_credentials',
        'sales_imports',
        'sales_import_items',
        'bork_sales_data',
        'powerbi_pnl_data',
        'pnl_line_items',
        'pnl_monthly_summary',
        'bork_api_credentials',
        'bork_api_sync_logs',
        'api_sync_logs'
    ];
    
    const oldCounts = {};
    const newCounts = {};
    
    // Get OLD database counts
    console.log('\n🔍 OLD DATABASE - FINDING ALL RECORDS:');
    let oldTotal = 0;
    for (const tableName of tables) {
        const count = await findALLRecords(OLD_DB, tableName, 'OLD DATABASE');
        oldCounts[tableName] = count;
        oldTotal += count;
    }
    
    // Get NEW database counts
    console.log('\n🔍 NEW DATABASE - FINDING ALL RECORDS:');
    let newTotal = 0;
    for (const tableName of tables) {
        const count = await findALLRecords(NEW_DB, tableName, 'NEW DATABASE');
        newCounts[tableName] = count;
        newTotal += count;
    }
    
    // Final comparison
    console.log('\n📊 FINAL COMPLETE COMPARISON:');
    console.log('='.repeat(80));
    console.log('Table Name'.padEnd(25) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status');
    console.log('-'.repeat(80));
    
    let totalMissing = 0;
    let allPerfect = true;
    
    for (const tableName of tables) {
        const oldCount = oldCounts[tableName] || 0;
        const newCount = newCounts[tableName] || 0;
        const diff = oldCount - newCount;
        totalMissing += diff;
        
        let status = '';
        if (oldCount === newCount) {
            status = '✅ Perfect';
        } else if (newCount > 0) {
            status = '⚠️  Partial';
            allPerfect = false;
        } else {
            status = '❌ Missing';
            allPerfect = false;
        }
        
        console.log(
            tableName.padEnd(25) + 
            oldCount.toLocaleString().padStart(10) + 
            newCount.toLocaleString().padStart(10) + 
            diff.toLocaleString().padStart(10) + 
            status
        );
    }
    
    console.log('-'.repeat(80));
    console.log(`TOTAL OLD:  ${oldTotal.toLocaleString()}`);
    console.log(`TOTAL NEW:  ${newTotal.toLocaleString()}`);
    console.log(`MISSING:    ${totalMissing.toLocaleString()}`);
    
    if (allPerfect) {
        console.log('\n🎉 PERFECT MIGRATION! ALL DATA MIGRATED!');
    } else {
        console.log(`\n⚠️  MIGRATION STATUS: ${totalMissing.toLocaleString()} records still missing`);
    }
    
    return { oldCounts, newCounts, oldTotal, newTotal, totalMissing, allPerfect, importResults };
}

// Main execution
if (require.main === module) {
    completeMigration().catch(console.error);
}

module.exports = { completeMigration };
