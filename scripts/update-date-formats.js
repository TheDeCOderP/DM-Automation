#!/usr/bin/env node

/**
 * Script to help identify files that need date format updates
 * Run with: node scripts/update-date-formats.js
 */

const fs = require('fs');
const path = require('path');

const patterns = [
  { pattern: /new Date\([^)]+\)\.toLocaleDateString\(\)/g, name: 'toLocaleDateString()' },
  { pattern: /new Date\([^)]+\)\.toLocaleString\(\)/g, name: 'toLocaleString()' },
  { pattern: /new Date\([^)]+\)\.toISOString\(\)\.split\(['"]T['"]\)\[0\]/g, name: 'toISOString().split()' },
  { pattern: /\.toLocaleDateString\(['"]en-US['"],\s*\{[^}]+\}\)/g, name: 'toLocaleDateString with options' },
];

const excludeDirs = ['node_modules', '.next', '.git', 'dist', 'build'];
const includeExts = ['.tsx', '.ts', '.jsx', '.js'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return includeExts.includes(ext);
}

function shouldProcessDir(dirName) {
  return !excludeDirs.includes(dirName) && !dirName.startsWith('.');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [];

  patterns.forEach(({ pattern, name }) => {
    const found = content.match(pattern);
    if (found) {
      matches.push({ pattern: name, count: found.length, examples: found.slice(0, 2) });
    }
  });

  return matches.length > 0 ? { filePath, matches } : null;
}

function scanDirectory(dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && shouldProcessDir(entry.name)) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && shouldProcessFile(entry.name)) {
      const result = scanFile(fullPath);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

console.log('🔍 Scanning for date format patterns...\n');

const srcPath = path.join(process.cwd(), 'src');
const results = scanDirectory(srcPath);

if (results.length === 0) {
  console.log('✅ No date format patterns found! All files are up to date.\n');
} else {
  console.log(`📋 Found ${results.length} files with date formatting:\n`);
  
  results.forEach(({ filePath, matches }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n📄 ${relativePath}`);
    matches.forEach(({ pattern, count, examples }) => {
      console.log(`   • ${pattern}: ${count} occurrence(s)`);
      examples.forEach(ex => console.log(`     - ${ex.substring(0, 60)}...`));
    });
  });

  console.log('\n\n📝 Next Steps:');
  console.log('1. Import the utility: import { formatDate, formatDateTime } from "@/utils/format"');
  console.log('2. Replace patterns:');
  console.log('   - new Date(x).toLocaleDateString() → formatDate(x)');
  console.log('   - new Date(x).toLocaleString() → formatDateTime(x)');
  console.log('   - new Date(x).toISOString().split("T")[0] → formatDate(x)');
  console.log('\n3. See DATE_FORMAT_MIGRATION_GUIDE.md for detailed instructions\n');
}
