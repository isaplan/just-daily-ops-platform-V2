#!/usr/bin/env node

/**
 * Script to organize root-level files into proper directories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();

// Define organization rules
const organizationRules = {
  'scripts/test': ['test-*.js'],
  'scripts/check': ['check-*.js'],
  'scripts/debug': ['debug-*.js'],
  'scripts/utils': ['verify-*.js', 'clear-*.js', 'create-*.js', 'import-*.js', 'fix-*.js', 'setup-*.js', 'simple-*.js', 'compare-*.js', 'diagnose-*.js', 'mock-*.js', 'basic-*.js'],
  'scripts/sql': ['*.sql'],
  'docs': ['*.md', '!README.md']
};

// Get all files in root
function getRootFiles() {
  return fs.readdirSync(projectRoot)
    .filter(file => {
      const fullPath = path.join(projectRoot, file);
      return fs.statSync(fullPath).isFile() && 
             !file.startsWith('.') && 
             file !== 'package.json' &&
             file !== 'package-lock.json' &&
             file !== 'tsconfig.json' &&
             file !== 'next.config.ts' &&
             file !== 'eslint.config.mjs' &&
             file !== 'postcss.config.mjs' &&
             file !== 'components.json';
    });
}

// Match file to organization rule
function getTargetDirectory(file) {
  for (const [dir, patterns] of Object.entries(organizationRules)) {
    for (const pattern of patterns) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/!/g, '^') + '$');
      if (regex.test(file)) {
        return dir;
      }
    }
  }
  return null;
}

// Move file
function moveFile(file, targetDir) {
  const sourcePath = path.join(projectRoot, file);
  const targetPath = path.join(projectRoot, targetDir, file);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(path.join(projectRoot, targetDir))) {
    fs.mkdirSync(path.join(projectRoot, targetDir), { recursive: true });
  }
  
  // Check if target already exists
  if (fs.existsSync(targetPath)) {
    console.log(`⚠️  Skipping ${file} - already exists in ${targetDir}/`);
    return false;
  }
  
  // Move file
  fs.renameSync(sourcePath, targetPath);
  console.log(`✅ Moved ${file} → ${targetDir}/`);
  return true;
}

// Main execution
function main() {
  console.log('📁 Organizing root-level files...\n');
  
  const files = getRootFiles();
  let moved = 0;
  let skipped = 0;
  
  for (const file of files) {
    const targetDir = getTargetDirectory(file);
    if (targetDir) {
      if (moveFile(file, targetDir)) {
        moved++;
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`\n✨ Done! Moved ${moved} files, skipped ${skipped} duplicates.`);
}

if (require.main === module) {
  main();
}

module.exports = { main };

