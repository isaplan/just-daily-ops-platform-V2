#!/usr/bin/env node

/**
 * Registry Auto-Updater V2 - Paginated & Optimized
 * Splits registry into multiple files by type
 * Reduces per-function metadata by 50%
 * Maintains backward compatibility
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class RegistryAutoUpdaterV2 {
  constructor() {
    this.projectRoot = process.cwd();
    this.registryDir = path.join(this.projectRoot, 'function-registry');
    this.legacyRegistryPath = path.join(this.projectRoot, 'function-registry.json');
    this.srcDir = path.join(this.projectRoot, 'src');
    
    // Registry structure by type
    this.registries = {
      'api-routes': [],
      'pages': [],
      'components': [],
      'services': [],
      'hooks': [],
      'modules': []
    };
    
    this.fileChecksums = new Map();
    this.changes = {
      new: [],
      updated: [],
      removed: [],
      unchanged: []
    };
  }

  async update() {
    console.log('\n🔄 REGISTRY AUTO-UPDATE V2 - Scanning with optimization...');
    const startTime = Date.now();
    
    try {
      // Ensure registry directory exists
      this.ensureRegistryDir();
      
      // Load existing registries
      this.loadRegistries();
      
      // Build checksum map
      this.buildChecksumMap();
      
      // Scan codebase
      this.scanCodebase();
      
      // Update registries
      this.updateRegistries();
      
      // Save all registries
      this.saveRegistries();
      
      const duration = Date.now() - startTime;
      const summary = this.generateSummary();
      
      console.log(`✅ Registry update completed in ${duration}ms`);
      console.log(`   📊 Total files registered: ${summary.total_functions}`);
      console.log(`   ✨ New: ${this.changes.new.length}`);
      console.log(`   🔄 Updated: ${this.changes.updated.length}`);
      console.log(`   ❌ Removed: ${this.changes.removed.length}`);
      console.log(`   ✅ Unchanged: ${this.changes.unchanged.length}`);
      console.log(`\n📦 Registry breakdown:`);
      Object.keys(this.registries).forEach(type => {
        console.log(`   ${type}: ${this.registries[type].length}`);
      });
      
      return {
        updated: true,
        summary: summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Registry update failed:', error);
      throw error;
    }
  }

  ensureRegistryDir() {
    if (!fs.existsSync(this.registryDir)) {
      fs.mkdirSync(this.registryDir, { recursive: true });
      console.log('📁 Created function-registry/ directory');
    }
  }

  loadRegistries() {
    // Try to load from new structure first
    let loadedFromNew = false;
    
    Object.keys(this.registries).forEach(type => {
      const filePath = path.join(this.registryDir, `${type}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.registries[type] = data.functions || [];
          loadedFromNew = true;
        } catch (e) {
          console.warn(`⚠️  Could not load ${type}.json, starting fresh`);
          this.registries[type] = [];
        }
      }
    });

    // If no new structure, migrate from legacy
    if (!loadedFromNew && fs.existsSync(this.legacyRegistryPath)) {
      console.log('📦 Migrating from legacy function-registry.json...');
      this.migrateLegacyRegistry();
    }
  }

  migrateLegacyRegistry() {
    try {
      const legacy = JSON.parse(fs.readFileSync(this.legacyRegistryPath, 'utf8'));
      
      if (legacy.functions && Array.isArray(legacy.functions)) {
        legacy.functions.forEach(func => {
          // Transform to new lean format
          const leanFunc = this.toLeanFormat(func);
          
          // Route to appropriate registry
          const type = this.normalizeType(func.type);
          if (this.registries[type]) {
            this.registries[type].push(leanFunc);
          } else {
            this.registries['modules'].push(leanFunc);
          }
        });
        
        console.log(`✅ Migrated ${legacy.functions.length} functions from legacy registry`);
        
        // Backup legacy file
        const backupPath = this.legacyRegistryPath + '.backup-' + Date.now();
        fs.copyFileSync(this.legacyRegistryPath, backupPath);
        console.log(`📋 Backed up legacy registry to ${path.basename(backupPath)}`);
      }
    } catch (e) {
      console.warn('⚠️  Could not migrate legacy registry:', e.message);
    }
  }

  toLeanFormat(func) {
    // Convert to optimized format (50% size reduction)
    return {
      file: func.file,
      name: func.name,
      type: func.type,
      status: func.status || 'detected',
      touch_again: func.touch_again !== undefined ? func.touch_again : true,
      checksum: func.checksum,
      updated: func.last_updated || new Date().toISOString()
    };
  }

  normalizeType(type) {
    const typeMap = {
      'api-route': 'api-routes',
      'page': 'pages',
      'component': 'components',
      'service': 'services',
      'hook': 'hooks',
      'module': 'modules'
    };
    return typeMap[type] || 'modules';
  }

  buildChecksumMap() {
    this.fileChecksums.clear();
    
    Object.values(this.registries).forEach(registry => {
      registry.forEach(func => {
        const fullPath = path.join(this.projectRoot, func.file);
        if (fs.existsSync(fullPath)) {
          const checksum = this.calculateChecksum(fullPath);
          this.fileChecksums.set(func.file, {
            checksum: checksum,
            func: func,
            exists: true
          });
        } else {
          this.fileChecksums.set(func.file, {
            checksum: null,
            func: func,
            exists: false
          });
        }
      });
    });
  }

  calculateChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    } catch (e) {
      return null;
    }
  }

  scanCodebase() {
    this.scannedFiles = [];
    
    if (!fs.existsSync(this.srcDir)) {
      console.warn('⚠️  src/ directory not found');
      return;
    }

    this.scanDirectory(this.srcDir);
    console.log(`📁 Scanned ${this.scannedFiles.length} files`);
  }

  scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);
        
        // Skip ignored directories
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        if (['node_modules', '.next', 'dist', 'build', 'old-pages-sql-scripts'].includes(entry.name)) continue;
        
        if (entry.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          this.processFile(fullPath, relativePath);
        }
      }
    } catch (e) {
      // Directory read failed, skip
    }
  }

  processFile(filePath, relativePath) {
    if (!relativePath.match(/\.(ts|tsx|js|jsx)$/)) return;
    
    this.scannedFiles.push(relativePath);
    
    const fileInfo = this.analyzeFile(filePath, relativePath);
    if (!fileInfo.shouldRegister) return;
    
    const existing = this.fileChecksums.get(relativePath);
    const currentChecksum = this.calculateChecksum(filePath);
    
    if (!existing) {
      // New file
      this.changes.new.push(fileInfo);
      this.addOrUpdateFunction(fileInfo, null);
    } else if (existing.exists && existing.checksum !== currentChecksum) {
      // File changed
      fileInfo.checksum = currentChecksum;
      this.changes.updated.push(fileInfo);
      this.addOrUpdateFunction(fileInfo, existing.func);
    } else if (existing.exists && existing.checksum === currentChecksum) {
      // Unchanged
      this.changes.unchanged.push(relativePath);
    }
    
    if (existing) {
      existing.seen = true;
    }
  }

  analyzeFile(filePath, relativePath) {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return { shouldRegister: false };
    }

    const info = {
      file: relativePath,
      shouldRegister: false,
      type: 'unknown',
      name: path.basename(relativePath, path.extname(relativePath)),
      checksum: this.calculateChecksum(filePath)
    };

    // Detection logic
    if (relativePath.includes('/page.tsx') || relativePath.includes('/page.ts')) {
      info.type = 'page';
      info.shouldRegister = true;
      info.name = this.extractPageName(relativePath);
    } else if (relativePath.includes('/api/') && relativePath.includes('/route.ts')) {
      info.type = 'api-route';
      info.shouldRegister = true;
      info.name = this.extractApiRouteName(relativePath);
    } else if (relativePath.includes('/components/') || 
               (content.includes('export') && (content.includes('function') || content.includes('const')))) {
      info.type = 'component';
      info.shouldRegister = content.includes('export') && content.length > 50;
      if (info.shouldRegister) {
        info.name = this.extractComponentName(content, info.name);
      }
    } else if (relativePath.includes('/lib/') || relativePath.includes('/services/')) {
      info.type = 'service';
      info.shouldRegister = content.includes('export') && content.length > 50;
      if (info.shouldRegister) {
        info.name = this.extractServiceName(relativePath);
      }
    } else if (relativePath.includes('/hooks/') || (relativePath.includes('use') && relativePath.includes('.ts'))) {
      info.type = 'hook';
      info.shouldRegister = content.includes('use') && content.includes('export');
      if (info.shouldRegister) {
        info.name = this.extractHookName(relativePath, content);
      }
    } else if (content.includes('export') && (content.includes('function') || content.includes('const') || content.includes('class'))) {
      info.type = 'module';
      info.shouldRegister = content.length > 100;
      if (info.shouldRegister) {
        info.name = this.extractModuleName(relativePath, content);
      }
    }

    if (info.shouldRegister) {
      const hasIssues = /TODO|FIXME|XXX|HACK|BUG|WIP/i.test(content);
      info.status = hasIssues ? 'in-progress' : 'completed';
      info.touch_again = hasIssues;
    }

    return info;
  }

  extractPageName(relativePath) {
    const parts = relativePath.split('/');
    const pageIndex = parts.findIndex(p => p === 'page.tsx' || p === 'page.ts');
    if (pageIndex > 0) {
      return parts[pageIndex - 1].split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ') + ' Page';
    }
    return 'Page';
  }

  extractApiRouteName(relativePath) {
    const match = relativePath.match(/\/api\/([^/]+)\/([^/]+)\/route\.ts/);
    if (match) {
      return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)} API`;
    }
    
    // Fallback for single-level API routes
    const singleMatch = relativePath.match(/\/api\/([^/]+)\/route\.ts/);
    if (singleMatch) {
      return `${singleMatch[1].charAt(0).toUpperCase() + singleMatch[1].slice(1)} API`;
    }
    
    return 'API Route';
  }

  extractComponentName(content, defaultName) {
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
    return defaultName;
  }

  extractServiceName(relativePath) {
    const fileName = path.basename(relativePath, path.extname(relativePath));
    return fileName.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  extractHookName(relativePath, content) {
    const match = content.match(/(?:export\s+)?(?:function|const)\s+use(\w+)/);
    if (match) {
      return `use${match[1]}`;
    }
    return path.basename(relativePath, path.extname(relativePath));
  }

  extractModuleName(relativePath, content) {
    const fileName = path.basename(relativePath, path.extname(relativePath));
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
    return fileName.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  addOrUpdateFunction(fileInfo, existingFunc) {
    const type = this.normalizeType(fileInfo.type);
    const registry = this.registries[type];
    
    const funcEntry = {
      file: fileInfo.file,
      name: fileInfo.name,
      type: fileInfo.type,
      status: fileInfo.status || existingFunc?.status || 'detected',
      touch_again: fileInfo.touch_again !== undefined ? fileInfo.touch_again : 
                   (existingFunc?.touch_again !== undefined ? existingFunc.touch_again : true),
      checksum: fileInfo.checksum,
      updated: new Date().toISOString()
    };

    // Preserve manual protections
    if (existingFunc && existingFunc.touch_again === false) {
      funcEntry.touch_again = false;
      funcEntry.status = existingFunc.status || 'completed';
    }

    const existingIndex = registry.findIndex(f => f.file === fileInfo.file);
    
    if (existingIndex >= 0) {
      registry[existingIndex] = { ...registry[existingIndex], ...funcEntry };
    } else {
      registry.push(funcEntry);
    }
  }

  updateRegistries() {
    // Mark files not seen as removed
    this.fileChecksums.forEach((data, file) => {
      if (!data.seen && data.exists) {
        this.changes.removed.push({ file, func: data.func });
      }
    });
  }

  saveRegistries() {
    const timestamp = new Date().toISOString();
    
    // Save each type registry
    Object.keys(this.registries).forEach(type => {
      const registry = this.registries[type];
      
      // Sort by name
      registry.sort((a, b) => a.name.localeCompare(b.name));
      
      const data = {
        type: type,
        functions: registry,
        count: registry.length,
        last_updated: timestamp
      };
      
      const filePath = path.join(this.registryDir, `${type}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    });

    // Save index
    const index = {
      version: "2.0.0",
      last_updated: timestamp,
      registry_files: {},
      summary: this.generateSummary(),
      last_scan: {
        timestamp: timestamp,
        files_scanned: this.scannedFiles.length,
        changes: {
          new: this.changes.new.length,
          updated: this.changes.updated.length,
          removed: this.changes.removed.length,
          unchanged: this.changes.unchanged.length
        }
      },
      compliance_config: {
        auto_tracking: true,
        violation_prevention: true,
        progress_monitoring: true
      }
    };

    Object.keys(this.registries).forEach(type => {
      index.registry_files[type] = {
        file: `${type}.json`,
        count: this.registries[type].length,
        updated: timestamp
      };
    });

    const indexPath = path.join(this.registryDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`\n💾 Saved ${Object.keys(this.registries).length} registry files + index`);
  }

  generateSummary() {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let protectedCount = 0;

    Object.values(this.registries).forEach(registry => {
      total += registry.length;
      completed += registry.filter(f => f.status === 'completed').length;
      inProgress += registry.filter(f => f.status === 'in-progress').length;
      protectedCount += registry.filter(f => f.touch_again === false).length;
    });

    return {
      total_functions: total,
      by_status: {
        completed,
        'in-progress': inProgress
      },
      protected: protectedCount
    };
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new RegistryAutoUpdaterV2();
  updater.update()
    .then(result => {
      console.log('\n📊 Update Summary:');
      console.log(JSON.stringify(result.summary, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = RegistryAutoUpdaterV2;

