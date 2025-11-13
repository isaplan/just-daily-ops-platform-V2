#!/usr/bin/env node

/**
 * AI Compliance Setup Script
 * Automatically sets up AI compliance system in any project
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class AIComplianceSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.setupFiles = [
      '.ai-rules-docs/ai-operating-constraints.md',
      'tools/compliance/',
      'function-registry.json',
      'progress-log.json',
      'ai-tracking-system.json'
    ];
  }

  async setup() {
    console.log('🚀 Setting up AI Compliance System...');
    
    try {
      // Check if files exist
      await this.checkRequiredFiles();
      
      // Add npm scripts
      await this.addNpmScripts();
      
      // Create initial tracking files if they don't exist
      await this.createInitialFiles();
      
      // Test the system
      await this.testSystem();
      
      console.log('✅ AI Compliance System setup complete!');
      console.log('\n📋 Next steps:');
      console.log('1. Run: npm run compliance:auto');
      console.log('2. Start your development work');
      console.log('3. The system will automatically monitor and prevent violations');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async checkRequiredFiles() {
    console.log('🔍 Checking required files...');
    
    const missingFiles = [];
    for (const file of this.setupFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}\nPlease copy these files from the original project.`);
    }
    
    console.log('✅ All required files found');
  }

  async addNpmScripts() {
    console.log('📝 Adding npm scripts...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Please run this script in a Node.js project.');
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts['compliance:check'] = 'node tools/compliance/ai-compliance-checker.js';
    packageJson.scripts['compliance:auto'] = 'node tools/compliance/auto-compliance.js';
    packageJson.scripts['compliance:dashboard'] = 'node tools/compliance/ai-compliance-dashboard.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ NPM scripts added');
  }

  async createInitialFiles() {
    console.log('📁 Creating initial tracking files...');
    
    // Create function-registry.json if it doesn't exist
    const registryPath = path.join(this.projectRoot, 'function-registry.json');
    if (!fs.existsSync(registryPath)) {
      const initialRegistry = {
        "functions": [],
        "database_schema": {
          "active_tables": {}
        }
      };
      fs.writeFileSync(registryPath, JSON.stringify(initialRegistry, null, 2));
      console.log('✅ Created function-registry.json');
    }
    
    // Create progress-log.json if it doesn't exist
    const progressPath = path.join(this.projectRoot, 'progress-log.json');
    if (!fs.existsSync(progressPath)) {
      const initialProgress = {
        "_metadata": {
          "systemActive": true,
          "lastUpdated": new Date().toISOString(),
          "currentSession": new Date().toISOString().split('T')[0].replace(/-/g, '_')
        }
      };
      fs.writeFileSync(progressPath, JSON.stringify(initialProgress, null, 2));
      console.log('✅ Created progress-log.json');
    }
    
    // Create ai-tracking-system.json if it doesn't exist
    const trackingPath = path.join(this.projectRoot, 'ai-tracking-system.json');
    if (!fs.existsSync(trackingPath)) {
      const initialTracking = {
        "system_info": {
          "version": "1.0.0",
          "created": new Date().toISOString(),
          "last_updated": new Date().toISOString(),
          "status": "active"
        },
        "tracking_config": {
          "auto_create_files": true,
          "auto_update_progress": true,
          "compliance_checks": {
            "enabled": true,
            "frequency": "on_change",
            "auto_fix": true
          }
        },
        "current_session": {
          "session_id": `session-${Date.now()}`,
          "start_time": new Date().toISOString(),
          "current_focus": "Setup AI Compliance System",
          "active_tasks": [],
          "completed_tasks": ["Setup AI Compliance System"],
          "violations_detected": 0,
          "last_compliance_check": new Date().toISOString()
        },
        "compliance_history": [],
        "automation_status": {
          "file_creation": "enabled",
          "progress_tracking": "enabled",
          "compliance_monitoring": "enabled",
          "auto_fixes": "enabled"
        }
      };
      fs.writeFileSync(trackingPath, JSON.stringify(initialTracking, null, 2));
      console.log('✅ Created ai-tracking-system.json');
    }
  }

  async testSystem() {
    console.log('🧪 Testing compliance system...');
    
    return new Promise((resolve, reject) => {
      exec('npm run compliance:check', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Compliance test failed:', error);
          reject(error);
        } else {
          console.log('✅ Compliance system test passed');
          resolve();
        }
      });
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new AIComplianceSetup();
  setup.setup();
}

module.exports = AIComplianceSetup;


