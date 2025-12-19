#!/usr/bin/env npx tsx
/**
 * Mock Data CI/Demo Script
 *
 * Runs the full lifecycle of mock data generation to verify system stability.
 * 1. Cleanup existing data
 * 2. Generate new data (small batch)
 * 3. Export data
 * 4. Validate data integrity
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(command: string) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { 
      stdio: 'inherit', 
      env: { 
        ...process.env, 
        MOCK_DATA_ENABLED: 'true',
        NODE_ENV: 'development'
      } 
    });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting Mock Data CI/Demo Flow\n');

  // 1. Cleanup
  console.log('📦 Step 1: Cleaning up database...');
  run('npx tsx scripts/reset-db.ts');

  // 2. Generate Data
  // Generate 1 week of data
  console.log('⚡ Step 2: Generating mock data (180 days)...');
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  run(`npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --from ${startDate} --to ${endDate} --no-dry-run --batch-size 500`);

  // 3. Export Data
  console.log('out Step 3: Verifying export capability (Skipped - Requires API Server)');
  // const exportPath = path.resolve('./temp_ci_export.json');
  // run(`npx tsx scripts/mock-data-cli.ts export --format json --output "${exportPath}"`);
  
  // if (fs.existsSync(exportPath)) {
  //   const stats = fs.statSync(exportPath);
  //   console.log(`   Export successful: ${stats.size} bytes`);
  //   fs.unlinkSync(exportPath); // Cleanup
  // } else {
  //   console.error('   Export failed: File not created');
  //   process.exit(1);
  // }

  // 4. Validate Data
  console.log('🔍 Step 4: Validating data integrity...');
  run('npx tsx scripts/validate-acceptance-criteria.ts');

  console.log('\n✨ CI/Demo Flow Completed Successfully!');
}

main().catch(console.error);
