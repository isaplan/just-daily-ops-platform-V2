/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/migrate-database.js
 */

#!/usr/bin/env node

/**
 * Supabase Database Migration Script
 * Migrates data from old Supabase project to new one
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

// Tables to migrate (in dependency order)
const TABLES_TO_MIGRATE = [
    'locations',
    'api_credentials', 
    'sales_imports',
    'sales_import_items',
    'bork_sales_data',
    'powerbi_pnl_data',
    'pnl_line_items',
    'pnl_monthly_summary'
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
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
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

// Test database connections
async function testConnections() {
    console.log('🔍 Testing database connections...\n');
    
    // Test old database
    try {
        const oldResponse = await makeRequest(`${OLD_DB.url}/rest/v1/locations?select=count`, {
            apikey: OLD_DB.key
        });
        
        if (oldResponse.status === 200) {
            console.log('✅ Old database connection successful');
        } else {
            console.log(`❌ Old database connection failed: ${oldResponse.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Old database error: ${error.message}`);
        return false;
    }
    
    // Test new database
    try {
        const newResponse = await makeRequest(`${NEW_DB.url}/rest/v1/locations?select=count`, {
            apikey: NEW_DB.key
        });
        
        if (newResponse.status === 200) {
            console.log('✅ New database connection successful\n');
            return true;
        } else {
            console.log(`❌ New database connection failed: ${newResponse.status}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ New database error: ${error.message}\n`);
        return false;
    }
}

// Migrate a single table
async function migrateTable(tableName) {
    console.log(`📦 Migrating table: ${tableName}...`);
    
    try {
        // Export from old database
        const exportResponse = await makeRequest(`${OLD_DB.url}/rest/v1/${tableName}?select=*`, {
            apikey: OLD_DB.key
        });
        
        if (exportResponse.status === 404) {
            console.log(`⚠️  Table '${tableName}' not found in old database - skipping`);
            return { success: true, skipped: true };
        }
        
        if (exportResponse.status !== 200) {
            throw new Error(`Export failed: ${exportResponse.status}`);
        }
        
        const data = exportResponse.data;
        console.log(`📊 Found ${data.length} records in ${tableName}`);
        
        if (data.length === 0) {
            console.log(`✅ Table '${tableName}' is empty - skipping`);
            return { success: true, skipped: true };
        }
        
        // Import to new database
        const importResponse = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}`, {
            method: 'POST',
            apikey: NEW_DB.key,
            headers: {
                'Prefer': 'resolution=ignore-duplicates'
            },
            body: data
        });
        
        if (importResponse.status === 201 || importResponse.status === 200) {
            console.log(`✅ Successfully migrated ${data.length} records to ${tableName}`);
            return { success: true, records: data.length };
        } else {
            console.log(`❌ Failed to import ${tableName}: ${importResponse.status}`);
            console.log(`   Response: ${JSON.stringify(importResponse.data)}`);
            return { success: false, error: importResponse.data };
        }
        
    } catch (error) {
        console.log(`❌ Error migrating ${tableName}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main migration function
async function startMigration() {
    console.log('🚀 Starting database migration...\n');
    
    const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        totalRecords: 0
    };
    
    for (let i = 0; i < TABLES_TO_MIGRATE.length; i++) {
        const tableName = TABLES_TO_MIGRATE[i];
        const progress = `[${i + 1}/${TABLES_TO_MIGRATE.length}]`;
        console.log(`${progress} Processing ${tableName}...`);
        
        const result = await migrateTable(tableName);
        
        if (result.success) {
            if (result.skipped) {
                results.skipped++;
            } else {
                results.successful++;
                results.totalRecords += result.records || 0;
            }
        } else {
            results.failed++;
        }
        
        console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${results.successful} tables`);
    console.log(`⚠️  Skipped: ${results.skipped} tables`);
    console.log(`❌ Failed: ${results.failed} tables`);
    console.log(`📦 Total records migrated: ${results.totalRecords}`);
    
    return results;
}

// Verify migration
async function verifyMigration() {
    console.log('🔍 Verifying migration...\n');
    
    for (const tableName of TABLES_TO_MIGRATE) {
        try {
            // Check old database
            const oldResponse = await makeRequest(`${OLD_DB.url}/rest/v1/${tableName}?select=count`, {
                apikey: OLD_DB.key
            });
            
            // Check new database
            const newResponse = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}?select=count`, {
                apikey: NEW_DB.key
            });
            
            if (oldResponse.status === 200 && newResponse.status === 200) {
                const oldCount = oldResponse.data.length;
                const newCount = newResponse.data.length;
                
                if (oldCount === newCount) {
                    console.log(`✅ ${tableName}: ${newCount} records (matches old database)`);
                } else {
                    console.log(`⚠️  ${tableName}: ${newCount} records (old had ${oldCount})`);
                }
            } else {
                console.log(`❌ Could not verify ${tableName}`);
            }
            
        } catch (error) {
            console.log(`❌ Error verifying ${tableName}: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    console.log('🔄 Supabase Database Migration Tool\n');
    
    switch (command) {
        case 'test':
            await testConnections();
            break;
            
        case 'migrate':
            const connectionOk = await testConnections();
            if (connectionOk) {
                await startMigration();
            } else {
                console.log('❌ Cannot proceed with migration - connection test failed');
                process.exit(1);
            }
            break;
            
        case 'verify':
            await verifyMigration();
            break;
            
        default:
            console.log('Usage: node migrate-database.js [test|migrate|verify]');
            console.log('  test    - Test database connections');
            console.log('  migrate - Run the migration');
            console.log('  verify  - Verify migration results');
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testConnections, startMigration, verifyMigration };
