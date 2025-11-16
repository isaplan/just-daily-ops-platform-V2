/**
 * Check which months still need to be synced for backward sync
 * Compares expected range (Jan 2024 to yesterday) against what's in the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabase } from '../src/lib/mongodb/v2-connection';

interface MonthStatus {
  year: number;
  month: number;
  hasRawData: boolean;
  hasAggregatedData: boolean;
  rawCount: number;
  aggregatedCount: number;
}

async function checkMissingMonths() {
  try {
    const db = await getDatabase();
    
    // Calculate date range: Jan 1, 2024 to yesterday
    const startDate = new Date('2024-01-01');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    console.log('🔍 Checking missing months for backward sync');
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${yesterday.toISOString().split('T')[0]}\n`);
    
    // Generate all expected months
    const expectedMonths: Array<{ year: number; month: number }> = [];
    const current = new Date(startDate);
    
    while (current <= yesterday) {
      expectedMonths.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    console.log(`📊 Expected months: ${expectedMonths.length}\n`);
    
    // Check Eitje data
    console.log('📦 EITJE DATA:');
    console.log('='.repeat(60));
    const eitjeStatus: MonthStatus[] = [];
    const eitjeMissing: string[] = [];
    const eitjeHasData: string[] = [];
    
    for (const { year, month } of expectedMonths) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      
      const rawCount = await db.collection('eitje_raw_data').countDocuments({
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });
      
      const aggregatedCount = await db.collection('eitje_aggregated').countDocuments({
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const hasData = rawCount > 0 || aggregatedCount > 0;
      
      eitjeStatus.push({
        year,
        month,
        hasRawData: rawCount > 0,
        hasAggregatedData: aggregatedCount > 0,
        rawCount,
        aggregatedCount,
      });
      
      if (hasData) {
        eitjeHasData.push(monthKey);
      } else {
        eitjeMissing.push(monthKey);
      }
    }
    
    console.log(`✅ Months with data: ${eitjeHasData.length}`);
    console.log(`❌ Months missing: ${eitjeMissing.length}\n`);
    
    if (eitjeMissing.length > 0) {
      console.log('❌ Missing months:');
      eitjeMissing.forEach(month => console.log(`   - ${month}`));
    }
    
    // Show summary by year
    const eitjeByYear = eitjeStatus.reduce((acc, status) => {
      const year = status.year.toString();
      if (!acc[year]) {
        acc[year] = { total: 0, hasData: 0, missing: 0 };
      }
      acc[year].total++;
      if (status.hasRawData || status.hasAggregatedData) {
        acc[year].hasData++;
      } else {
        acc[year].missing++;
      }
      return acc;
    }, {} as Record<string, { total: number; hasData: number; missing: number }>);
    
    console.log('\n📊 Eitje summary by year:');
    Object.entries(eitjeByYear).forEach(([year, stats]) => {
      console.log(`   ${year}: ${stats.hasData}/${stats.total} months synced (${stats.missing} missing)`);
    });
    
    // Check Bork data
    console.log('\n\n📦 BORK DATA:');
    console.log('='.repeat(60));
    const borkStatus: MonthStatus[] = [];
    const borkMissing: string[] = [];
    const borkHasData: string[] = [];
    
    for (const { year, month } of expectedMonths) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      
      const rawCount = await db.collection('bork_raw_data').countDocuments({
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });
      
      const aggregatedCount = await db.collection('bork_aggregated').countDocuments({
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const hasData = rawCount > 0 || aggregatedCount > 0;
      
      borkStatus.push({
        year,
        month,
        hasRawData: rawCount > 0,
        hasAggregatedData: aggregatedCount > 0,
        rawCount,
        aggregatedCount,
      });
      
      if (hasData) {
        borkHasData.push(monthKey);
      } else {
        borkMissing.push(monthKey);
      }
    }
    
    console.log(`✅ Months with data: ${borkHasData.length}`);
    console.log(`❌ Months missing: ${borkMissing.length}\n`);
    
    if (borkMissing.length > 0) {
      console.log('❌ Missing months:');
      borkMissing.forEach(month => console.log(`   - ${month}`));
    }
    
    // Show summary by year
    const borkByYear = borkStatus.reduce((acc, status) => {
      const year = status.year.toString();
      if (!acc[year]) {
        acc[year] = { total: 0, hasData: 0, missing: 0 };
      }
      acc[year].total++;
      if (status.hasRawData || status.hasAggregatedData) {
        acc[year].hasData++;
      } else {
        acc[year].missing++;
      }
      return acc;
    }, {} as Record<string, { total: number; hasData: number; missing: number }>);
    
    console.log('\n📊 Bork summary by year:');
    Object.entries(borkByYear).forEach(([year, stats]) => {
      console.log(`   ${year}: ${stats.hasData}/${stats.total} months synced (${stats.missing} missing)`);
    });
    
    // Overall summary
    console.log('\n\n📈 OVERALL SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Eitje: ${eitjeHasData.length}/${expectedMonths.length} months synced`);
    console.log(`Bork:  ${borkHasData.length}/${expectedMonths.length} months synced`);
    console.log(`\nTotal missing: Eitje=${eitjeMissing.length}, Bork=${borkMissing.length}`);
    
    // Show months that need syncing
    if (eitjeMissing.length > 0 || borkMissing.length > 0) {
      console.log('\n🎯 Months that need syncing:');
      
      // Combine and deduplicate
      const allMissing = [...new Set([...eitjeMissing, ...borkMissing])].sort();
      
      allMissing.forEach(month => {
        const needsEitje = eitjeMissing.includes(month);
        const needsBork = borkMissing.includes(month);
        const providers = [];
        if (needsEitje) providers.push('Eitje');
        if (needsBork) providers.push('Bork');
        console.log(`   ${month}: ${providers.join(' + ')}`);
      });
    } else {
      console.log('\n✅ All months are synced!');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkMissingMonths();

