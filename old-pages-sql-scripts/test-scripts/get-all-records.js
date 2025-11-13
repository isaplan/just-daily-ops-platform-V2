/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/get-all-records.js
 */

#!/usr/bin/env node

/**
 * Get ALL records by cycling through pagination
 * Work around Supabase limits to get exact counts
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

async function getAllRecords(db, tableName, dbName) {
    console.log(`\n🔍 Getting ALL records for ${tableName} in ${dbName}:`);
    console.log('='.repeat(60));
    
    let totalCount = 0;
    let offset = 0;
    const limit = 1000; // Max per request
    let hasMore = true;
    let batchNumber = 1;
    
    while (hasMore) {
        try {
            console.log(`📦 Batch ${batchNumber}: Fetching records ${offset + 1}-${offset + limit}...`);
            
            const response = await makeRequest(`${db.url}/rest/v1/${tableName}?limit=${limit}&offset=${offset}`, {
                apikey: db.key
            });
            
            if (response.status === 200) {
                const records = response.data;
                const batchCount = records.length;
                totalCount += batchCount;
                
                console.log(`✅ Batch ${batchNumber}: Got ${batchCount} records (Total so far: ${totalCount})`);
                
                // Check if we got less than the limit (end of data)
                if (batchCount < limit) {
                    hasMore = false;
                    console.log(`🏁 Reached end of data (got ${batchCount} < ${limit})`);
                } else {
                    offset += limit;
                    batchNumber++;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                console.log(`❌ Batch ${batchNumber} failed: ${response.status}`);
                console.log(`Response:`, response.data);
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

async function compareAllDatabases() {
    console.log('📊 COMPREHENSIVE DATABASE COMPARISON');
    console.log('='.repeat(80));
    
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
    
    // Get counts for old database
    console.log('\n🔍 OLD DATABASE COUNTS:');
    console.log('='.repeat(50));
    let oldTotal = 0;
    
    for (const tableName of tables) {
        const count = await getAllRecords(OLD_DB, tableName, 'OLD DATABASE');
        oldCounts[tableName] = count;
        oldTotal += count;
    }
    
    console.log(`\n📊 OLD DATABASE TOTAL: ${oldTotal.toLocaleString()} records`);
    
    // Get counts for new database
    console.log('\n🔍 NEW DATABASE COUNTS:');
    console.log('='.repeat(50));
    let newTotal = 0;
    
    for (const tableName of tables) {
        const count = await getAllRecords(NEW_DB, tableName, 'NEW DATABASE');
        newCounts[tableName] = count;
        newTotal += count;
    }
    
    console.log(`\n📊 NEW DATABASE TOTAL: ${newTotal.toLocaleString()} records`);
    
    // Final comparison
    console.log('\n📊 FINAL COMPARISON:');
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
    console.log(`TOTAL RECORDS OLD:  ${oldTotal.toLocaleString()}`);
    console.log(`TOTAL RECORDS NEW:  ${newTotal.toLocaleString()}`);
    console.log(`TOTAL MISSING:     ${totalMissing.toLocaleString()}`);
    
    if (allPerfect) {
        console.log('\n🎉 PERFECT MIGRATION! All data successfully migrated!');
    } else if (totalMissing === 0) {
        console.log('\n✅ COMPLETE MIGRATION! All records accounted for!');
    } else {
        console.log(`\n⚠️  INCOMPLETE MIGRATION! ${totalMissing.toLocaleString()} records missing`);
    }
    
    return { oldCounts, newCounts, oldTotal, newTotal, totalMissing, allPerfect };
}

// Main execution
if (require.main === module) {
    compareAllDatabases().catch(console.error);
}

module.exports = { getAllRecords, compareAllDatabases };
