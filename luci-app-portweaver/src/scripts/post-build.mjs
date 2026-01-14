#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try multiple possible paths
const possiblePaths = [
  join(__dirname, '../../htdocs/luci-static/resources/view/portweaver/config.js'),
  join(__dirname, '../../../htdocs/luci-static/resources/view/portweaver/config.js'),
  resolve(process.cwd(), '../htdocs/luci-static/resources/view/portweaver/config.js'),
];

let configPath = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    configPath = path;
    break;
  }
}

if (!configPath) {
  console.error('✗ Could not find config.js in any expected location');
  console.error('Tried paths:', possiblePaths);
  process.exit(1);
}

console.log(`Post-processing config.js for LuCI compatibility...`);
console.log(`Found at: ${configPath}`);

let content = readFileSync(configPath, 'utf-8');

// LuCI expects: 'use strict'; 'require ...'; ... return view.extend({...});
// Strategy: Extract all code between the banner and the end, strip webpack wrappers

// Step 1: Extract the LuCI banner
const bannerMatch = content.match(/^('use strict';[\s\S]*?'require ui';)\s*\n/);
if (!bannerMatch) {
  console.error('✗ Could not find LuCI require banner');
  process.exit(1);
}
const luciRequires = bannerMatch[1];

// Step 2: Find the main code section - look for the viewModule definition
const viewModuleMatch = content.match(/(const viewModule = view\.extend\(\{[\s\S]*?\n\}\);)/);
if (!viewModuleMatch) {
  console.error('✗ Could not find viewModule definition');
  process.exit(1);
}

// Step 3: Extract all helper functions and imports before viewModule
// Find where formatBytes starts (first actual function)
const formatBytesMatch = content.match(/(function formatBytes[\s\S]*?)(const viewModule)/);
if (!formatBytesMatch) {
  console.error('✗ Could not find formatBytes function');
  process.exit(1);
}

const helperFunctions = formatBytesMatch[1];
const viewModuleDef = formatBytesMatch[2] + viewModuleMatch[1].substring('const viewModule'.length);

// Step 4: Build final output
const finalContent = `${luciRequires}

${helperFunctions.trim()}

${viewModuleDef}

return viewModule;
`;

writeFileSync(configPath, finalContent, 'utf-8');
console.log('✓ config.js post-processed successfully');
