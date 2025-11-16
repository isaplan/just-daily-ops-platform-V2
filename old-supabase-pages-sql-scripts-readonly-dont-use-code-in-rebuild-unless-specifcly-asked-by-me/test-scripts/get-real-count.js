/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/get-real-count.js
 */

#!/usr/bin/env node

/**
 * Get the REAL record count using pagination
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

async function getRealCount(tableName) {
    console.log(`\n🔍 Getting REAL count for ${tableName}:`);
    console.log('='.repeat(50));
    
    try {
        // Method 1: Use Content-Range header
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}?select=*`, {
            apikey: NEW_DB.key
        });
        
        if (response.status === 200) {
            const contentRange = response.headers['content-range'];
            console.log(`📊 Content-Range header: ${contentRange}`);
            
            if (contentRange) {
                // Parse "0-999/7182" format
                const match = contentRange.match(/\d+-\d+\/(\d+)/);
                if (match) {
                    const totalCount = parseInt(match[1]);
                    console.log(`✅ REAL TOTAL COUNT: ${totalCount.toLocaleString()} records`);
                    return totalCount;
                }
            }
            
            // Fallback: count returned records
            const recordCount = response.data.length;
            console.log(`📊 Returned records: ${recordCount.toLocaleString()}`);
            console.log(`⚠️  This might be limited by pagination (max 1000)`);
            return recordCount;
        } else {
            console.log(`❌ Error: ${response.status}`);
            return 0;
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return 0;
    }
}

async function checkAllTables() {
    console.log('📊 GETTING REAL RECORD COUNTS');
    console.log('='.repeat(60));
    
    const tables = [
        'powerbi_pnl_data',
        'pnl_line_items', 
        'pnl_monthly_summary',
        'sales_imports',
        'sales_import_items'
    ];
    
    let totalRecords = 0;
    
    for (const tableName of tables) {
        const count = await getRealCount(tableName);
        totalRecords += count;
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`📊 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
    
    if (totalRecords >= 7000) {
        console.log('🎉 EXCELLENT! Large dataset successfully migrated!');
    } else if (totalRecords >= 1000) {
        console.log('✅ Good migration, but might be missing some data');
    } else {
        console.log('⚠️  Low record count - migration might be incomplete');
    }
}

// Main execution
if (require.main === module) {
    checkAllTables().catch(console.error);
}

module.exports = { getRealCount, checkAllTables };
