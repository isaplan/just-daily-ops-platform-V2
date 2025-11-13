/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/check-database-stats.js
 */

#!/usr/bin/env node

/**
 * Database Statistics Checker
 * Shows detailed record counts for both old and new databases
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

// Tables to check
const TABLES_TO_CHECK = [
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

async function checkDatabase(db, dbName) {
    console.log(`\n🔍 Checking ${dbName}...`);
    console.log('='.repeat(50));
    
    const results = {
        database: dbName,
        tables: {},
        totalRecords: 0,
        connectionStatus: 'unknown'
    };

    for (const tableName of TABLES_TO_CHECK) {
        try {
            const response = await makeRequest(`${db.url}/rest/v1/${tableName}?select=count`, {
                apikey: db.key
            });

            if (response.status === 200) {
                const count = response.data.length;
                results.tables[tableName] = count;
                results.totalRecords += count;
                results.connectionStatus = 'connected';
                
                const status = count > 0 ? '✅' : '⚠️';
                console.log(`${status} ${tableName.padEnd(25)}: ${count.toLocaleString().padStart(8)} records`);
            } else if (response.status === 404) {
                results.tables[tableName] = 0;
                console.log(`❌ ${tableName.padEnd(25)}: Table not found`);
            } else {
                results.tables[tableName] = 0;
                console.log(`❌ ${tableName.padEnd(25)}: Error ${response.status}`);
            }
        } catch (error) {
            results.tables[tableName] = 0;
            console.log(`❌ ${tableName.padEnd(25)}: ${error.message}`);
        }
    }

    console.log(`${'='.repeat(50)}`);
    console.log(`📊 Total Records: ${results.totalRecords.toLocaleString()}`);
    console.log(`🔗 Connection: ${results.connectionStatus}`);
    
    return results;
}

async function compareDatabases() {
    console.log('📊 Database Statistics Comparison');
    console.log('='.repeat(60));
    
    const oldResults = await checkDatabase(OLD_DB, 'Old Database (cajxmwyiwrhzryvawjkm)');
    const newResults = await checkDatabase(NEW_DB, 'New Database (vrucbxdudchboznunndz)');
    
    // Comparison summary
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Old Database Total:  ${oldResults.totalRecords.toLocaleString().padStart(8)} records`);
    console.log(`New Database Total:  ${newResults.totalRecords.toLocaleString().padStart(8)} records`);
    
    if (oldResults.totalRecords === newResults.totalRecords) {
        console.log('✅ Perfect Migration! All records migrated successfully.');
    } else if (newResults.totalRecords > 0) {
        const percentage = ((newResults.totalRecords / oldResults.totalRecords) * 100).toFixed(1);
        console.log(`⚠️  Partial Migration: ${percentage}% of records migrated.`);
    } else {
        console.log('❌ No Data Migrated: New database is empty.');
    }
    
    // Table-by-table comparison
    console.log('\n📋 Table-by-Table Comparison:');
    console.log('='.repeat(60));
    console.log('Table Name'.padEnd(25) + 'Old'.padStart(8) + 'New'.padStart(8) + 'Status');
    console.log('-'.repeat(60));
    
    for (const tableName of TABLES_TO_CHECK) {
        const oldCount = oldResults.tables[tableName] || 0;
        const newCount = newResults.tables[tableName] || 0;
        
        let status = '';
        if (oldCount === newCount) {
            status = '✅ Match';
        } else if (newCount > 0) {
            status = '⚠️  Partial';
        } else {
            status = '❌ Missing';
        }
        
        console.log(
            tableName.padEnd(25) + 
            oldCount.toLocaleString().padStart(8) + 
            newCount.toLocaleString().padStart(8) + 
            status
        );
    }
}

// Main execution
if (require.main === module) {
    compareDatabases().catch(console.error);
}

module.exports = { checkDatabase, compareDatabases };
