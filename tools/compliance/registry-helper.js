#!/usr/bin/env node

/**
 * Registry Helper - Query utilities for the function registry
 * Provides easy access to the paginated registry structure
 */

const fs = require('fs');
const path = require('path');

class RegistryHelper {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.registryDir = path.join(this.projectRoot, 'function-registry');
    this.indexPath = path.join(this.registryDir, 'index.json');
    this.legacyPath = path.join(this.projectRoot, 'function-registry.json');
    this.cache = {};
  }

  /**
   * Load the registry index
   * @returns {Object} Registry index with metadata
   */
  getIndex() {
    if (this.cache.index) {
      return this.cache.index;
    }

    if (fs.existsSync(this.indexPath)) {
      try {
        this.cache.index = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
        return this.cache.index;
      } catch (e) {
        console.error('Failed to load registry index:', e.message);
        return null;
      }
    }

    // Fallback to legacy registry
    if (fs.existsSync(this.legacyPath)) {
      console.warn('⚠️  Using legacy registry. Run migration: node tools/compliance/registry-auto-updater-v2.js');
      return this.loadLegacyIndex();
    }

    console.error('❌ No registry found. Run: node tools/compliance/registry-auto-updater-v2.js');
    return null;
  }

  /**
   * Load legacy registry and return index-like structure
   * @private
   */
  loadLegacyIndex() {
    try {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return {
        version: '1.0.0-legacy',
        last_updated: legacy.last_updated,
        summary: {
          total_functions: legacy.functions?.length || 0,
          by_status: {
            completed: legacy.functions?.filter(f => f.status === 'completed').length || 0,
            'in-progress': legacy.functions?.filter(f => f.status === 'in-progress').length || 0
          }
        },
        legacy: true
      };
    } catch (e) {
      console.error('Failed to load legacy registry:', e.message);
      return null;
    }
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary with counts and stats
   */
  getSummary() {
    const index = this.getIndex();
    return index?.summary || null;
  }

  /**
   * Load functions of a specific type
   * @param {string} type - Type: api-routes, pages, components, services, hooks, modules
   * @returns {Array} Array of functions
   */
  getByType(type) {
    const index = this.getIndex();
    if (!index) return [];

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      const typeMap = {
        'api-routes': 'api-route',
        'pages': 'page',
        'components': 'component',
        'services': 'service',
        'hooks': 'hook',
        'modules': 'module'
      };
      const legacyType = typeMap[type] || type;
      return legacy.functions?.filter(f => f.type === legacyType) || [];
    }

    // Load from paginated structure
    const filePath = path.join(this.registryDir, `${type}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Type "${type}" not found in registry`);
      return [];
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data.functions || [];
    } catch (e) {
      console.error(`Failed to load ${type}:`, e.message);
      return [];
    }
  }

  /**
   * Get all API routes
   * @returns {Array} Array of API route functions
   */
  getApiRoutes() {
    return this.getByType('api-routes');
  }

  /**
   * Get all pages
   * @returns {Array} Array of page functions
   */
  getPages() {
    return this.getByType('pages');
  }

  /**
   * Get all components
   * @returns {Array} Array of component functions
   */
  getComponents() {
    return this.getByType('components');
  }

  /**
   * Get all services
   * @returns {Array} Array of service functions
   */
  getServices() {
    return this.getByType('services');
  }

  /**
   * Get all hooks
   * @returns {Array} Array of hook functions
   */
  getHooks() {
    return this.getByType('hooks');
  }

  /**
   * Get all modules
   * @returns {Array} Array of module functions
   */
  getModules() {
    return this.getByType('modules');
  }

  /**
   * Find a function by file path
   * @param {string} filePath - File path to search for
   * @returns {Object|null} Function object or null
   */
  findByFile(filePath) {
    const index = this.getIndex();
    if (!index) return null;

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions?.find(f => f.file === filePath) || null;
    }

    // Search through all types
    for (const type of Object.keys(index.registry_files || {})) {
      const functions = this.getByType(type);
      const found = functions.find(f => f.file === filePath);
      if (found) return found;
    }

    return null;
  }

  /**
   * Find functions by name (partial match)
   * @param {string} name - Name to search for
   * @returns {Array} Array of matching functions
   */
  findByName(name) {
    const results = [];
    const index = this.getIndex();
    if (!index) return results;

    const searchTerm = name.toLowerCase();

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions?.filter(f => 
        f.name?.toLowerCase().includes(searchTerm)
      ) || [];
    }

    // Search through all types
    for (const type of Object.keys(index.registry_files || {})) {
      const functions = this.getByType(type);
      const matches = functions.filter(f => 
        f.name?.toLowerCase().includes(searchTerm)
      );
      results.push(...matches);
    }

    return results;
  }

  /**
   * Get all functions with a specific status
   * @param {string} status - Status: completed, in-progress, detected
   * @returns {Array} Array of functions with that status
   */
  getByStatus(status) {
    const results = [];
    const index = this.getIndex();
    if (!index) return results;

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions?.filter(f => f.status === status) || [];
    }

    // Search through all types
    for (const type of Object.keys(index.registry_files || {})) {
      const functions = this.getByType(type);
      const matches = functions.filter(f => f.status === status);
      results.push(...matches);
    }

    return results;
  }

  /**
   * Get all protected functions (touch_again: false)
   * @returns {Array} Array of protected functions
   */
  getProtected() {
    const results = [];
    const index = this.getIndex();
    if (!index) return results;

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions?.filter(f => f.touch_again === false) || [];
    }

    // Search through all types
    for (const type of Object.keys(index.registry_files || {})) {
      const functions = this.getByType(type);
      const matches = functions.filter(f => f.touch_again === false);
      results.push(...matches);
    }

    return results;
  }

  /**
   * Get all functions (loads all registry files)
   * @returns {Array} Array of all functions
   */
  getAll() {
    const results = [];
    const index = this.getIndex();
    if (!index) return results;

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions || [];
    }

    // Load all types
    for (const type of Object.keys(index.registry_files || {})) {
      results.push(...this.getByType(type));
    }

    return results;
  }

  /**
   * Get functions that need attention (in-progress or touch_again: true)
   * @returns {Array} Array of functions needing attention
   */
  getNeedsAttention() {
    const results = [];
    const index = this.getIndex();
    if (!index) return results;

    // Handle legacy registry
    if (index.legacy) {
      const legacy = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
      return legacy.functions?.filter(f => 
        f.status === 'in-progress' || f.touch_again === true
      ) || [];
    }

    // Search through all types
    for (const type of Object.keys(index.registry_files || {})) {
      const functions = this.getByType(type);
      const matches = functions.filter(f => 
        f.status === 'in-progress' || f.touch_again === true
      );
      results.push(...matches);
    }

    return results;
  }

  /**
   * Clear cache (force reload on next query)
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * Print a formatted summary to console
   */
  printSummary() {
    const index = this.getIndex();
    if (!index) {
      console.log('❌ No registry found');
      return;
    }

    console.log('\n📊 Function Registry Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Version: ${index.version}`);
    console.log(`Last Updated: ${index.last_updated}`);
    console.log(`\n📈 Statistics:`);
    console.log(`   Total Functions: ${index.summary.total_functions}`);
    console.log(`   Completed: ${index.summary.by_status.completed}`);
    console.log(`   In Progress: ${index.summary.by_status['in-progress']}`);
    console.log(`   Protected: ${index.summary.protected}`);

    if (index.registry_files) {
      console.log(`\n📦 By Type:`);
      Object.entries(index.registry_files).forEach(([type, info]) => {
        console.log(`   ${type}: ${info.count}`);
      });
    }

    if (index.last_scan) {
      console.log(`\n🔍 Last Scan:`);
      console.log(`   Files Scanned: ${index.last_scan.files_scanned}`);
      console.log(`   Changes: +${index.last_scan.changes.new} ~${index.last_scan.changes.updated} -${index.last_scan.changes.removed}`);
    }

    if (index.legacy) {
      console.log(`\n⚠️  Using legacy registry format`);
      console.log(`   Run migration: node tools/compliance/registry-auto-updater-v2.js`);
    }

    console.log('═══════════════════════════════════════\n');
  }
}

