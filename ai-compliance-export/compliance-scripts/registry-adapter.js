#!/usr/bin/env node

/**
 * Registry Adapter - Backward compatibility layer
 * Provides the old registry interface using the new paginated structure
 * 
 * Usage: Replace
 *   const registry = JSON.parse(fs.readFileSync('function-registry.json'));
 * With:
 *   const registry = require('./tools/compliance/registry-adapter.js').getRegistry();
 */

const RegistryHelper = require('./registry-helper');

class RegistryAdapter {
  constructor() {
    this.helper = new RegistryHelper();
  }

  /**
   * Get registry in old format (backward compatible)
   * @returns {Object} Registry object matching old structure
   */
  getRegistry() {
    const index = this.helper.getIndex();
    
    if (!index) {
      return {
        functions: [],
        database_schema: {},
        compliance_config: {
          auto_tracking: true,
          violation_prevention: true,
          progress_monitoring: true
        },
        last_updated: new Date().toISOString(),
        total_functions_registered: 0
      };
    }

    // Return in old format for backward compatibility
    return {
      functions: this.helper.getAll(),
      database_schema: {},
      compliance_config: index.compliance_config || {
        auto_tracking: true,
        violation_prevention: true,
        progress_monitoring: true
      },
      last_updated: index.last_updated,
      total_functions_registered: index.summary.total_functions,
      last_scan: index.last_scan,
      // Metadata about new structure
      _v2_info: {
        using_paginated_registry: !index.legacy,
        version: index.version,
        registry_files: index.registry_files
      }
    };
  }

  /**
   * Get functions array (most commonly used)
   * @returns {Array} Array of all functions
   */
  getFunctions() {
    return this.helper.getAll();
  }

  /**
   * Get summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return this.helper.getSummary();
  }

  /**
   * Save registry (updates paginated structure)
   * @param {Object} registry - Registry object
   */
  saveRegistry(registry) {
    console.warn('⚠️  Direct registry save deprecated. Use registry-auto-updater-v2.js instead');
    console.warn('   The registry auto-updates on file changes');
  }
}

// Singleton instance
const adapter = new RegistryAdapter();

// Export both as module and CLI
module.exports = {
  getRegistry: () => adapter.getRegistry(),
  getFunctions: () => adapter.getFunctions(),
  getSummary: () => adapter.getSummary(),
  saveRegistry: (registry) => adapter.saveRegistry(registry),
  helper: adapter.helper
};

// CLI interface
if (require.main === module) {
  const registry = adapter.getRegistry();
  console.log(JSON.stringify(registry, null, 2));
}

