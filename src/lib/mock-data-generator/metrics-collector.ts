/**
 * Metrics Collector
 *
 * Collects and exports generation metrics for observability,
 * supporting JSON and Prometheus formats.
 */

import type { GenerationMetrics, EntityRecordCounts } from './types';

export class MetricsCollector {
  private runId: string;
  private scenario: string;
  private startTime: number;
  private endTime: number = 0;
  private entityRecords: EntityRecordCounts = {
    users: 0,
    companies: 0,
    branches: 0,
    addresses: 0,
    products: 0,
    orders: 0,
    orderItems: 0,
    inventory: 0,
    shipments: 0,
    payments: 0,
    discounts: 0,
    returns: 0,
    refunds: 0,
    maintenanceVisits: 0,
    auditLogs: 0,
  };
  private entityTimings: Map<string, number> = new Map();
  private errors: Map<string, number> = new Map();
  private peakMemoryMb: number = 0;

  constructor(runId: string, scenario: string) {
    this.runId = runId;
    this.scenario = scenario;
    this.startTime = Date.now();
  }

  /**
   * Record generation for an entity type
   */
  recordGeneration(entity: keyof EntityRecordCounts, count: number, durationMs: number): void {
    this.entityRecords[entity] += count;
    const currentTiming = this.entityTimings.get(entity) ?? 0;
    this.entityTimings.set(entity, currentTiming + durationMs);

    // Track peak memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      const heapUsedMb = memoryUsage.heapUsed / (1024 * 1024);
      this.peakMemoryMb = Math.max(this.peakMemoryMb, heapUsedMb);
    }
  }

  /**
   * Record an error
   */
  recordError(entity: string, error: Error): void {
    const errorKey = `${entity}:${error.name}`;
    const currentCount = this.errors.get(errorKey) ?? 0;
    this.errors.set(errorKey, currentCount + 1);
  }

  /**
   * Mark completion
   */
  complete(): void {
    this.endTime = Date.now();
  }

  /**
   * Get collected metrics
   */
  getMetrics(): GenerationMetrics {
    const endTime = this.endTime || Date.now();
    const durationMs = endTime - this.startTime;
    const totalRecords = Object.values(this.entityRecords).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errors.values()).reduce((a, b) => a + b, 0);

    return {
      runId: this.runId,
      scenario: this.scenario,
      totalRecords,
      recordsPerSecond: durationMs > 0 ? (totalRecords / durationMs) * 1000 : 0,
      errorRate: totalRecords > 0 ? totalErrors / totalRecords : 0,
      entityTimings: Object.fromEntries(this.entityTimings),
      peakMemoryMb: Math.round(this.peakMemoryMb * 100) / 100,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: this.endTime ? new Date(this.endTime).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Export metrics in JSON format
   */
  exportMetrics(format: 'json' | 'prometheus'): string {
    const metrics = this.getMetrics();

    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }

    // Prometheus format
    const lines: string[] = [];

    lines.push(`# HELP mock_data_total_records Total records generated`);
    lines.push(`# TYPE mock_data_total_records gauge`);
    lines.push(`mock_data_total_records{run_id="${this.runId}",scenario="${this.scenario}"} ${metrics.totalRecords}`);

    lines.push(`# HELP mock_data_records_per_second Generation throughput`);
    lines.push(`# TYPE mock_data_records_per_second gauge`);
    lines.push(`mock_data_records_per_second{run_id="${this.runId}"} ${metrics.recordsPerSecond.toFixed(2)}`);

    lines.push(`# HELP mock_data_error_rate Error rate`);
    lines.push(`# TYPE mock_data_error_rate gauge`);
    lines.push(`mock_data_error_rate{run_id="${this.runId}"} ${metrics.errorRate.toFixed(6)}`);

    lines.push(`# HELP mock_data_peak_memory_mb Peak memory usage in MB`);
    lines.push(`# TYPE mock_data_peak_memory_mb gauge`);
    lines.push(`mock_data_peak_memory_mb{run_id="${this.runId}"} ${metrics.peakMemoryMb}`);

    lines.push(`# HELP mock_data_entity_records Records per entity type`);
    lines.push(`# TYPE mock_data_entity_records gauge`);
    for (const [entity, count] of Object.entries(this.entityRecords)) {
      lines.push(`mock_data_entity_records{run_id="${this.runId}",entity="${entity}"} ${count}`);
    }

    lines.push(`# HELP mock_data_entity_duration_ms Duration per entity in ms`);
    lines.push(`# TYPE mock_data_entity_duration_ms gauge`);
    for (const [entity, duration] of this.entityTimings) {
      lines.push(`mock_data_entity_duration_ms{run_id="${this.runId}",entity="${entity}"} ${duration}`);
    }

    return lines.join('\n');
  }

  /**
   * Get record counts
   */
  getRecordCounts(): EntityRecordCounts {
    return { ...this.entityRecords };
  }

  /**
   * Get error summary
   */
  getErrorSummary(): Record<string, number> {
    return Object.fromEntries(this.errors);
  }

  /**
   * Reset collector for new run
   */
  reset(newRunId: string, scenario: string): void {
    this.runId = newRunId;
    this.scenario = scenario;
    this.startTime = Date.now();
    this.endTime = 0;
    this.entityRecords = {
      users: 0,
      companies: 0,
      branches: 0,
      addresses: 0,
      products: 0,
      orders: 0,
      orderItems: 0,
      inventory: 0,
      shipments: 0,
      payments: 0,
      discounts: 0,
      returns: 0,
      refunds: 0,
      maintenanceVisits: 0,
      auditLogs: 0,
    };
    this.entityTimings.clear();
    this.errors.clear();
    this.peakMemoryMb = 0;
  }
}
