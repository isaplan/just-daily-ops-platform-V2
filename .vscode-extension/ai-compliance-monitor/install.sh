#!/bin/bash

# AI Compliance Monitor - Installation Script
# This script compiles and packages the VS Code extension

set -e

echo "🚀 Installing AI Compliance Monitor Extension..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Navigate to extension directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Failed to compile TypeScript"
    exit 1
fi

echo ""
echo "📦 Packaging extension..."
npm run package

if [ $? -ne 0 ]; then
    echo "❌ Failed to package extension"
    exit 1
fi

echo ""
echo "✅ Extension packaged successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Open VS Code or Cursor"
echo "2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
echo "3. Type 'Install from VSIX'"
echo "4. Select the file: ai-compliance-monitor-1.0.0.vsix"
echo "5. Reload the window"
echo ""
echo "📚 See SETUP-INSTRUCTIONS.md for detailed setup guide"
echo ""







