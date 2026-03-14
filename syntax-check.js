const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = 'C:\\Users\\admin\\Desktop\\random projs\\FitOne';
const files = [
  'src\\dataStore.js',
  'src\\syncService.js',
  'src\\wearableIntegration.js',
  'src\\views\\settingsView.js',
  'src\\views\\exportView.js',
  'src\\views\\logView.js',
  'src\\views\\protocolsView.js',
  'src\\views\\todayView.js',
  'src\\views\\analyticsView.js',
  'src\\main.js',
  'pwa\\sw.js',
  'sw.js'
];

const passed = [];
const failed = [];

files.forEach(file => {
  const fullPath = path.join(baseDir, file);
  
  if (fs.existsSync(fullPath)) {
    console.log(`\nChecking: ${file}`);
    try {
      execSync(`node --check "${fullPath}"`, { encoding: 'utf-8' });
      passed.push(file);
      console.log('✓ PASSED');
    } catch (error) {
      failed.push(file);
      console.log('✗ FAILED');
      console.log(`Error: ${error.stderr || error.message}`);
    }
  } else {
    console.log(`\nChecking: ${file}`);
    console.log('✗ FILE NOT FOUND');
    failed.push(file);
  }
});

console.log('\n================================');
console.log('SYNTAX CHECK SUMMARY');
console.log('================================');
console.log(`Total files: ${files.length}`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);

if (passed.length > 0) {
  console.log('\nPASSED FILES:');
  passed.forEach(f => console.log(`  ✓ ${f}`));
}

if (failed.length > 0) {
  console.log('\nFAILED FILES:');
  failed.forEach(f => console.log(`  ✗ ${f}`));
}
