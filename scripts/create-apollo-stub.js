/**
 * Create Apollo Server stub module for @yaacovcr/transform
 * 
 * This script creates a stub module to satisfy Apollo Server's optional
 * dependency requirement. The real package requires GraphQL v17, but we're
 * using GraphQL v16, so we create a minimal stub instead.
 */

const fs = require('fs');
const path = require('path');

const stubDir = path.join(__dirname, '..', 'node_modules', '@yaacovcr', 'transform');
const stubIndex = path.join(stubDir, 'index.js');
const stubPackageJson = path.join(stubDir, 'package.json');

// Create directory if it doesn't exist
if (!fs.existsSync(stubDir)) {
  fs.mkdirSync(stubDir, { recursive: true });
}

// Create index.js stub
const indexContent = `module.exports = { legacyExecuteIncrementally: null };`;
fs.writeFileSync(stubIndex, indexContent, 'utf8');

// Create package.json stub
const packageJsonContent = JSON.stringify({
  name: '@yaacovcr/transform',
  version: '0.0.8',
  main: 'index.js'
}, null, 2);
fs.writeFileSync(stubPackageJson, packageJsonContent, 'utf8');

console.log('✅ Apollo Server stub module created successfully');

