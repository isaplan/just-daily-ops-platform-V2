#!/usr/bin/env node

/**
 * Supabase Edge Functions Migration Script
 * Migrates all required edge functions from old project to new project
 */

const fs = require('fs');
const path = require('path');

// Source and destination paths
const SOURCE_FUNCTIONS_DIR = '/Users/alviniomolina/Documents/GitHub/lovable-projects/just-stock-it/supabase/functions';
const DEST_FUNCTIONS_DIR = '/Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/supabase/functions';

// Required functions for the Next.js app
const REQUIRED_FUNCTIONS = [
  // Core Bork API functions
  'bork-sync-daily',
  'bork-sync-range', 
  'bork-api-test',
  'bork-api-sync',
  'bork-sync-master-data',
  
  // Finance/PowerBI functions
  'finance-import-orchestrator',
  'analyze-financials',
  
  // Supporting functions
  'finance-validation-middleware',
  'process-bork-raw-data',
  'smart-calculations',
  
  // Shared utilities
  '_shared'
];

// Optional but useful functions
const OPTIONAL_FUNCTIONS = [
  'bork-api-connection-test',
  'bork-api-simple-test',
  'bork-api-sync-minimal',
  'bork-api-sync-test',
  'bork-backfill-orchestrator',
  'bork-backfill-worker',
  'bork-incremental-sync',
  'check-locations',
  'check-records-per-day',
  'debug-credentials',
  'debug-db',
  'debug-env',
  'eitje-api-sync',
  'eitje-backfill-cleanup',
  'eitje-backfill-orchestrator',
  'eitje-backfill-reset',
  'eitje-backfill-worker',
  'eitje-gap-detector',
  'eitje-incremental-sync',
  'generate-recipe',
  'scan-package-usage'
];

function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

function copyFunction(sourcePath, destPath) {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  Source function not found: ${sourcePath}`);
      return false;
    }

    // Create destination directory
    createDirectoryIfNotExists(path.dirname(destPath));

    // Copy the entire function directory
    if (fs.statSync(sourcePath).isDirectory()) {
      // Copy all files in the directory
      const files = fs.readdirSync(sourcePath);
      for (const file of files) {
        const sourceFile = path.join(sourcePath, file);
        const destFile = path.join(destPath, file);
        
        if (fs.statSync(sourceFile).isFile()) {
          fs.copyFileSync(sourceFile, destFile);
          console.log(`📄 Copied: ${file}`);
        }
      }
    } else {
      // Copy single file
      fs.copyFileSync(sourcePath, destPath);
      console.log(`📄 Copied: ${path.basename(sourcePath)}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error copying ${sourcePath}:`, error.message);
    return false;
  }
}

function migrateFunctions() {
  console.log('🚀 Starting Edge Functions Migration...\n');
  
  // Create destination directory
  createDirectoryIfNotExists(DEST_FUNCTIONS_DIR);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Migrate required functions
  console.log('📦 Migrating Required Functions:');
  console.log('================================');
  
  for (const functionName of REQUIRED_FUNCTIONS) {
    const sourcePath = path.join(SOURCE_FUNCTIONS_DIR, functionName);
    const destPath = path.join(DEST_FUNCTIONS_DIR, functionName);
    
    console.log(`\n🔄 Migrating ${functionName}...`);
    
    if (copyFunction(sourcePath, destPath)) {
      console.log(`✅ Successfully migrated ${functionName}`);
      successCount++;
    } else {
      console.log(`❌ Failed to migrate ${functionName}`);
      errorCount++;
    }
  }
  
  // Migrate optional functions
  console.log('\n📦 Migrating Optional Functions:');
  console.log('================================');
  
  for (const functionName of OPTIONAL_FUNCTIONS) {
    const sourcePath = path.join(SOURCE_FUNCTIONS_DIR, functionName);
    const destPath = path.join(DEST_FUNCTIONS_DIR, functionName);
    
    console.log(`\n🔄 Migrating ${functionName}...`);
    
    if (copyFunction(sourcePath, destPath)) {
      console.log(`✅ Successfully migrated ${functionName}`);
      successCount++;
    } else {
      console.log(`⚠️  Optional function not found: ${functionName}`);
    }
  }
  
  // Create Supabase config file
  createSupabaseConfig();
  
  // Summary
  console.log('\n📊 Migration Summary:');
  console.log('====================');
  console.log(`✅ Successful: ${successCount} functions`);
  console.log(`❌ Failed: ${errorCount} functions`);
  console.log(`📁 Destination: ${DEST_FUNCTIONS_DIR}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('==============');
  console.log('1. Review the migrated functions in supabase/functions/');
  console.log('2. Deploy functions to your new Supabase project:');
  console.log('   supabase functions deploy');
  console.log('3. Or deploy individual functions:');
  console.log('   supabase functions deploy bork-sync-daily');
  console.log('   supabase functions deploy bork-sync-range');
  console.log('   supabase functions deploy bork-api-test');
  console.log('   supabase functions deploy bork-api-sync');
  console.log('   supabase functions deploy bork-sync-master-data');
  console.log('   supabase functions deploy finance-import-orchestrator');
  console.log('   supabase functions deploy analyze-financials');
}

function createSupabaseConfig() {
  const configPath = path.join('/Users/alviniomolina/Documents/GitHub/just-daily-ops-platform', 'supabase', 'config.toml');
  const configDir = path.dirname(configPath);
  
  createDirectoryIfNotExists(configDir);
  
  const configContent = `# Supabase Configuration for Just Daily Ops Platform
project_id = "vrucbxdudchboznunndz"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
port = 54327
file_size_limit = "50MiB"

[auth]
enabled = true
port = 54328
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[edge_functions]
enabled = true
port = 54329

[analytics]
enabled = false
`;

  try {
    fs.writeFileSync(configPath, configContent);
    console.log(`📄 Created Supabase config: ${configPath}`);
  } catch (error) {
    console.error(`❌ Error creating config:`, error.message);
  }
}

// Main execution
if (require.main === module) {
  migrateFunctions();
}

module.exports = { migrateFunctions };
