# P&L Balance Calculation Fix - Execution Plan

## Problem Statement
- Calculations don't match reference data for any of the 3 locations
- Need to verify and fix within 1% margin

## Approach
1. **Data Extraction**: Get sample months (positive/negative results, 2024/2025)
2. **Validation Module**: Create test utilities to compare calculations
3. **Fix Aggregation**: Update aggregation service to match PowerBI structure
4. **Fix Display Mapping**: Ensure display matches aggregation
5. **Validation**: Test all 3 locations

## Modular Structure

### 1. Data Extraction Module
- Extract raw data for test cases
- Compare with aggregated results
- Generate reports

### 2. Calculation Validator Module ✅ Created
- `calculation-validator.ts` - Validates with 1% margin
- Modular validation functions

### 3. Category Mapper Module ✅ Created
- `category-mapper.ts` - Maps DB to display categories
- Centralized category definitions

### 4. Aggregation Fix Module (Next)
- Update `aggregation-service.ts`
- Ensure correct formula application
- Handle all categories correctly

### 5. Display Mapping Fix Module (Next)
- Update `page.tsx` mapping function
- Ensure correct column mapping
- Handle subcategories properly

## Test Cases
- Kinsbergen: 1 month 2024, 1 month 2025
- Bar Bea: 1 month 2024, 1 month 2025  
- Lamour: 1 month 2024, 1 month 2025

## Execution Order
1. Create data extractor utility
2. Extract test data and log current vs expected
3. Fix aggregation calculation logic
4. Fix display mapping
5. Test and validate all locations
6. Verify 1% margin achieved

