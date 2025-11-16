/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/precise-database-count.js
 */

#!/usr/bin/env node

/**
 * Precise Database Record Counter
 * Shows exact record counts for both old and new databases
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

async function getPreciseCount(db, tableName) {
    try {
        // Use count() function for precise counting
        const response = await makeRequest(`${db.url}/rest/v1/${tableName}?select=count`, {
            apikey: db.key
        });

        if (response.status === 200) {
            return response.data.length;
        } else {
            return 0;
        }
    } catch (error) {
        return 0;
    }
}

async function checkDatabasePrecise(db, dbName) {
    console.log(`\n🔍 PRECISE COUNT: ${dbName}`);
    console.log('='.repeat(60));
    
    const results = {
        database: dbName,
        tables: {},
        totalRecords: 0
    };

    for (const tableName of TABLES_TO_CHECK) {
        const count = await getPreciseCount(db, tableName);
        results.tables[tableName] = count;
        results.totalRecords += count;
        
        const status = count > 0 ? '✅' : '❌';
        console.log(`${status} ${tableName.padEnd(25)}: ${count.toLocaleString().padStart(10)} records`);
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 TOTAL RECORDS: ${results.totalRecords.toLocaleString()}`);
    
    return results;
}

async function comparePreciseCounts() {
    console.log('📊 PRECISE DATABASE RECORD COUNTS');
    console.log('='.repeat(80));
    
    const oldResults = await checkDatabasePrecise(OLD_DB, 'OLD DATABASE (cajxmwyiwrhzryvawjkm)');
    const newResults = await checkDatabasePrecise(NEW_DB, 'NEW DATABASE (vrucbxdudchboznunndz)');
    
    // Precise comparison
    console.log('\n📊 PRECISE MIGRATION COMPARISON:');
    console.log('='.repeat(80));
    console.log(`OLD DATABASE TOTAL:  ${oldResults.totalRecords.toLocaleString().padStart(10)} records`);
    console.log(`NEW DATABASE TOTAL:  ${newResults.totalRecords.toLocaleString().padStart(10)} records`);
    
    if (oldResults.totalRecords === newResults.totalRecords) {
        console.log('✅ PERFECT MIGRATION! All records migrated successfully.');
    } else {
        const difference = oldResults.totalRecords - newResults.totalRecords;
        const percentage = ((newResults.totalRecords / oldResults.totalRecords) * 100).toFixed(2);
        console.log(`❌ INCOMPLETE MIGRATION! Missing ${difference.toLocaleString()} records (${percentage}% migrated)`);
    }
    
    // Table-by-table precise comparison
    console.log('\n📋 TABLE-BY-TABLE PRECISE COMPARISON:');
    console.log('='.repeat(80));
    console.log('Table Name'.padEnd(25) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status');
    console.log('-'.repeat(80));
    
    let totalMissing = 0;
    for (const tableName of TABLES_TO_CHECK) {
        const oldCount = oldResults.tables[tableName] || 0;
        const newCount = newResults.tables[tableName] || 0;
        const diff = oldCount - newCount;
        totalMissing += diff;
        
        let status = '';
        if (oldCount === newCount) {
            status = '✅ Perfect';
        } else if (newCount > 0) {
            status = '⚠️  Partial';
        } else {
            status = '❌ Missing';
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
    console.log(`TOTAL MISSING: ${totalMissing.toLocaleString()} records`);
    
    if (totalMissing > 0) {
        console.log('\n🚨 ACTION REQUIRED: Some data was not migrated!');
        console.log('You need to run the migration again or check for schema issues.');
    } else {
        console.log('\n🎉 ALL DATA SUCCESSFULLY MIGRATED!');
    }
}

// Main execution
if (require.main === module) {
    comparePreciseCounts().catch(console.error);
}

module.exports = { checkDatabasePrecise, comparePreciseCounts };
