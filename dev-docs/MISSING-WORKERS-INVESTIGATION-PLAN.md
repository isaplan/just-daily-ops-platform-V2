# Missing Workers Investigation & Action Plan

## 🔴 CRITICAL FINDINGS

### Data Integrity Issues Discovered:

1. **eitje_aggregated has only 1 worker** - This is suspicious and indicates:
   - Aggregation may not be running correctly
   - Workers may not be getting aggregated from eitje_raw_data
   - Need to investigate aggregation process

2. **3 Specific Workers NOT FOUND ANYWHERE:**
   - Joost Hansen (Kinsbergen) - ❌ Not in worker_profiles, unified_users, eitje_raw_data, or eitje_aggregated
   - Bran van de Berg (Kinsbergen) - ❌ Not in worker_profiles, unified_users, eitje_raw_data, or eitje_aggregated
   - Daniel Kaatee (BarBea) - ❌ Not in worker_profiles, unified_users, eitje_raw_data, or eitje_aggregated

3. **Excel File Parsing Issues:**
   - Picking up metadata rows (headers, descriptions, etc.)
   - Need to improve parsing to find actual worker data rows

## 📋 ACTION PLAN

### Phase 1: Immediate Investigation (URGENT)

#### 1.1 Fix Excel File Parsing
- [ ] Improve header detection to skip metadata rows
- [ ] Find actual data rows (look for "support ID" column with numeric values)
- [ ] Extract only valid worker rows with eitje IDs

#### 1.2 Investigate eitje_aggregated
- [ ] Check why only 1 worker in eitje_aggregated
- [ ] Verify aggregation cron job is running
- [ ] Check if aggregation is filtering out workers incorrectly
- [ ] Run aggregation manually and check results

#### 1.3 Search for Missing Workers
- [ ] Search eitje_raw_data with fuzzy name matching
- [ ] Check if names are spelled differently in database
- [ ] Check if workers exist with different eitje_user_ids
- [ ] Verify if workers are in bork_raw_data but not eitje

### Phase 2: Data Integrity Checks

#### 2.1 Compare All Data Sources
- [ ] Compare eitje_raw_data users vs worker_profiles
- [ ] Compare eitje_aggregated workers vs worker_profiles
- [ ] Compare bork_raw_data waiters vs worker_profiles
- [ ] Compare unified_users vs worker_profiles
- [ ] Generate comprehensive missing workers report

#### 2.2 Verify Unified Users Connections
- [ ] Check if all worker_profiles have corresponding unified_users
- [ ] Check if all unified_users with eitje mappings have worker_profiles
- [ ] Identify orphaned records

### Phase 3: Auto-Creation System

#### 3.1 Auto-Create Workers from Eitje Data
- [ ] Create API endpoint: `/api/admin/auto-create-missing-workers`
- [ ] Logic:
  - Query eitje_raw_data for users not in worker_profiles
  - Query eitje_aggregated for workers not in worker_profiles
  - Create worker_profiles for missing workers
  - Link to unified_users (create if needed)
  - Set default hourly wage
  - Set default location

#### 3.2 Auto-Create Workers from Bork Data
- [ ] Query bork_raw_data for unique waiter_names
- [ ] Match waiters to unified_users by name
- [ ] Create worker_profiles for unmatched waiters
- [ ] Link to locations based on bork_raw_data locationId

#### 3.3 Auto-Create from Excel File
- [ ] Parse Excel file correctly (skip metadata)
- [ ] Extract workers with eitje IDs
- [ ] Create worker_profiles for missing workers
- [ ] Import contract data (hourly wage, contract hours, etc.)

### Phase 4: UI Enhancement - "New User" Tab

#### 4.1 Create "New User" Tab in /labor/workers
- [ ] Add new tab: "New User" or "Add Worker"
- [ ] Create form with fields:
  - Name (firstName + lastName)
  - Eitje User ID (optional - for linking)
  - Location (dropdown)
  - Contract Type (dropdown)
  - Contract Hours (number)
  - Hourly Wage (number)
  - Effective From (date)
  - Effective To (date, optional)
  - Notes (textarea)
- [ ] On submit:
  - Create unified_user if doesn't exist
  - Create worker_profile
  - Link to unified_user via eitje mapping
  - Show success message
  - Refresh worker list

#### 4.2 Manual Worker Creation Flow
- [ ] Form validation
- [ ] Check if worker already exists (by name or eitje ID)
- [ ] Show warning if duplicate found
- [ ] Allow user to proceed or cancel

### Phase 5: Ongoing Monitoring

#### 5.1 Daily Sync Check
- [ ] After Eitje sync, check for new workers
- [ ] After Bork sync, check for new waiters
- [ ] Auto-create missing workers
- [ ] Log all auto-created workers

#### 5.2 Data Integrity Dashboard
- [ ] Create admin dashboard showing:
  - Workers in eitje but not in worker_profiles
  - Workers in bork but not in worker_profiles
  - Workers in worker_profiles but not in unified_users
  - Orphaned records
- [ ] Add "Fix" buttons to auto-create missing records

## 🎯 IMMEDIATE NEXT STEPS

1. **Fix Excel parsing** - Get actual worker data from Excel file
2. **Investigate eitje_aggregated** - Why only 1 worker?
3. **Search for 3 missing workers** - Try fuzzy matching, different spellings
4. **Create auto-create endpoint** - For missing workers from Eitje/Bork
5. **Create "New User" tab** - For manual worker creation

## 📊 EXPECTED OUTCOMES

After implementing this plan:
- ✅ All workers from Eitje/Bork will have worker_profiles
- ✅ All worker_profiles will be linked to unified_users
- ✅ Missing workers can be manually created via UI
- ✅ System will auto-detect and create missing workers
- ✅ Data integrity will be maintained automatically

