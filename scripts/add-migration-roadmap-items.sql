-- ========================================
-- ADD MIGRATION PLAN TO ROADMAP
-- ========================================
-- This script adds all tasks from the Next.js Server Components migration plan
-- to the roadmap_items table

-- Get the maximum display_order to append new items
DO $$
DECLARE
  max_order INTEGER;
  current_order INTEGER;
BEGIN
  -- Get current max display_order
  SELECT COALESCE(MAX(display_order), -1) INTO max_order FROM roadmap_items;
  current_order := max_order + 1;

  -- ========================================
  -- PHASE 1: Foundation & Setup
  -- ========================================
  
  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Service Layer Structure',
      'Create src/lib/services/ directory with sales.service.ts, pnl.service.ts, eitje.service.ts, labor.service.ts, locations.service.ts and types directory. Add error handling and caching utilities.',
      'As a developer, I want a centralized service layer so that data fetching logic is reusable and testable.',
      'Service layer directory structure created, TypeScript types defined, basic error handling in place',
      current_order,
      'Engineering',
      'Architecture',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Shared Utilities',
      'Create query-builder.ts, filter-utils.ts, pagination-utils.ts, and error-handler.ts in src/lib/services/utils/. Make utility functions reusable and type-safe.',
      'As a developer, I want shared utilities so that I don''t repeat code across services.',
      'Utility functions are reusable, type-safe implementations, well-documented',
      current_order,
      'Engineering',
      'Architecture',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 2: Migrate High-Priority Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Sales Page (PILOT)',
      'Convert /finance/sales/page.tsx to Server Component, create sales-client.tsx for UI, add loading.tsx and error.tsx. Create SalesService.fetchSalesData() and SalesService.fetchLocations() methods. Test performance improvements.',
      'As a user, I want the sales page to load faster so that I can view data immediately.',
      'Page loads faster (TTFB < 500ms), no client-side data fetching on initial load, all filters still work, no breaking changes to UI, performance metrics documented',
      current_order,
      'Engineering',
      'Migration',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'performance', 'sales']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Locations Service (Shared)',
      'Extract locations fetching from all pages, create LocationsService.fetchAll() and LocationsService.fetchById() methods, add caching (10 min stale time), update all pages to use service.',
      'As a developer, I want a single source of truth for locations so that data is consistent across the app.',
      'Single source of truth for locations, all pages use the service, caching implemented',
      current_order,
      'Engineering',
      'Migration',
      'next-up',
      'Must',
      true,
      ARRAY['migration', 'refactoring']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 3: Migrate Eitje Data Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create Eitje Service',
      'Create EitjeService.fetchFinanceData(), fetchHoursData(), fetchLaborCosts(), fetchRawData(), fetchWorkers(), fetchLocationsTeams() methods. Integrate with existing aggregation-service.ts.',
      'As a developer, I want centralized Eitje data fetching so that all Eitje pages can use the same service.',
      'All Eitje data fetching methods implemented, integrated with existing aggregation service, type-safe',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Finance Page',
      'Convert /finance/data/eitje-data/finance/page.tsx to Server Component, extract UI to finance-client.tsx, test pagination and filters.',
      'As a user, I want the Eitje finance page to load faster.',
      'Server-side data fetching, all functionality preserved, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Hours Page',
      'Convert /finance/data/eitje-data/hours/page.tsx to Server Component, extract UI to client component, test functionality.',
      'As a user, I want the Eitje hours page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Labor Costs Page',
      'Convert /finance/data/eitje-data/labor-costs/page.tsx to Server Component, extract UI to client component, test functionality.',
      'As a user, I want the Eitje labor costs page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Data Imported Page',
      'Convert /finance/data/eitje-data/data-imported/page.tsx to Server Component, extract UI to client component, test pagination (50 items per page) and error handling.',
      'As a user, I want the Eitje data imported page to load faster.',
      'Server-side data fetching, pagination works, error handling improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'eitje', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Workers Page',
      'Convert /finance/data/eitje-data/workers/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the Eitje workers page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Eitje Locations-Teams Page',
      'Convert /finance/data/eitje-data/locations-teams/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the Eitje locations-teams page to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 4: Migrate P&L Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Create P&L Service',
      'Create PnLService.fetchSummaryData(), fetchTimeSeries(), fetchByCategory() methods. Integrate with existing pnl-calculations.ts, add filtering logic.',
      'As a developer, I want centralized P&L data fetching so that all P&L pages can use the same service.',
      'All P&L data fetching methods implemented, integrated with existing calculations, type-safe',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate P&L Page',
      'Convert /finance/pnl/page.tsx to Server Component, extract UI to pnl-client.tsx, test KPI cards, charts, and comparison mode.',
      'As a user, I want the P&L page to load faster.',
      'Server-side data fetching, all functionality preserved, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl', 'performance']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate P&L Balance Page',
      'Convert /finance/pnl/balance/page.tsx to Server Component, extract UI to client component, test complex calculations and filters.',
      'As a user, I want the P&L balance page to load faster.',
      'Server-side data fetching, all calculations work correctly, performance improved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Should',
      true,
      ARRAY['migration', 'pnl', 'performance']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 5: Migrate Remaining Pages
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Labor Dashboard',
      'Create LaborService, convert /finance/labor/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the labor dashboard to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'labor']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate Daily Ops Dashboard',
      'Create DailyOpsService, convert /finance/daily-ops/page.tsx to Server Component, extract UI to client component.',
      'As a user, I want the daily ops dashboard to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'daily-ops']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Migrate View Data Pages',
      'Migrate /view-data/eitje-data/* pages, reuse Eitje service.',
      'As a user, I want the view data pages to load faster.',
      'Server-side data fetching, all functionality preserved',
      current_order,
      'Engineering',
      'Migration',
      'someday',
      'Could',
      true,
      ARRAY['migration', 'eitje']
    );
  current_order := current_order + 1;

  -- ========================================
  -- PHASE 6: Optimization & Cleanup
  -- ========================================

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Remove Deprecated Hooks',
      'Audit all hooks, identify deprecated hooks (useSalesData.ts, usePnLSummary.ts, etc.), remove or mark as deprecated, update documentation.',
      'As a developer, I want to remove deprecated code so that the codebase is cleaner.',
      'Deprecated hooks removed or marked, documentation updated',
      current_order,
      'Engineering',
      'Cleanup',
      'someday',
      'Could',
      true,
      ARRAY['cleanup', 'refactoring']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Add Caching Strategy',
      'Implement Next.js revalidation, add cache tags, configure stale time per data type, add cache invalidation on mutations.',
      'As a user, I want faster page loads through caching.',
      'Caching implemented, revalidation configured, cache invalidation works',
      current_order,
      'Engineering',
      'Performance',
      'someday',
      'Should',
      true,
      ARRAY['performance', 'caching']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Performance Optimization',
      'Measure page load times, optimize database queries, add streaming where appropriate, optimize bundle sizes.',
      'As a user, I want the fastest possible page loads.',
      'Page load times improved, database queries optimized, bundle sizes reduced',
      current_order,
      'Engineering',
      'Performance',
      'someday',
      'Should',
      true,
      ARRAY['performance', 'optimization']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Error Handling Standardization',
      'Standardize error types, create error boundaries, add error logging, create user-friendly error messages.',
      'As a user, I want clear error messages when something goes wrong.',
      'Error handling standardized, error boundaries created, user-friendly messages',
      current_order,
      'Engineering',
      'Quality',
      'someday',
      'Should',
      true,
      ARRAY['error-handling', 'quality']
    );
  current_order := current_order + 1;

  INSERT INTO roadmap_items (title, description, user_story, expected_results, display_order, department, category, status, have_state, is_active, triggers)
  VALUES 
    (
      'Documentation',
      'Document service layer patterns, create migration guide, update README, add code examples.',
      'As a developer, I want documentation so that I understand how to use the service layer.',
      'Documentation created, migration guide written, README updated, code examples added',
      current_order,
      'Engineering',
      'Documentation',
      'someday',
      'Could',
      true,
      ARRAY['documentation']
    );
  current_order := current_order + 1;

  RAISE NOTICE 'Successfully added % roadmap items starting from display_order %', current_order - max_order - 1, max_order + 1;

END $$;


