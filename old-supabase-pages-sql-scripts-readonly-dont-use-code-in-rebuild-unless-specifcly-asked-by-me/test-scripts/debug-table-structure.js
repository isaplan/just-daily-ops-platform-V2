/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/debug-table-structure.js
 */

#!/usr/bin/env node

/**
 * Debug table structures and get actual record counts
 * Check if there are schema differences causing the count issues
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

async function debugTable(db, tableName, dbName) {
    console.log(`\n🔍 DEBUGGING ${tableName} in ${dbName}:`);
    console.log('='.repeat(60));
    
    try {
        // Try to get a sample record to see the structure
        const sampleResponse = await makeRequest(`${db.url}/rest/v1/${tableName}?limit=1`, {
            apikey: db.key
        });
        
        if (sampleResponse.status === 200) {
            console.log(`✅ Table exists and accessible`);
            console.log(`📊 Sample record:`, JSON.stringify(sampleResponse.data, null, 2));
        } else {
            console.log(`❌ Error accessing table: ${sampleResponse.status}`);
            console.log(`Response:`, sampleResponse.data);
        }
        
        // Try different count methods
        console.log(`\n🔢 Trying different count methods:`);
        
        // Method 1: select=count
        const countResponse1 = await makeRequest(`${db.url}/rest/v1/${tableName}?select=count`, {
            apikey: db.key
        });
        console.log(`Method 1 (select=count): ${countResponse1.status} - ${countResponse1.data?.length || 'N/A'}`);
        
        // Method 2: select=* and count length
        const countResponse2 = await makeRequest(`${db.url}/rest/v1/${tableName}?select=*`, {
            apikey: db.key
        });
        if (countResponse2.status === 200) {
            console.log(`Method 2 (select=*): ${countResponse2.data.length} records`);
        } else {
            console.log(`Method 2 failed: ${countResponse2.status}`);
        }
        
        // Method 3: Try with limit to see if there are more records
        const limitResponse = await makeRequest(`${db.url}/rest/v1/${tableName}?limit=10`, {
            apikey: db.key
        });
        if (limitResponse.status === 200) {
            console.log(`Method 3 (limit=10): ${limitResponse.data.length} records (showing first 10)`);
        }
        
    } catch (error) {
        console.log(`❌ Error debugging table: ${error.message}`);
    }
}

async function debugCriticalTables() {
    console.log('🔍 DEBUGGING CRITICAL TABLES');
    console.log('='.repeat(80));
    
    const criticalTables = ['pnl_line_items', 'pnl_monthly_summary', 'powerbi_pnl_data'];
    
    for (const tableName of criticalTables) {
        await debugTable(OLD_DB, tableName, 'OLD DATABASE');
        await debugTable(NEW_DB, tableName, 'NEW DATABASE');
        console.log('\n' + '='.repeat(80));
    }
}

// Main execution
if (require.main === module) {
    debugCriticalTables().catch(console.error);
}

module.exports = { debugTable, debugCriticalTables };
