#!/usr/bin/env node

/**
 * Manage Cron Jobs for Bork and Eitje
 * 
 * Usage:
 *   node scripts/manage-cron-jobs.js status
 *   node scripts/manage-cron-jobs.js enable bork
 *   node scripts/manage-cron-jobs.js disable eitje
 *   node scripts/manage-cron-jobs.js list
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCronJobs() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        jobid,
        schedule,
        command,
        nodename,
        nodeport,
        database,
        username,
        active,
        jobname
      FROM cron.job
      WHERE jobname LIKE '%bork%' OR jobname LIKE '%eitje%'
      ORDER BY jobname;
    `
  });

  if (error) {
    console.error('❌ Error fetching cron jobs:', error);
    return;
  }

  console.log('\n📅 Active Cron Jobs:');
  console.log('='.repeat(70));
  
  if (!data || data.length === 0) {
    console.log('No cron jobs found');
    return;
  }

  data.forEach(job => {
    console.log(`\nJob: ${job.jobname}`);
    console.log(`  ID: ${job.jobid}`);
    console.log(`  Schedule: ${job.schedule}`);
    console.log(`  Active: ${job.active ? '✅' : '❌'}`);
    console.log(`  Database: ${job.database}`);
  });
}

async function enableCronJob(provider) {
  if (provider !== 'bork' && provider !== 'eitje') {
    console.error(`❌ Invalid provider: ${provider}. Must be 'bork' or 'eitje'`);
    process.exit(1);
  }

  const functionName = `toggle_${provider}_cron_jobs`;
  const { error } = await supabase.rpc(functionName, { enabled: true });

  if (error) {
    console.error(`❌ Error enabling ${provider} cron jobs:`, error);
    process.exit(1);
  }

  console.log(`✅ ${provider.toUpperCase()} cron jobs enabled`);
}

async function disableCronJob(provider) {
  if (provider !== 'bork' && provider !== 'eitje') {
    console.error(`❌ Invalid provider: ${provider}. Must be 'bork' or 'eitje'`);
    process.exit(1);
  }

  const functionName = `toggle_${provider}_cron_jobs`;
  const { error } = await supabase.rpc(functionName, { enabled: false });

  if (error) {
    console.error(`❌ Error disabling ${provider} cron jobs:`, error);
    process.exit(1);
  }

  console.log(`✅ ${provider.toUpperCase()} cron jobs disabled`);
}

async function getStatus() {
  // Check cron jobs
  const { data: cronJobs, error: cronError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT jobname, active, schedule
      FROM cron.job
      WHERE jobname LIKE '%bork%' OR jobname LIKE '%eitje%'
      ORDER BY jobname;
    `
  });

  // Check config tables
  const { data: borkConfig } = await supabase
    .from('bork_sync_config')
    .select('mode, sync_interval_minutes, sync_hour, enabled_locations')
    .single();

  const { data: eitjeConfig } = await supabase
    .from('eitje_sync_config')
    .select('mode, incremental_interval_minutes, worker_interval_minutes, enabled_endpoints')
    .single();

  console.log('\n📊 Cron Job Status:');
  console.log('='.repeat(70));
  
  console.log('\n🔵 BORK:');
  if (borkConfig) {
    console.log(`  Mode: ${borkConfig.mode}`);
    console.log(`  Sync Interval: ${borkConfig.sync_interval_minutes} minutes`);
    console.log(`  Sync Hour: ${borkConfig.sync_hour}:00`);
    console.log(`  Enabled Locations: ${borkConfig.enabled_locations?.length || 0}`);
  }
  
  const borkCron = cronJobs?.filter(j => j.jobname?.includes('bork')) || [];
  borkCron.forEach(job => {
    console.log(`  Cron: ${job.jobname} - ${job.active ? '✅ Active' : '❌ Inactive'} (${job.schedule})`);
  });

  console.log('\n🟢 EITJE:');
  if (eitjeConfig) {
    console.log(`  Mode: ${eitjeConfig.mode}`);
    console.log(`  Incremental Interval: ${eitjeConfig.incremental_interval_minutes} minutes`);
    console.log(`  Worker Interval: ${eitjeConfig.worker_interval_minutes} minutes`);
    console.log(`  Enabled Endpoints: ${eitjeConfig.enabled_endpoints?.join(', ') || 'none'}`);
  }
  
  const eitjeCron = cronJobs?.filter(j => j.jobname?.includes('eitje')) || [];
  eitjeCron.forEach(job => {
    console.log(`  Cron: ${job.jobname} - ${job.active ? '✅ Active' : '❌ Inactive'} (${job.schedule})`);
  });
}

async function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'status':
      await getStatus();
      break;
    case 'list':
      await listCronJobs();
      break;
    case 'enable':
      if (!args[0]) {
        console.error('❌ Missing provider. Usage: node scripts/manage-cron-jobs.js enable <bork|eitje>');
        process.exit(1);
      }
      await enableCronJob(args[0]);
      break;
    case 'disable':
      if (!args[0]) {
        console.error('❌ Missing provider. Usage: node scripts/manage-cron-jobs.js disable <bork|eitje>');
        process.exit(1);
      }
      await disableCronJob(args[0]);
      break;
    default:
      console.log(`
📅 Cron Job Manager

Usage:
  node scripts/manage-cron-jobs.js status      - Show status of all cron jobs
  node scripts/manage-cron-jobs.js list       - List all cron jobs
  node scripts/manage-cron-jobs.js enable <bork|eitje>   - Enable cron jobs
  node scripts/manage-cron-jobs.js disable <bork|eitje>  - Disable cron jobs
      `);
      process.exit(0);
  }
}

main().catch(console.error);

