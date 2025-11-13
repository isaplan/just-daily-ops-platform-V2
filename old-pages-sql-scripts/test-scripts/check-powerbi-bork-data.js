/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/check-powerbi-bork-data.js
 */

#!/usr/bin/env node

/**
 * CHECK POWERBI & BORK DATA - COMPLETE OVERVIEW
 * Verify all financial and Bork-related data migration
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

// PowerBI & Bork related tables
const POWERBI_BORK_TABLES = [
    // PowerBI Financial Data
    'powerbi_pnl_data',
    'pnl_line_items', 
    'pnl_monthly_summary',
    'pnl_reports',
    'financial_insights',
    'financial_reports',
    'financial_chat_messages',
    'financial_chat_sessions',
    
    // Bork API Data
    'bork_sales_data',
    'bork_api_credentials',
    'bork_api_sync_logs',
    'bork_backfill_progress',
    'bork_backfill_queue',
    'bork_sync_config',
    
    // Sales & Import Data
    'sales_imports',
    'sales_import_items',
    'data_imports',
    'import_validation_logs',
    
    // Order & Revenue Data
    'orders',
    'order_groups', 
    'order_history',
    'returns',
    'return_items',
    
    // Product & Menu Data
    'products',
    'product_locations',
    'product_recipes',
    'product_recipe_ingredients',
    'menu_items',
    'menu_sections',
    'menu_section_products',
    'menu_versions',
    'menu_product_price_history',
    
    // Locations & Suppliers
    'locations',
    'suppliers',
    'supplier_orders'
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

async function getRealCount(db, tableName, dbName) {
    try {
        let totalCount = 0;
        let offset = 0;
        const limit = 1000;
        
        while (true) {
            const response = await makeRequest(`${db.url}/rest/v1/${tableName}?select=*&limit=${limit}&offset=${offset}`, {
                apikey: db.key
            });
            
            if (response.status === 404) {
                return 'TABLE_NOT_FOUND';
            } else if (response.status !== 200) {
                return 'ERROR';
            }
            
            const records = response.data;
            if (!Array.isArray(records)) {
                return 'ERROR';
            }
            
            totalCount += records.length;
            
            // If we got fewer records than the limit, we've reached the end
            if (records.length < limit) {
                break;
            }
            
            offset += limit;
            
            // Safety check to prevent infinite loops
            if (offset > 100000) {
                break;
            }
        }
        
        return totalCount;
    } catch (error) {
        return 'ERROR';
    }
}

async function checkPowerBIBorkData() {
    console.log('📊 POWERBI & BORK DATA MIGRATION CHECK');
    console.log('='.repeat(100));
    console.log('OLD DATABASE: https://cajxmwyiwrhzryvawjkm.supabase.co');
    console.log('NEW DATABASE: https://vrucbxdudchboznunndz.supabase.co');
    console.log('='.repeat(100));
    
    const results = [];
    let totalOldRecords = 0;
    let totalNewRecords = 0;
    let tablesWithData = 0;
    let tablesMigrated = 0;
    let tablesNotFound = 0;
    let tablesWithErrors = 0;
    
    console.log('\n📊 CHECKING POWERBI & BORK RELATED TABLES...');
    console.log('='.repeat(100));
    console.log('Table Name'.padEnd(35) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status'.padStart(15) + 'Notes'.padStart(20));
    console.log('-'.repeat(100));
    
    for (let i = 0; i < POWERBI_BORK_TABLES.length; i++) {
        const tableName = POWERBI_BORK_TABLES[i];
        process.stdout.write(`\r📊 Processing ${i + 1}/${POWERBI_BORK_TABLES.length}: ${tableName.padEnd(30)}`);
        
        const oldCount = await getRealCount(OLD_DB, tableName, 'OLD');
        const newCount = await getRealCount(NEW_DB, tableName, 'NEW');
        
        let status = '';
        let notes = '';
        let diff = 0;
        
        if (oldCount === 'TABLE_NOT_FOUND') {
            status = '❌ Not Found';
            notes = 'Table missing';
            tablesNotFound++;
        } else if (oldCount === 'ERROR') {
            status = '⚠️  Error';
            notes = 'Connection error';
            tablesWithErrors++;
        } else if (newCount === 'TABLE_NOT_FOUND') {
            status = '❌ Not Created';
            notes = 'Table not created';
            tablesNotFound++;
        } else if (newCount === 'ERROR') {
            status = '⚠️  Error';
            notes = 'Connection error';
            tablesWithErrors++;
        } else {
            diff = newCount - oldCount;
            
            if (oldCount > 0) {
                tablesWithData++;
            }
            
            if (oldCount === newCount) {
                status = '✅ Perfect';
                notes = 'Complete match';
                tablesMigrated++;
            } else if (newCount > oldCount) {
                status = '✅ Extra';
                notes = `+${diff} records`;
                tablesMigrated++;
            } else if (newCount > 0) {
                status = '⚠️  Partial';
                notes = `${newCount}/${oldCount} records`;
                tablesMigrated++;
            } else {
                status = '❌ Missing';
                notes = 'No data migrated';
            }
            
            totalOldRecords += typeof oldCount === 'number' ? oldCount : 0;
            totalNewRecords += typeof newCount === 'number' ? newCount : 0;
        }
        
        results.push({
            tableName,
            oldCount,
            newCount,
            diff,
            status,
            notes
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n');
    console.log('='.repeat(100));
    
    // Display results
    for (const result of results) {
        const oldDisplay = result.oldCount === 'TABLE_NOT_FOUND' ? 'N/A' : 
                          result.oldCount === 'ERROR' ? 'ERR' : 
                          result.oldCount.toString();
        
        const newDisplay = result.newCount === 'TABLE_NOT_FOUND' ? 'N/A' : 
                          result.newCount === 'ERROR' ? 'ERR' : 
                          result.newCount.toString();
        
        const diffDisplay = typeof result.diff === 'number' ? result.diff.toString() : 'N/A';
        
        console.log(
            result.tableName.padEnd(35) + 
            oldDisplay.padStart(10) + 
            newDisplay.padStart(10) + 
            diffDisplay.padStart(10) + 
            result.status.padStart(15) +
            result.notes.padStart(20)
        );
    }
    
    console.log('='.repeat(100));
    
    // Summary
    console.log('\n📊 POWERBI & BORK DATA SUMMARY:');
    console.log('='.repeat(60));
    console.log(`📊 Total Tables: ${POWERBI_BORK_TABLES.length}`);
    console.log(`📊 Tables with Data: ${tablesWithData}`);
    console.log(`📊 Tables Migrated: ${tablesMigrated}`);
    console.log(`📊 Tables Not Found: ${tablesNotFound}`);
    console.log(`📊 Tables with Errors: ${tablesWithErrors}`);
    console.log(`📊 Total Old Records: ${totalOldRecords.toLocaleString()}`);
    console.log(`📊 Total New Records: ${totalNewRecords.toLocaleString()}`);
    console.log(`📊 Migration Rate: ${tablesWithData > 0 ? ((tablesMigrated / tablesWithData) * 100).toFixed(2) : 0}%`);
    console.log(`📊 Data Migration Rate: ${totalOldRecords > 0 ? ((totalNewRecords / totalOldRecords) * 100).toFixed(2) : 0}%`);
    
    // Key insights by category
    console.log('\n🔍 POWERBI FINANCIAL DATA:');
    console.log('='.repeat(60));
    const powerbiTables = results.filter(r => 
        r.tableName.includes('powerbi') || 
        r.tableName.includes('pnl') || 
        r.tableName.includes('financial')
    );
    powerbiTables.forEach(r => {
        console.log(`📊 ${r.tableName}: ${r.oldCount} → ${r.newCount} (${r.status})`);
    });
    
    console.log('\n🔍 BORK API DATA:');
    console.log('='.repeat(60));
    const borkTables = results.filter(r => r.tableName.includes('bork'));
    borkTables.forEach(r => {
        console.log(`📊 ${r.tableName}: ${r.oldCount} → ${r.newCount} (${r.status})`);
    });
    
    console.log('\n🔍 SALES & IMPORT DATA:');
    console.log('='.repeat(60));
    const salesTables = results.filter(r => 
        r.tableName.includes('sales') || 
        r.tableName.includes('import') || 
        r.tableName.includes('order')
    );
    salesTables.forEach(r => {
        console.log(`📊 ${r.tableName}: ${r.oldCount} → ${r.newCount} (${r.status})`);
    });
    
    console.log('\n🔍 PRODUCT & MENU DATA:');
    console.log('='.repeat(60));
    const productTables = results.filter(r => 
        r.tableName.includes('product') || 
        r.tableName.includes('menu')
    );
    productTables.forEach(r => {
        console.log(`📊 ${r.tableName}: ${r.oldCount} → ${r.newCount} (${r.status})`);
    });
    
    return {
        results,
        summary: {
            totalTables: POWERBI_BORK_TABLES.length,
            tablesWithData,
            tablesMigrated,
            tablesNotFound,
            tablesWithErrors,
            totalOldRecords,
            totalNewRecords,
            migrationRate: tablesWithData > 0 ? (tablesMigrated / tablesWithData) * 100 : 0,
            dataMigrationRate: totalOldRecords > 0 ? (totalNewRecords / totalOldRecords) * 100 : 0
        }
    };
}

// Main execution
if (require.main === module) {
    checkPowerBIBorkData().catch(console.error);
}

module.exports = { checkPowerBIBorkData };
