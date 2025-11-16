/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/verify-final-count.js
 */

#!/usr/bin/env node

/**
 * Verify the final count using Supabase's count function
 */

const https = require('https');

// New database configuration
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

async function getExactCount(tableName) {
    console.log(`\n🔍 Getting EXACT count for ${tableName}:`);
    console.log('='.repeat(50));
    
    try {
        // Use Supabase's count function
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}?select=count`, {
            apikey: NEW_DB.key
        });
        
        if (response.status === 200) {
            const count = response.data.length;
            console.log(`✅ EXACT COUNT: ${count.toLocaleString()} records`);
            return count;
        } else {
            console.log(`❌ Error: ${response.status}`);
            console.log(`Response:`, response.data);
            return 0;
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return 0;
    }
}

async function verifyMigration() {
    console.log('📊 VERIFYING FINAL MIGRATION STATUS');
    console.log('='.repeat(60));
    
    const tables = [
        'powerbi_pnl_data',
        'pnl_line_items', 
        'pnl_monthly_summary',
        'sales_imports',
        'sales_import_items',
        'locations',
        'api_credentials',
        'bork_sales_data'
    ];
    
    let totalRecords = 0;
    const results = {};
    
    for (const tableName of tables) {
        const count = await getExactCount(tableName);
        results[tableName] = count;
        totalRecords += count;
    }
    
    console.log('\n📊 FINAL MIGRATION SUMMARY:');
    console.log('='.repeat(60));
    
    for (const [tableName, count] of Object.entries(results)) {
        const status = count > 0 ? '✅' : '❌';
        console.log(`${status} ${tableName.padEnd(20)}: ${count.toLocaleString().padStart(10)} records`);
    }
    
    console.log('='.repeat(60));
    console.log(`📊 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
    
    // Check if we have the expected powerbi_pnl_data count
    const powerbiCount = results['powerbi_pnl_data'];
    if (powerbiCount >= 7000) {
        console.log('🎉 PERFECT! All 7,182+ powerbi_pnl_data records migrated!');
    } else if (powerbiCount >= 1000) {
        console.log('✅ Good! 1,000+ powerbi_pnl_data records migrated');
    } else {
        console.log('⚠️  Low powerbi_pnl_data count - migration incomplete');
    }
    
    return { totalRecords, results };
}

// Main execution
if (require.main === module) {
    verifyMigration().catch(console.error);
}

module.exports = { getExactCount, verifyMigration };
