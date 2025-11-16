/**
 * Create Apollo Server stub module for @yaacovcr/transform
 * 
 * This script creates a stub module to satisfy Apollo Server's optional
 * dependency requirement. The real package requires GraphQL v17, but we're
 * using GraphQL v16, so we create a minimal stub instead.
 * 
 * This stub supports both CommonJS and ESM formats for Next.js/Turbopack compatibility.
 */

const fs = require('fs');
const path = require('path');

const stubDir = path.join(__dirname, '..', 'node_modules', '@yaacovcr', 'transform');
const stubIndex = path.join(stubDir, 'index.js');
const stubIndexMjs = path.join(stubDir, 'index.mjs');
const stubPackageJson = path.join(stubDir, 'package.json');

// Create directory if it doesn't exist
if (!fs.existsSync(stubDir)) {
  fs.mkdirSync(stubDir, { recursive: true });
}

// Create CommonJS index.js stub (for require() calls)
const indexContent = `// CommonJS stub for @yaacovcr/transform
module.exports = { 
  legacyExecuteIncrementally: null 
};

// Also export as default for compatibility
module.exports.default = module.exports;
`;
fs.writeFileSync(stubIndex, indexContent, 'utf8');

// Create ESM index.mjs stub for Turbopack/Next.js (for import statements)
const indexMjsContent = `// ESM stub for @yaacovcr/transform
export const legacyExecuteIncrementally = null;
export default { legacyExecuteIncrementally: null };
`;
fs.writeFileSync(stubIndexMjs, indexMjsContent, 'utf8');

// Create package.json stub with both CommonJS and ESM exports
// Note: We use "type": "commonjs" so .js files use CommonJS, and .mjs files use ESM
const packageJsonContent = JSON.stringify({
  name: '@yaacovcr/transform',
  version: '0.0.8',
  main: 'index.js',
  module: 'index.mjs',
  type: 'commonjs', // Use commonjs so .js files work with require()
  exports: {
    '.': {
      require: './index.js',
      import: './index.mjs',
      default: './index.js'
    },
    './package.json': './package.json'
  }
}, null, 2);
fs.writeFileSync(stubPackageJson, packageJsonContent, 'utf8');

console.log('✅ Apollo Server stub module created successfully (CommonJS + ESM)');

