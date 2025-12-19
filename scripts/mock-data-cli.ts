#!/usr/bin/env npx tsx
/**
 * Mock Data Generator CLI
 *
 * Command-line interface for generating, exporting, and managing mock data.
 *
 * Usage:
 *   npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --from 2024-01-01 --to 2024-03-31
 *   npx tsx scripts/mock-data-cli.ts scenarios
 *   npx tsx scripts/mock-data-cli.ts status --job <id>
 *   npx tsx scripts/mock-data-cli.ts cleanup --confirm
 */

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import { runMockDataGeneration, getScenarioManager } from '../src/lib/mock-data-generator';
import type { MockGeneratorConfig } from '../src/lib/mock-data-generator/types';

const program = new Command();

program
  .name('mock-data-cli')
  .description('Mock Data Generator CLI for SynergyFlow ERP')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .description('Generate mock data for a specified scenario and date range')
  .option('-s, --scenario <name>', 'Scenario name to use', 'normal-ops')
  .option('-f, --from <date>', 'Start date (YYYY-MM-DD)', getDefaultStartDate())
  .option('-t, --to <date>', 'End date (YYYY-MM-DD)', getDefaultEndDate())
  .option('--seed <number>', 'Random seed for reproducibility')
  .option('-m, --multiplier <number>', 'Volume multiplier', '1')
  .option('--batch-size <number>', 'Batch size for inserts', '1000')
  .option('--dry-run', 'Run without writing to database', true)
  .option('--no-dry-run', 'Write to database')
  .action(async (options) => {
    console.log('\n🚀 Mock Data Generator\n');

    const config: MockGeneratorConfig = {
      startDate: options.from,
      endDate: options.to,
      seed: options.seed ? parseInt(options.seed, 10) : undefined,
      scenario: options.scenario,
      volumeMultiplier: parseFloat(options.multiplier),
      batchSize: parseInt(options.batchSize, 10),
      dryRun: options.dryRun,
    };

    console.log('Configuration:');
    console.log(`  Scenario: ${config.scenario}`);
    console.log(`  Date Range: ${config.startDate} to ${config.endDate}`);
    console.log(`  Volume Multiplier: ${config.volumeMultiplier}x`);
    console.log(`  Seed: ${config.seed ?? 'random'}`);
    console.log(`  Dry Run: ${config.dryRun}`);
    console.log('');

    try {
      const result = await runMockDataGeneration(config, {
        enableConsoleProgress: true,
        enableDatabaseWrites: !config.dryRun,
      });

      console.log('\n📊 Generation Results\n');
      console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Job ID: ${result.jobId}`);
      console.log(`  Duration: ${(result.timing.durationMs / 1000).toFixed(2)}s`);
      console.log('');
      console.log('  Records Generated:');

      for (const [entity, count] of Object.entries(result.recordCounts)) {
        if (count > 0) {
          console.log(`    ${entity}: ${count.toLocaleString()}`);
        }
      }

      if (result.errors.length > 0) {
        console.log('\n  Errors:');
        for (const error of result.errors) {
          console.log(`    ❌ ${error.entity}: ${error.message}`);
        }
      }

      console.log('');
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('\n❌ Generation failed:', error);
      process.exit(1);
    }
  });

// Scenarios command
program
  .command('scenarios')
  .description('List available scenario profiles')
  .action(() => {
    console.log('\n📋 Available Scenarios\n');

    const scenarioManager = getScenarioManager();
    const scenarios = scenarioManager.listScenariosWithDescriptions();

    for (const scenario of scenarios) {
      console.log(`  ${scenario.name}`);
      console.log(`    ${scenario.description}`);
      console.log('');
    }

    console.log(`Total: ${scenarios.length} scenarios`);
    console.log('');
  });

// Status command
program
  .command('status')
  .description('Check the status of a generation job')
  .requiredOption('-j, --job <id>', 'Job ID to check')
  .action(async (options) => {
    console.log(`\n📊 Checking status for job: ${options.job}\n`);

    try {
      const response = await fetch(
        `http://localhost:9002/api/mock-data/status?jobId=${options.job}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Error: ${data.error}`);
        process.exit(1);
      }

      console.log(`  Status: ${data.status}`);
      console.log(`  Progress: ${data.progress.progressPercent}%`);
      console.log(`  Current Entity: ${data.progress.currentEntity ?? 'N/A'}`);
      console.log(`  Throughput: ${data.progress.throughput} records/sec`);
      console.log(`  Errors: ${data.progress.errorCount}`);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to connect to API. Is the server running?');
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Remove all mock data from the database')
  .option('--confirm', 'Confirm cleanup')
  .action(async (options) => {
    if (!options.confirm) {
      console.log('\n⚠️  This will delete ALL mock data.');
      console.log('   Add --confirm to proceed.\n');
      process.exit(1);
    }

    console.log('\n🧹 Cleaning up mock data...\n');

    try {
      const response = await fetch(
        'http://localhost:9002/api/mock-data/cleanup?confirm=DELETE_ALL_MOCK_DATA',
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Error: ${data.error}`);
        process.exit(1);
      }

      console.log('✅ Cleanup complete');
      console.log('');
      console.log('Results:');
      for (const [table, result] of Object.entries(data.results as Record<string, string>)) {
        console.log(`  ${table}: ${result}`);
      }
      console.log('');
    } catch (error) {
      console.error('❌ Failed to connect to API. Is the server running?');
      process.exit(1);
    }
  });

// Toggle command
program
  .command('toggle')
  .description('Enable or disable mock data generation')
  .option('--enable', 'Enable mock data generation')
  .option('--disable', 'Disable mock data generation')
  .action(async (options) => {
    if (!options.enable && !options.disable) {
      // Just check status
      try {
        const response = await fetch('http://localhost:9002/api/mock-data/toggle');
        const data = await response.json();
        console.log(`\n📊 Mock Data Generation: ${data.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Environment: ${data.environment}`);
        console.log('');
      } catch {
        console.error('❌ Failed to connect to API.');
        process.exit(1);
      }
      return;
    }

    const enable = options.enable ?? false;

    try {
      const response = await fetch('http://localhost:9002/api/mock-data/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Error: ${data.error}`);
        process.exit(1);
      }

      console.log(`\n✅ Mock data generation ${enable ? 'enabled' : 'disabled'}`);
      console.log('');
    } catch {
      console.error('❌ Failed to connect to API.');
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate a scenario configuration')
  .requiredOption('-s, --scenario <name>', 'Scenario name to validate')
  .action((options) => {
    console.log(`\n🔍 Validating scenario: ${options.scenario}\n`);

    const scenarioManager = getScenarioManager();

    try {
      const scenario = scenarioManager.loadScenario(options.scenario);
      const validation = scenarioManager.validateScenario(scenario);

      if (validation.valid) {
        console.log('✅ Scenario is valid');
        console.log('');
        console.log('Configuration:');
        console.log(`  Name: ${scenario.name}`);
        console.log(`  Description: ${scenario.description}`);
        console.log(`  Anomaly Rate: ${(scenario.anomalyRate * 100).toFixed(0)}%`);
        console.log('');
        console.log('  Entity Rates:');
        for (const [entity, rate] of Object.entries(scenario.entityRates)) {
          console.log(`    ${entity}: ${rate}`);
        }
      } else {
        console.log('❌ Scenario validation failed');
        for (const error of validation.errors) {
          console.log(`   - ${error}`);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    console.log('');
  });

// Export command
program
  .command('export')
  .description('Export mock data')
  .requiredOption('-f, --format <format>', 'Export format (json, csv, sql)')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    console.log(`\n📤 Exporting mock data as ${options.format}...\n`);

    try {
      const response = await fetch('http://localhost:9002/api/mock-data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: options.format,
          outputPath: options.output ?? './mock-data-export',
          includeMetadata: true,
        }),
      });

      if (options.format === 'json' || options.format === 'sql') {
        const text = await response.text();
        if (options.output) {
          const fs = await import('fs');
          fs.writeFileSync(options.output, text);
          console.log(`✅ Exported to ${options.output}`);
        } else {
          console.log(text.substring(0, 1000) + '...');
          console.log('\nUse -o <path> to save to file');
        }
      } else {
        const data = await response.json();
        console.log('Export summary:');
        console.log(data.summary);
      }
      console.log('');
    } catch (error) {
      console.error('❌ Export failed:', error);
      process.exit(1);
    }
  });

// Helper functions
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 180);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Parse and execute
program.parse();
