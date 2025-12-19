/**
 * Safety Guard for Mock Data Generator
 *
 * Implements environment checks, schema isolation, and production write prevention
 * to ensure mock data generation never contaminates production databases.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { SafetyConfig, SafetyCheckResult, SafetyFailure } from './types';
import { SafetyConfigSchema } from './config/schemas';

/**
 * Default safety configuration
 */
const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  targetSchema: 'mock_data',
  requireExplicitEnable: true,
  maxRecordsPerEntity: 1000000,
  allowedEnvironments: ['development', 'test', 'staging'],
  blockProductionWrites: true,
};

/**
 * SafetyGuard class to prevent accidental production data contamination
 */
export class SafetyGuard {
  private config: SafetyConfig;
  private checkResults: SafetyFailure[] = [];

  constructor(config?: Partial<SafetyConfig>) {
    const parsed = SafetyConfigSchema.safeParse({
      ...DEFAULT_SAFETY_CONFIG,
      ...config,
    });

    if (!parsed.success) {
      throw new Error(`Invalid safety configuration: ${parsed.error.message}`);
    }

    this.config = parsed.data as SafetyConfig;
  }

  /**
   * Check if the current environment allows mock data generation
   */
  checkEnvironment(): boolean {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const mockDataEnabled = process.env.MOCK_DATA_ENABLED === 'true';

    this.checkResults = [];

    // Check NODE_ENV
    if (nodeEnv === 'production' && this.config.blockProductionWrites) {
      this.checkResults.push({
        check: 'environment',
        reason: `Mock data generation is blocked in production environment (NODE_ENV=${nodeEnv})`,
        severity: 'error',
      });
    }

    // Check if current environment is in allowed list
    if (!this.config.allowedEnvironments.includes(nodeEnv)) {
      this.checkResults.push({
        check: 'allowed_environments',
        reason: `Current environment "${nodeEnv}" is not in allowed list: [${this.config.allowedEnvironments.join(', ')}]`,
        severity: 'error',
      });
    }

    // Check explicit enable flag
    if (this.config.requireExplicitEnable && !mockDataEnabled) {
      this.checkResults.push({
        check: 'explicit_enable',
        reason: 'MOCK_DATA_ENABLED environment variable is not set to "true"',
        severity: 'error',
      });
    }

    const passed = this.checkResults.filter((r) => r.severity === 'error').length === 0;

    if (!passed) {
      logger.warn('[SafetyGuard] Environment check failed', {
        environment: nodeEnv,
        mockDataEnabled,
        failures: this.checkResults,
      });
    } else {
      logger.info('[SafetyGuard] Environment check passed', {
        environment: nodeEnv,
        mockDataEnabled,
      });
    }

    return passed;
  }

  /**
   * Validate that operations target the mock_data schema
   */
  validateSchemaIsolation(targetSchema: string): boolean {
    if (targetSchema !== this.config.targetSchema) {
      this.checkResults.push({
        check: 'schema_isolation',
        reason: `Target schema "${targetSchema}" does not match required mock data schema "${this.config.targetSchema}"`,
        severity: 'error',
      });
      return false;
    }
    return true;
  }

  /**
   * Validate record count limits
   */
  validateRecordLimit(entity: string, count: number): boolean {
    if (count > this.config.maxRecordsPerEntity) {
      this.checkResults.push({
        check: 'record_limit',
        reason: `Record count for "${entity}" (${count}) exceeds maximum allowed (${this.config.maxRecordsPerEntity})`,
        severity: 'warning',
      });
      return false;
    }
    return true;
  }

  /**
   * Block production writes with a final check
   */
  preventProductionWrites(): void {
    const nodeEnv = process.env.NODE_ENV ?? 'development';

    if (nodeEnv === 'production' && this.config.blockProductionWrites) {
      const errorMessage = 'CRITICAL: Attempted to write mock data in production environment. Operation blocked.';
      logger.error('[SafetyGuard] ' + errorMessage, {
        environment: nodeEnv,
        config: this.config,
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Run all safety checks and return comprehensive result
   */
  runAllChecks(): SafetyCheckResult {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    this.checkResults = [];

    // Run environment check
    this.checkEnvironment();

    // Validate schema isolation
    this.validateSchemaIsolation(this.config.targetSchema);

    const errors = this.checkResults.filter((r) => r.severity === 'error');
    const passed = errors.length === 0;

    const result: SafetyCheckResult = {
      passed,
      failures: this.checkResults,
      environment: nodeEnv,
      targetSchema: this.config.targetSchema,
    };

    // Log the result
    if (passed) {
      logger.info('[SafetyGuard] All safety checks passed', {
        environment: result.environment,
        targetSchema: result.targetSchema,
      });
    } else {
      logger.error('[SafetyGuard] Safety checks failed', { 
        failures: result.failures.map(f => f.reason).join('; '),
        environment: result.environment,
      });
    }

    return result;
  }

  /**
   * Create a Supabase client configured for the mock_data schema
   */
  createSafeSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      );
    }

    // Final production check before creating client
    this.preventProductionWrites();

    // Create client with schema option pointing to mock_data
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: this.config.targetSchema,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('[SafetyGuard] Created Supabase client for mock data schema', {
      schema: this.config.targetSchema,
    });

    return client;
  }

  /**
   * Get the current safety configuration
   */
  getConfig(): SafetyConfig {
    return { ...this.config };
  }

  /**
   * Get the last check results
   */
  getLastCheckResults(): SafetyFailure[] {
    return [...this.checkResults];
  }
}

/**
 * Helper function to quickly check if mock data generation is allowed
 */
export function isMockDataGenerationAllowed(): boolean {
  const guard = new SafetyGuard();
  return guard.checkEnvironment();
}

/**
 * Helper function to get a safe Supabase client for mock data operations
 */
export function getSafeMockDataClient() {
  const guard = new SafetyGuard();
  const checkResult = guard.runAllChecks();

  if (!checkResult.passed) {
    throw new Error(
      `Safety checks failed: ${checkResult.failures.map((f) => f.reason).join('; ')}`
    );
  }

  return guard.createSafeSupabaseClient();
}
