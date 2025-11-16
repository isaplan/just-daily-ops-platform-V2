/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/check-actual-counts.js
 */

#!/usr/bin/env node

/**
 * Check ACTUAL record counts for specific tables
 * Focus on the tables with large datasets
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

// Critical tables with large datasets
const CRITICAL_TABLES = [
    'pnl_line_items',
    'pnl_monthly_summary', 
    'powerbi_pnl_data',
    'sales_import_items',
    'sales_imports'
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

async function getActualCount(db, tableName) {
    try {
        // Use count() function for precise counting
        const response = await makeRequest(`${db.url}/rest/v1/${tableName}?select=count`, {
            apikey: db.key
        });

        if (response.status === 200) {
            return response.data.length;
        } else {
            console.log(`❌ Error getting count for ${tableName}: ${response.status}`);
            return 0;
        }
    } catch (error) {
        console.log(`❌ Error getting count for ${tableName}: ${error.message}`);
        return 0;
    }
}

async function checkCriticalTables() {
    console.log('🔍 CHECKING CRITICAL TABLES WITH LARGE DATASETS');
    console.log('='.repeat(80));
    
    console.log('\n📊 OLD DATABASE ACTUAL COUNTS:');
    console.log('='.repeat(50));
    const oldCounts = {};
    let oldTotal = 0;
    
    for (const tableName of CRITICAL_TABLES) {
        const count = await getActualCount(OLD_DB, tableName);
        oldCounts[tableName] = count;
        oldTotal += count;
        console.log(`✅ ${tableName.padEnd(20)}: ${count.toLocaleString().padStart(10)} records`);
    }
    
    console.log(`${'='.repeat(50)}`);
    console.log(`📊 OLD DATABASE TOTAL: ${oldTotal.toLocaleString()} records`);
    
    console.log('\n📊 NEW DATABASE ACTUAL COUNTS:');
    console.log('='.repeat(50));
    const newCounts = {};
    let newTotal = 0;
    
    for (const tableName of CRITICAL_TABLES) {
        const count = await getActualCount(NEW_DB, tableName);
        newCounts[tableName] = count;
        newTotal += count;
        console.log(`✅ ${tableName.padEnd(20)}: ${count.toLocaleString().padStart(10)} records`);
    }
    
    console.log(`${'='.repeat(50)}`);
    console.log(`📊 NEW DATABASE TOTAL: ${newTotal.toLocaleString()} records`);
    
    // Critical comparison
    console.log('\n🚨 CRITICAL MIGRATION ANALYSIS:');
    console.log('='.repeat(80));
    console.log('Table Name'.padEnd(20) + 'OLD'.padStart(10) + 'NEW'.padStart(10) + 'DIFF'.padStart(10) + 'Status');
    console.log('-'.repeat(80));
    
    let totalMissing = 0;
    let allPerfect = true;
    
    for (const tableName of CRITICAL_TABLES) {
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
            tableName.padEnd(20) + 
            oldCount.toLocaleString().padStart(10) + 
            newCount.toLocaleString().padStart(10) + 
            diff.toLocaleString().padStart(10) + 
            status
        );
    }
    
    console.log('-'.repeat(80));
    console.log(`TOTAL MISSING: ${totalMissing.toLocaleString()} records`);
    
    if (allPerfect) {
        console.log('\n🎉 PERFECT MIGRATION! All critical data migrated successfully.');
    } else {
        console.log('\n🚨 INCOMPLETE MIGRATION! Critical data is missing!');
        console.log('You need to run a FULL migration to get all your data.');
    }
    
    return { oldCounts, newCounts, totalMissing, allPerfect };
}

// Main execution
if (require.main === module) {
    checkCriticalTables().catch(console.error);
}

module.exports = { checkCriticalTables };
