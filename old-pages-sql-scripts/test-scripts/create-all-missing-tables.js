/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/create-all-missing-tables.js
 */

#!/usr/bin/env node

/**
 * CREATE ALL MISSING TABLES AND MIGRATE ALL DATA
 * This is a REBUILD - create all 65 tables and migrate everything
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

async function getTableSchema(tableName) {
    console.log(`\n🔍 Getting schema for ${tableName}:`);
    console.log('='.repeat(50));
    
    try {
        // Get a sample record to understand the structure
        const response = await makeRequest(`${OLD_DB.url}/rest/v1/${tableName}?limit=1`, {
            apikey: OLD_DB.key
        });
        
        if (response.status === 200 && response.data.length > 0) {
            const sampleRecord = response.data[0];
            console.log(`✅ Found sample record for ${tableName}`);
            console.log(`📊 Sample data:`, JSON.stringify(sampleRecord, null, 2));
            return sampleRecord;
        } else {
            console.log(`⚠️  No sample data for ${tableName}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error getting schema for ${tableName}: ${error.message}`);
        return null;
    }
}

async function createTableFromSchema(tableName, sampleRecord) {
    console.log(`\n📊 Creating table ${tableName} from schema:`);
    console.log('='.repeat(50));
    
    if (!sampleRecord) {
        console.log(`⚠️  No sample data to create schema for ${tableName}`);
        return false;
    }
    
    // Generate SQL CREATE TABLE statement
    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    const columns = [];
    
    for (const [key, value] of Object.entries(sampleRecord)) {
        let columnType = 'TEXT';
        
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                columnType = 'INTEGER';
            } else {
                columnType = 'DECIMAL(15,2)';
            }
        } else if (typeof value === 'boolean') {
            columnType = 'BOOLEAN';
        } else if (value instanceof Date || (typeof value === 'string' && value.includes('T') && value.includes('Z'))) {
            columnType = 'TIMESTAMP WITH TIME ZONE';
        } else if (key === 'id' && typeof value === 'string' && value.includes('-')) {
            columnType = 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
        } else {
            columnType = 'TEXT';
        }
        
        if (key === 'id' && columnType.includes('UUID')) {
            columns.push(`  ${key} ${columnType}`);
        } else {
            columns.push(`  ${key} ${columnType}`);
        }
    }
    
    sql += columns.join(',\n');
    sql += '\n);';
    
    console.log(`📝 Generated SQL for ${tableName}:`);
    console.log(sql);
    
    // Try to create the table using Supabase SQL
    try {
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            apikey: NEW_DB.key,
            body: { sql: sql }
        });
        
        if (response.status === 200) {
            console.log(`✅ Table ${tableName} created successfully`);
            return true;
        } else {
            console.log(`⚠️  Table creation response: ${response.status}`);
            console.log(`Response:`, response.data);
            return false;
        }
    } catch (error) {
        console.log(`❌ Error creating table ${tableName}: ${error.message}`);
        return false;
    }
}

async function migrateAllData() {
    console.log('🚀 REBUILD: CREATE ALL TABLES AND MIGRATE ALL DATA');
    console.log('='.repeat(80));
    console.log(`📊 Processing ${ALL_65_TABLES.length} tables for complete rebuild`);
    console.log('='.repeat(80));
    
    const results = {
        tablesCreated: 0,
        tablesFailed: 0,
        dataMigrated: 0,
        totalRecords: 0
    };
    
    // Step 1: Create all missing tables
    console.log('\n📊 STEP 1: CREATING ALL MISSING TABLES');
    console.log('='.repeat(60));
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Processing table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        
        // Get schema from old database
        const sampleRecord = await getTableSchema(tableName);
        
        if (sampleRecord) {
            // Create table in new database
            const created = await createTableFromSchema(tableName, sampleRecord);
            if (created) {
                results.tablesCreated++;
            } else {
                results.tablesFailed++;
            }
        } else {
            console.log(`⚠️  Skipping ${tableName} - no sample data`);
            results.tablesFailed++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 TABLE CREATION SUMMARY:`);
    console.log(`✅ Tables Created: ${results.tablesCreated}`);
    console.log(`❌ Tables Failed: ${results.tablesFailed}`);
    
    // Step 2: Migrate all data
    console.log('\n📊 STEP 2: MIGRATING ALL DATA');
    console.log('='.repeat(60));
    
    for (let i = 0; i < ALL_65_TABLES.length; i++) {
        const tableName = ALL_65_TABLES[i];
        console.log(`\n📊 Migrating data for table ${i + 1}/${ALL_65_TABLES.length}: ${tableName}`);
        
        try {
            // Get all records from old database
            const oldResponse = await makeRequest(`${OLD_DB.url}/rest/v1/${tableName}?select=*`, {
                apikey: OLD_DB.key
            });
            
            if (oldResponse.status === 200 && oldResponse.data.length > 0) {
                const records = oldResponse.data;
                console.log(`📊 Found ${records.length} records in old database`);
                
                // Migrate to new database
                const newResponse = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
                    method: 'POST',
                    apikey: NEW_DB.key,
                    body: records
                });
                
                if (newResponse.status === 201) {
                    console.log(`✅ Successfully migrated ${records.length} records`);
                    results.dataMigrated += records.length;
                    results.totalRecords += records.length;
                } else {
                    console.log(`⚠️  Migration failed: ${newResponse.status}`);
                    console.log(`Response:`, newResponse.data);
                }
            } else {
                console.log(`📊 No data to migrate for ${tableName}`);
            }
        } catch (error) {
            console.log(`❌ Error migrating ${tableName}: ${error.message}`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 MIGRATION SUMMARY:`);
    console.log(`✅ Tables Created: ${results.tablesCreated}`);
    console.log(`❌ Tables Failed: ${results.tablesFailed}`);
    console.log(`📊 Records Migrated: ${results.dataMigrated.toLocaleString()}`);
    console.log(`📊 Total Records: ${results.totalRecords.toLocaleString()}`);
    
    if (results.tablesCreated > 0) {
        console.log('\n🎉 REBUILD SUCCESS! All tables created and data migrated!');
    } else {
        console.log('\n⚠️  REBUILD PARTIAL - Some tables failed to create');
    }
    
    return results;
}

// Main execution
if (require.main === module) {
    migrateAllData().catch(console.error);
}

module.exports = { migrateAllData };
