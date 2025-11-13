/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/check-actual-data.js
 */

#!/usr/bin/env node

/**
 * Check actual data by sampling records
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

async function checkPowerbiData() {
    console.log('🔍 CHECKING ACTUAL POWERBI_PNL_DATA:');
    console.log('='.repeat(60));
    
    try {
        // Get a sample of records to verify data exists
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/powerbi_pnl_data?limit=5&order=created_at.desc`, {
            apikey: NEW_DB.key
        });
        
        if (response.status === 200) {
            const records = response.data;
            console.log(`📊 Sample records returned: ${records.length}`);
            
            if (records.length > 0) {
                console.log('\n📋 Sample data:');
                records.forEach((record, index) => {
                    console.log(`Record ${index + 1}:`);
                    console.log(`  ID: ${record.id}`);
                    console.log(`  Year: ${record.year}, Month: ${record.month}`);
                    console.log(`  Category: ${record.category}`);
                    console.log(`  Amount: ${record.amount}`);
                    console.log(`  Created: ${record.created_at}`);
                    console.log('');
                });
                
                // Check Content-Range header for total count
                const contentRange = response.headers['content-range'];
                if (contentRange) {
                    console.log(`📊 Content-Range: ${contentRange}`);
                    const match = contentRange.match(/\d+-\d+\/(\d+)/);
                    if (match) {
                        const totalCount = parseInt(match[1]);
                        console.log(`✅ TOTAL RECORDS IN DATABASE: ${totalCount.toLocaleString()}`);
                        
                        if (totalCount >= 7000) {
                            console.log('🎉 SUCCESS! All 7,182+ records are in the database!');
                        } else {
                            console.log(`⚠️  Only ${totalCount} records found (expected 7,182)`);
                        }
                    }
                }
            } else {
                console.log('❌ No records found in powerbi_pnl_data');
            }
        } else {
            console.log(`❌ Error: ${response.status}`);
            console.log(`Response:`, response.data);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

async function checkOtherTables() {
    console.log('\n🔍 CHECKING OTHER TABLES:');
    console.log('='.repeat(60));
    
    const tables = ['locations', 'sales_imports', 'sales_import_items'];
    
    for (const tableName of tables) {
        try {
            const response = await makeRequest(`${NEW_DB.url}/rest/v1/${tableName}?limit=3`, {
                apikey: NEW_DB.key
            });
            
            if (response.status === 200) {
                const records = response.data;
                console.log(`✅ ${tableName}: ${records.length} sample records`);
                
                if (records.length > 0) {
                    console.log(`  Sample: ${JSON.stringify(records[0], null, 2).substring(0, 100)}...`);
                }
            } else {
                console.log(`❌ ${tableName}: Error ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${tableName}: ${error.message}`);
        }
    }
}

// Main execution
if (require.main === module) {
    checkPowerbiData()
        .then(() => checkOtherTables())
        .catch(console.error);
}

module.exports = { checkPowerbiData, checkOtherTables };
