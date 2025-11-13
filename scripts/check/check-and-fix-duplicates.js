const { createClient } = require('@supabase/supabase-js');

async function checkAndFixDuplicates() {
  // Use the same credentials as the sync route
  const supabaseUrl = 'https://vrucbxdudchboznunndz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWNieGR1ZGNoYm96bnVubmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzQzNjYsImV4cCI6MjA3NjExMDM2Nn0.C8B9Z7iHTmOb0ucfnBmkBeiXgWscyf8dUt2hWFjK90o';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking for duplicate records in Eitje tables...\n');
  
  const tables = [
    'eitje_time_registration_shifts_raw',
    'eitje_planning_shifts_raw', 
    'eitje_revenue_days_raw'
  ];
  
  for (const table of tables) {
    console.log(`📊 Checking table: ${table}`);
    
    try {
      // Get all records to check for duplicates
      const { data: allRecords, error: fetchError } = await supabase
        .from(table)
        .select('id, eitje_id, date, created_at')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.log(`  ❌ Error fetching records: ${fetchError.message}`);
        continue;
      }
      
      console.log(`  📈 Total records: ${allRecords?.length || 0}`);
      
      if (!allRecords || allRecords.length === 0) {
        console.log(`  ✅ No records found - table is empty`);
        continue;
      }
      
      // Check for duplicates by (eitje_id, date) combination
      const duplicates = new Map();
      const uniqueRecords = new Map();
      
      allRecords.forEach(record => {
        const key = `${record.eitje_id}-${record.date}`;
        if (uniqueRecords.has(key)) {
          // This is a duplicate
          if (!duplicates.has(key)) {
            duplicates.set(key, [uniqueRecords.get(key)]);
          }
          duplicates.get(key).push(record);
        } else {
          uniqueRecords.set(key, record);
        }
      });
      
      console.log(`  🔍 Unique combinations: ${uniqueRecords.size}`);
      console.log(`  ⚠️  Duplicate combinations: ${duplicates.size}`);
      
      if (duplicates.size > 0) {
        console.log(`  🧹 Cleaning up duplicates...`);
        
        let cleanedCount = 0;
        for (const [key, duplicateRecords] of duplicates) {
          // Keep the most recent record (first in the array since we ordered by created_at desc)
          const keepRecord = duplicateRecords[0];
          const removeRecords = duplicateRecords.slice(1);
          
          console.log(`    Key ${key}: Keeping record ${keepRecord.id}, removing ${removeRecords.length} duplicates`);
          
          // Delete the duplicate records
          for (const record of removeRecords) {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('id', record.id);
            
            if (deleteError) {
              console.log(`      ❌ Error deleting record ${record.id}: ${deleteError.message}`);
            } else {
              cleanedCount++;
            }
          }
        }
        
        console.log(`  ✅ Cleaned up ${cleanedCount} duplicate records`);
      } else {
        console.log(`  ✅ No duplicates found`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error processing table ${table}:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('🎯 Now attempting to create unique constraints...');
  
  // Try to create the constraints
  const constraintQueries = [
    'ALTER TABLE eitje_time_registration_shifts_raw ADD CONSTRAINT eitje_time_registration_shifts_raw_eitje_id_date_unique UNIQUE (eitje_id, date);',
    'ALTER TABLE eitje_planning_shifts_raw ADD CONSTRAINT eitje_planning_shifts_raw_eitje_id_date_unique UNIQUE (eitje_id, date);',
    'ALTER TABLE eitje_revenue_days_raw ADD CONSTRAINT eitje_revenue_days_raw_eitje_id_date_unique UNIQUE (eitje_id, date);'
  ];
  
  for (const query of constraintQueries) {
    try {
      console.log(`  🔧 Executing: ${query.split(' ')[2]}`);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      
      if (error) {
        console.log(`    ❌ Error: ${error.message}`);
      } else {
        console.log(`    ✅ Success`);
      }
    } catch (error) {
      console.log(`    ❌ Exception: ${error.message}`);
    }
  }
}

checkAndFixDuplicates().catch(console.error);


