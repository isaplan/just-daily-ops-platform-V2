/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/migrate-all-missing-data.js
 */

#!/usr/bin/env node

/**
 * MIGRATE ALL MISSING DATA
 * Check EVERY table in OLD database and migrate ALL missing data to NEW database
 */

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

async function getAllRecordsFromTable(db, tableName, dbName) {
    console.log(`\n🔍 Getting ALL records from ${tableName} in ${dbName}:`);
    console.log('='.repeat(60));
    
    let allRecords = [];
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
                allRecords = allRecords.concat(records);
                
                console.log(`✅ Got ${records.length} records (Total: ${allRecords.length})`);
                
                if (records.length < limit) {
                    hasMore = false;
                    console.log(`🏁 End reached (${records.length} < ${limit})`);
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
    
    console.log(`📊 FINAL COUNT for ${tableName}: ${allRecords.length.toLocaleString()} records`);
    return allRecords;
}

async function migrateTableData(tableName, oldRecords, newRecords) {
    console.log(`\n📊 MIGRATING ${tableName}:`);
    console.log('='.repeat(50));
    console.log(`📊 Old database: ${oldRecords.length.toLocaleString()} records`);
    console.log(`📊 New database: ${newRecords.length.toLocaleString()} records`);
    
    if (oldRecords.length <= newRecords.length) {
        console.log(`✅ ${tableName} already has all data or more`);
        return { migrated: 0, skipped: oldRecords.length };
    }
    
    const missingCount = oldRecords.length - newRecords.length;
    console.log(`📊 Missing records: ${missingCount.toLocaleString()}`);
    
    if (missingCount === 0) {
        console.log(`✅ No migration needed for ${tableName}`);
        return { migrated: 0, skipped: oldRecords.length };
    }
    
    // Try to migrate missing records
    console.log(`🚀 Attempting to migrate ${missingCount} records...`);
    
    try {
        // Import all old records (let Supabase handle duplicates)
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
            method: 'POST',
            apikey: NEW_DB.key,
            body: oldRecords
        });
        
        if (response.status === 201) {
            console.log(`✅ Successfully migrated ${oldRecords.length} records`);
            return { migrated: oldRecords.length, skipped: 0 };
        } else {
            console.log(`⚠️  Migration response: ${response.status}`);
            console.log(`Response:`, response.data);
            
            // Try batch migration
            const batchSize = 100;
            const totalBatches = Math.ceil(oldRecords.length / batchSize);
            let totalMigrated = 0;
            
            console.log(`📦 Trying batch migration (${totalBatches} batches)...`);
            
            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, oldRecords.length);
                const batch = oldRecords.slice(start, end);
                
                try {
                    const batchResponse = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
                        method: 'POST',
                        apikey: NEW_DB.key,
                        body: batch
                    });
                    
                    if (batchResponse.status === 201) {
                        totalMigrated += batch.length;
                        console.log(`✅ Batch ${i + 1}/${totalBatches}: ${batch.length} records`);
                    } else {
                        console.log(`⚠️  Batch ${i + 1} failed: ${batchResponse.status}`);
                    }
                } catch (error) {
                    console.log(`❌ Batch ${i + 1} error: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`📊 Total migrated: ${totalMigrated.toLocaleString()} records`);
            return { migrated: totalMigrated, skipped: oldRecords.length - totalMigrated };
        }
    } catch (error) {
        console.log(`❌ Migration failed: ${error.message}`);
        return { migrated: 0, skipped: oldRecords.length };
    }
}

async function migrateAllMissingData() {
    console.log('🚀 COMPLETE DATABASE MIGRATION - ALL MISSING DATA');
    console.log('='.repeat(80));
    
    // All tables to check and migrate
    const allTables = [
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
    
    const migrationResults = {};
    let totalOldRecords = 0;
    let totalNewRecords = 0;
    let totalMigrated = 0;
    
    // Step 1: Get ALL records from OLD database
    console.log('\n📊 STEP 1: GETTING ALL RECORDS FROM OLD DATABASE');
    console.log('='.repeat(60));
    
    const oldData = {};
    for (const tableName of allTables) {
        const records = await getAllRecordsFromTable(OLD_DB, tableName, 'OLD DATABASE');
        oldData[tableName] = records;
        totalOldRecords += records.length;
    }
    
    console.log(`\n📊 OLD DATABASE TOTAL: ${totalOldRecords.toLocaleString()} records`);
    
    // Step 2: Get ALL records from NEW database
    console.log('\n📊 STEP 2: GETTING ALL RECORDS FROM NEW DATABASE');
    console.log('='.repeat(60));
    
    const newData = {};
    for (const tableName of allTables) {
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'NEW DATABASE');
        newData[tableName] = records;
        totalNewRecords += records.length;
    }
    
    console.log(`\n📊 NEW DATABASE TOTAL: ${totalNewRecords.toLocaleString()} records`);
    
    // Step 3: Migrate ALL missing data
    console.log('\n📊 STEP 3: MIGRATING ALL MISSING DATA');
    console.log('='.repeat(60));
    
    for (const tableName of allTables) {
        const result = await migrateTableData(tableName, oldData[tableName], newData[tableName]);
        migrationResults[tableName] = result;
        totalMigrated += result.migrated;
    }
    
    // Step 4: Final verification
    console.log('\n📊 STEP 4: FINAL VERIFICATION');
    console.log('='.repeat(60));
    
    const finalNewData = {};
    let finalTotalNewRecords = 0;
    
    for (const tableName of allTables) {
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'FINAL CHECK');
        finalNewData[tableName] = records;
        finalTotalNewRecords += records.length;
    }
    
    // Final comparison
    console.log('\n📊 FINAL COMPLETE COMPARISON:');
    console.log('='.repeat(80));
    console.log('Table Name'.padEnd(25) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status');
    console.log('-'.repeat(80));
    
    let totalMissing = 0;
    let allPerfect = true;
    
    for (const tableName of allTables) {
        const oldCount = oldData[tableName].length;
        const newCount = finalNewData[tableName].length;
        const diff = oldCount - newCount;
        totalMissing += diff;
        
        let status = '';
        if (oldCount === newCount) {
            status = '✅ Perfect';
        } else if (newCount > oldCount) {
            status = '✅ Extra';
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
    console.log(`TOTAL OLD:  ${totalOldRecords.toLocaleString()}`);
    console.log(`TOTAL NEW:  ${finalTotalNewRecords.toLocaleString()}`);
    console.log(`MISSING:    ${totalMissing.toLocaleString()}`);
    console.log(`MIGRATED:   ${totalMigrated.toLocaleString()}`);
    
    if (allPerfect) {
        console.log('\n🎉 PERFECT MIGRATION! ALL DATA MIGRATED!');
    } else if (totalMissing <= 0) {
        console.log('\n✅ COMPLETE MIGRATION! All data successfully migrated!');
    } else {
        console.log(`\n⚠️  MIGRATION STATUS: ${totalMissing.toLocaleString()} records still missing`);
    }
    
    return {
        oldData,
        newData: finalNewData,
        migrationResults,
        totalOldRecords,
        totalNewRecords: finalTotalNewRecords,
        totalMigrated,
        totalMissing,
        allPerfect
    };
}

// Main execution
if (require.main === module) {
    migrateAllMissingData().catch(console.error);
}

module.exports = { migrateAllMissingData };