// CLI interface
if (require.main === module) {
  const helper = new RegistryHelper();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'summary':
    case 'info':
      helper.printSummary();
      break;

    case 'list':
      const type = args[1];
      if (!type) {
        console.log('Usage: registry-helper.js list <type>');
        console.log('Types: api-routes, pages, components, services, hooks, modules');
        process.exit(1);
      }
      const functions = helper.getByType(type);
      console.log(`\n📋 ${type} (${functions.length}):\n`);
      functions.forEach(f => {
        const status = f.touch_again === false ? '🔒' : (f.status === 'completed' ? '✅' : '🔧');
        console.log(`  ${status} ${f.name}`);
        console.log(`     ${f.file}`);
      });
      console.log('');
      break;

    case 'search':
    case 'find':
      const query = args[1];
      if (!query) {
        console.log('Usage: registry-helper.js search <name>');
        process.exit(1);
      }
      const results = helper.findByName(query);
      console.log(`\n🔍 Search results for "${query}" (${results.length}):\n`);
      results.forEach(f => {
        const status = f.touch_again === false ? '🔒' : (f.status === 'completed' ? '✅' : '🔧');
        console.log(`  ${status} ${f.name} (${f.type})`);
        console.log(`     ${f.file}`);
      });
      console.log('');
      break;

    case 'attention':
    case 'todo':
      const needsAttention = helper.getNeedsAttention();
      console.log(`\n🔧 Functions needing attention (${needsAttention.length}):\n`);
      needsAttention.forEach(f => {
        console.log(`  ${f.name} (${f.type})`);
        console.log(`     ${f.file}`);
        console.log(`     Status: ${f.status}`);
      });
      console.log('');
      break;

    case 'protected':
      const protected = helper.getProtected();
      console.log(`\n🔒 Protected functions (${protected.length}):\n`);
      protected.forEach(f => {
        console.log(`  ${f.name} (${f.type})`);
        console.log(`     ${f.file}`);
      });
      console.log('');
      break;

    default:
      console.log('Registry Helper - Query utility for function registry');
      console.log('\nUsage:');
      console.log('  registry-helper.js summary              - Show registry summary');
      console.log('  registry-helper.js list <type>          - List functions by type');
      console.log('  registry-helper.js search <name>        - Search functions by name');
      console.log('  registry-helper.js attention            - Show functions needing attention');
      console.log('  registry-helper.js protected            - Show protected functions');
      console.log('\nTypes: api-routes, pages, components, services, hooks, modules');
      console.log('\nExamples:');
      console.log('  registry-helper.js summary');
      console.log('  registry-helper.js list api-routes');
      console.log('  registry-helper.js search "data"');
      console.log('  registry-helper.js attention');
      process.exit(0);
  }
}

module.exports = RegistryHelper;

