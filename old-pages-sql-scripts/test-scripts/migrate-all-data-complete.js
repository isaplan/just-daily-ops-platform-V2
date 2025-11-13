/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/migrate-all-data-complete.js
 */

#!/usr/bin/env node

/**
 * MIGRATE ALL DATA - COMPLETE REBUILD
 * After tables are created, migrate ALL data from old to new database
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

// ALL 65 TABLES
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

async function migrateTableData(tableName, oldRecords) {
    console.log(`\n📊 MIGRATING ${tableName}:`);
    console.log('='.repeat(50));
    console.log(`📊 Records to migrate: ${oldRecords.length.toLocaleString()}`);
    
    if (oldRecords.length === 0) {
        console.log(`✅ No data to migrate for ${tableName}`);
        return { migrated: 0, status: 'No Data' };
    }
    
    // Try to migrate all records
    console.log(`🚀 Attempting to migrate ${oldRecords.length} records...`);
    
    try {
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
            method: 'POST',
            apikey: NEW_DB.key,
            body: oldRecords
        });
        
        if (response.status === 201) {
            console.log(`✅ Successfully migrated ${oldRecords.length} records`);
            return { migrated: oldRecords.length, status: 'Success' };
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
                        console.log(`Response:`, batchResponse.data);
                    }
                } catch (error) {
                    console.log(`❌ Batch ${i + 1} error: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`📊 Total migrated: ${totalMigrated.toLocaleString()} records`);
            return { 
                migrated: totalMigrated, 
                status: totalMigrated > 0 ? 'Partial' : 'Failed' 
            };
        }
    } catch (error) {
        console.log(`❌ Migration failed: ${error.message}`);
        return { migrated: 0, status: 'Failed' };
    }
}

async function migrateAllDataComplete() {
    console.log('🚀 MIGRATE ALL DATA - COMPLETE REBUILD');
    console.log('='.repeat(80));
    console.log(`📊 Migrating data for ${ALL_65_TABLES.length} tables`);
    console.log('='.repeat(80));
    
    const results = {
        totalTables: ALL_65_TABLES.length,
        tablesWithData: 0,
        tablesMigrated: 0,
        tablesFailed: 0,
        totalRecords: 0,
        totalMigrated: 0
    };
    
    // Step 1: Get all data from OLD database
    console.log('\n📊 STEP 1: GETTING ALL DATA FROM OLD DATABASE');
    console.log('='.repeat(60));
    
    const oldData = {};
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Processing table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        const records = await getAllRecordsFromTable(OLD_DB, tableName, 'OLD DATABASE');
        oldData[tableName] = records;
        
        if (records.length > 0) {
            results.tablesWithData++;
            results.totalRecords += records.length;
        }
    }
    
    console.log(`\n📊 OLD DATABASE SUMMARY:`);
    console.log(`📊 Tables with data: ${results.tablesWithData}`);
    console.log(`📊 Total records: ${results.totalRecords.toLocaleString()}`);
    
    // Step 2: Migrate all data to NEW database
    console.log('\n📊 STEP 2: MIGRATING ALL DATA TO NEW DATABASE');
    console.log('='.repeat(60));
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Migrating table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        
        const result = await migrateTableData(tableName, oldData[tableName]);
        results.totalMigrated += result.migrated;
        
        if (result.status === 'Success') {
            results.tablesMigrated++;
        } else if (result.status === 'Failed') {
            results.tablesFailed++;
        }
    }
    
    // Step 3: Final summary
    console.log('\n📊 FINAL MIGRATION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`📊 Total Tables: ${results.totalTables}`);
    console.log(`📊 Tables with Data: ${results.tablesWithData}`);
    console.log(`📊 Tables Migrated: ${results.tablesMigrated}`);
    console.log(`📊 Tables Failed: ${results.tablesFailed}`);
    console.log(`📊 Total Records: ${results.totalRecords.toLocaleString()}`);
    console.log(`📊 Records Migrated: ${results.totalMigrated.toLocaleString()}`);
    console.log(`📊 Migration Rate: ${((results.totalMigrated / results.totalRecords) * 100).toFixed(2)}%`);
    
    if (results.tablesMigrated > 0) {
        console.log('\n🎉 MIGRATION SUCCESS! Data successfully migrated!');
    } else {
        console.log('\n⚠️  MIGRATION FAILED - No data was migrated');
    }
    
    return results;
}

// Main execution
if (require.main === module) {
    migrateAllDataComplete().catch(console.error);
}

module.exports = { migrateAllDataComplete };
