/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/check-all-65-tables-complete.js
 */

#!/usr/bin/env node

/**
 * CHECK ALL 65 TABLES - COMPLETE DATABASE AUDIT
 * Check EVERY single table, migrate ALL missing data
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

// ALL 65 TABLES from your database
const ALL_65_TABLES = [
    'api_credentials',
    'api_sync_logs',
    'bork_api_credentials',
    'bork_api_sync_logs',
    'bork_backfill_progress',
    'bork_backfill_queue',
    'bork_sales_data',
    'bork_sync_config',
    'combined_products',
    'comments',
    'daily_waste',
    'data_imports',
    'eitje_backfill_progress',
    'eitje_backfill_queue',
    'eitje_environments',
    'eitje_planning_shifts',
    'eitje_revenue_days',
    'eitje_shift_types',
    'eitje_shifts',
    'eitje_sync_config',
    'eitje_teams',
    'eitje_time_registration_shifts',
    'eitje_users',
    'execution_logs',
    'financial_chat_messages',
    'financial_chat_sessions',
    'financial_insights',
    'financial_reports',
    'import_validation_logs',
    'locations',
    'member_invitations',
    'menu_item_waste',
    'menu_items',
    'menu_product_price_history',
    'menu_section_products',
    'menu_sections',
    'menu_versions',
    'monthly_stock_count_items',
    'monthly_stock_counts',
    'order_groups',
    'order_history',
    'orders',
    'package_migrations',
    'package_usage_logs',
    'pnl_line_items',
    'pnl_monthly_summary',
    'pnl_reports',
    'powerbi_pnl_data',
    'product_locations',
    'product_recipe_ingredients',
    'product_recipes',
    'products',
    'profiles',
    'report_insights',
    'return_items',
    'returns',
    'roadmap_items',
    'sales_import_items',
    'sales_imports',
    'stock_levels',
    'stock_transactions',
    'storage_locations',
    'supplier_orders',
    'suppliers',
    'user_roles'
];

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
        return { migrated: 0, skipped: oldRecords.length, status: 'Complete' };
    }
    
    const missingCount = oldRecords.length - newRecords.length;
    console.log(`📊 Missing records: ${missingCount.toLocaleString()}`);
    
    if (missingCount === 0) {
        console.log(`✅ No migration needed for ${tableName}`);
        return { migrated: 0, skipped: oldRecords.length, status: 'Complete' };
    }
    
    // Try to migrate missing records
    console.log(`🚀 Attempting to migrate ${missingCount} records...`);
    
    try {
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
            method: 'POST',
            apikey: NEW_DB.key,
            body: oldRecords
        });
        
        if (response.status === 201) {
            console.log(`✅ Successfully migrated ${oldRecords.length} records`);
            return { migrated: oldRecords.length, skipped: 0, status: 'Migrated' };
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
            return { 
                migrated: totalMigrated, 
                skipped: oldRecords.length - totalMigrated, 
                status: totalMigrated > 0 ? 'Partial' : 'Failed' 
            };
        }
    } catch (error) {
        console.log(`❌ Migration failed: ${error.message}`);
        return { migrated: 0, skipped: oldRecords.length, status: 'Failed' };
    }
}

async function checkAll65TablesComplete() {
    console.log('🚀 CHECKING ALL 65 TABLES - COMPLETE DATABASE AUDIT');
    console.log('='.repeat(80));
    console.log(`📊 Checking ${ALL_65_TABLES.length} tables: ${ALL_65_TABLES.join(', ')}`);
    console.log('='.repeat(80));
    
    // Step 1: Get ALL records from OLD database
    console.log('\n📊 STEP 1: GETTING ALL RECORDS FROM OLD DATABASE');
    console.log('='.repeat(60));
    
    const oldData = {};
    let totalOldRecords = 0;
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Processing table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        const records = await getAllRecordsFromTable(OLD_DB, tableName, 'OLD DATABASE');
        oldData[tableName] = records;
        totalOldRecords += records.length;
    }
    
    console.log(`\n📊 OLD DATABASE TOTAL: ${totalOldRecords.toLocaleString()} records across ${ALL_65_TABLES.length} tables`);
    
    // Step 2: Get ALL records from NEW database
    console.log('\n📊 STEP 2: GETTING ALL RECORDS FROM NEW DATABASE');
    console.log('='.repeat(60));
    
    const newData = {};
    let totalNewRecords = 0;
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Processing table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'NEW DATABASE');
        newData[tableName] = records;
        totalNewRecords += records.length;
    }
    
    console.log(`\n📊 NEW DATABASE TOTAL: ${totalNewRecords.toLocaleString()} records across ${ALL_65_TABLES.length} tables`);
    
    // Step 3: Migrate ALL missing data
    console.log('\n📊 STEP 3: MIGRATING ALL MISSING DATA');
    console.log('='.repeat(60));
    
    const migrationResults = {};
    let totalMigrated = 0;
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Migrating table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        const result = await migrateTableData(tableName, oldData[tableName], newData[tableName]);
        migrationResults[tableName] = result;
        totalMigrated += result.migrated;
    }
    
    // Step 4: Final verification
    console.log('\n📊 STEP 4: FINAL VERIFICATION');
    console.log('='.repeat(60));
    
    const finalNewData = {};
    let finalTotalNewRecords = 0;
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Final check table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        const records = await getAllRecordsFromTable(NEW_DB, tableName, 'FINAL CHECK');
        finalNewData[tableName] = records;
        finalTotalNewRecords += records.length;
    }
    
    // Step 5: COMPLETE OVERVIEW OF ALL 65 TABLES
    console.log('\n📊 COMPLETE OVERVIEW OF ALL 65 TABLES:');
    console.log('='.repeat(120));
    console.log('Table Name'.padEnd(35) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status'.padStart(15) + 'Migration'.padStart(15));
    console.log('-'.repeat(120));
    
    let totalMissing = 0;
    let allPerfect = true;
    let migratedCount = 0;
    let failedCount = 0;
    let partialCount = 0;
    let completeCount = 0;
    
    for (const tableName of ALL_65_TABLES) {
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
        
        const migrationStatus = migrationResults[tableName].status;
        if (migrationStatus === 'Migrated') migratedCount++;
        else if (migrationStatus === 'Failed') failedCount++;
        else if (migrationStatus === 'Partial') partialCount++;
        else if (migrationStatus === 'Complete') completeCount++;
        
        console.log(
            tableName.padEnd(35) + 
            oldCount.toLocaleString().padStart(10) + 
            newCount.toLocaleString().padStart(10) + 
            diff.toLocaleString().padStart(10) + 
            status.padStart(15) +
            migrationStatus.padStart(15)
        );
    }
    
    console.log('-'.repeat(120));
    console.log(`TOTAL OLD:  ${totalOldRecords.toLocaleString()}`);
    console.log(`TOTAL NEW:  ${finalTotalNewRecords.toLocaleString()}`);
    console.log(`MISSING:    ${totalMissing.toLocaleString()}`);
    console.log(`MIGRATED:   ${totalMigrated.toLocaleString()}`);
    console.log(`TABLES:     ${ALL_65_TABLES.length} total tables checked`);
    console.log(`COMPLETE:   ${completeCount} tables already complete`);
    console.log(`SUCCESS:    ${migratedCount} tables successfully migrated`);
    console.log(`PARTIAL:    ${partialCount} tables partially migrated`);
    console.log(`FAILED:     ${failedCount} tables failed to migrate`);
    
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
        allPerfect,
        tableCount: ALL_65_TABLES.length,
        migratedCount,
        partialCount,
        failedCount,
        completeCount
    };
}

// Main execution
if (require.main === module) {
    checkAll65TablesComplete().catch(console.error);
}

module.exports = { checkAll65TablesComplete };
