/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/.test-scripts/import-csv-data.js
 */

#!/usr/bin/env node

/**
 * Import CSV data directly into Supabase
 * This will import the full 7,182 records from the CSV export
 */

const fs = require('fs');
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
                'Prefer': 'return=minimal',
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

function parseCSVLine(line) {
    // Simple CSV parser for semicolon-separated values
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

function csvToJSON(csvContent) {
    const lines = csvContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const record = {};
            
            headers.forEach((header, index) => {
                let value = values[index];
                
                // Convert specific fields to appropriate types
                if (header === 'year' || header === 'month') {
                    value = parseInt(value);
                } else if (header === 'amount') {
                    value = parseFloat(value);
                } else if (header === 'created_at') {
                    // Keep as string, Supabase will handle the timestamp
                    value = value;
                }
                
                record[header] = value;
            });
            
            records.push(record);
        }
    }
    
    return records;
}

async function clearExistingData() {
    console.log('🗑️  Clearing existing powerbi_pnl_data...');
    
    try {
        const response = await makeRequest(`${NEW_DB.url}/rest/v1/powerbi_pnl_data`, {
            method: 'DELETE',
            apikey: NEW_DB.key
        });
        
        if (response.status === 204) {
            console.log('✅ Existing data cleared');
        } else {
            console.log(`⚠️  Clear response: ${response.status}`);
        }
    } catch (error) {
        console.log(`⚠️  Clear error: ${error.message}`);
    }
}

async function importCSVData() {
    console.log('📊 Importing CSV data to Supabase...');
    console.log('='.repeat(60));
    
    try {
        // Read CSV file
        const csvPath = '/Users/alviniomolina/Downloads/powerbi_pnl_data-export-2025-10-23_00-45-26.csv';
        console.log(`📁 Reading CSV file: ${csvPath}`);
        
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log(`📄 File size: ${csvContent.length} characters`);
        
        // Parse CSV to JSON
        console.log('🔄 Parsing CSV data...');
        const records = csvToJSON(csvContent);
        console.log(`📊 Parsed ${records.length} records`);
        
        // Clear existing data
        await clearExistingData();
        
        // Import in batches
        const batchSize = 1000;
        const totalBatches = Math.ceil(records.length / batchSize);
        
        console.log(`📦 Importing in ${totalBatches} batches of ${batchSize} records each...`);
        
        let totalImported = 0;
        
        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, records.length);
            const batch = records.slice(start, end);
            
            console.log(`📤 Importing batch ${i + 1}/${totalBatches} (records ${start + 1}-${end})...`);
            
            try {
                const response = await makeRequest(`${NEW_DB.url}/rest/v1/powerbi_pnl_data`, {
                    method: 'POST',
                    apikey: NEW_DB.key,
                    body: batch
                });
                
                if (response.status === 201) {
                    totalImported += batch.length;
                    console.log(`✅ Batch ${i + 1} imported successfully (${batch.length} records)`);
                } else {
                    console.log(`❌ Batch ${i + 1} failed: ${response.status}`);
                    console.log(`Response:`, response.data);
                }
            } catch (error) {
                console.log(`❌ Batch ${i + 1} error: ${error.message}`);
            }
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n📊 Import Summary:');
        console.log('='.repeat(60));
        console.log(`📁 CSV Records: ${records.length.toLocaleString()}`);
        console.log(`📤 Imported: ${totalImported.toLocaleString()}`);
        console.log(`✅ Success Rate: ${((totalImported / records.length) * 100).toFixed(1)}%`);
        
        if (totalImported === records.length) {
            console.log('🎉 PERFECT! All records imported successfully!');
        } else {
            console.log(`⚠️  ${records.length - totalImported} records failed to import`);
        }
        
    } catch (error) {
        console.log(`❌ Import failed: ${error.message}`);
    }
}

// Main execution
if (require.main === module) {
    importCSVData().catch(console.error);
}

module.exports = { importCSVData };
