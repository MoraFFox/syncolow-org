/**
 * Progress Tracker
 *
 * Real-time progress tracking for generation operations with metrics,
 * ETA calculation, and event emission for UI/CLI consumption.
 */

import type { GenerationProgress, EntityRecordCounts } from './types';

/**
 * Progress event types
 */
export type ProgressEventType =
  | 'started'
  | 'entity_started'
  | 'batch_completed'
  | 'entity_completed'
  | 'completed'
  | 'error'
  | 'rolled_back';

/**
 * Progress event
 */
export interface ProgressEvent {
  type: ProgressEventType;
  timestamp: string;
  entity?: keyof EntityRecordCounts;
  batchNumber?: number;
  totalBatches?: number;
  recordsGenerated?: number;
  error?: string;
}

/**
 * Progress listener callback
 */
export type ProgressListener = (progress: GenerationProgress, event: ProgressEvent) => void;

/**
 * Initial record counts (all zeros)
 */
const INITIAL_COUNTS: EntityRecordCounts = {
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

/**
 * Entity generation order for progress calculation
 */
const ENTITY_ORDER: (keyof EntityRecordCounts)[] = [
  'users',
  'companies',
  'branches',
  'addresses',
  'products',
  'orders',
  'orderItems',
  'inventory',
  'shipments',
  'payments',
  'discounts',
  'returns',
  'refunds',
  'maintenanceVisits',
  'auditLogs',
];

export class ProgressTracker {
  private jobId: string;
  private progress: GenerationProgress;
  private startTime: number;
  private entityStartTime: number = 0;
  private listeners: Set<ProgressListener> = new Set();
  private targetCounts: EntityRecordCounts;

  constructor(jobId: string, targetCounts: Partial<EntityRecordCounts> = {}) {
    this.jobId = jobId;
    this.startTime = Date.now();
    this.targetCounts = { ...INITIAL_COUNTS, ...targetCounts };

    this.progress = {
      jobId,
      status: 'initializing',
      currentEntity: null,
      currentBatch: 0,
      totalBatches: 0,
      recordsGenerated: { ...INITIAL_COUNTS },
      progressPercent: 0,
      estimatedTimeRemaining: null,
      throughput: 0,
      errorCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add a progress listener
   */
  addListener(listener: ProgressListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a progress listener
   */
  removeListener(listener: ProgressListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit progress update to all listeners
   */
  private emit(event: ProgressEvent): void {
    this.progress.updatedAt = new Date().toISOString();

    for (const listener of this.listeners) {
      try {
        listener(this.getProgress(), event);
      } catch (error) {
        console.error('[ProgressTracker] Listener error:', error);
      }
    }
  }

  /**
   * Mark generation as started
   */
  start(): void {
    this.startTime = Date.now();
    this.progress.status = 'generating';

    this.emit({
      type: 'started',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark an entity as started
   */
  startEntity(entity: keyof EntityRecordCounts, totalBatches: number): void {
    this.entityStartTime = Date.now();
    this.progress.currentEntity = entity;
    this.progress.currentBatch = 0;
    this.progress.totalBatches = totalBatches;

    this.emit({
      type: 'entity_started',
      timestamp: new Date().toISOString(),
      entity,
      totalBatches,
    });
  }

  /**
   * Record batch completion
   */
  completeBatch(entity: keyof EntityRecordCounts, recordsInBatch: number): void {
    this.progress.currentBatch++;
    this.progress.recordsGenerated[entity] += recordsInBatch;

    // Update throughput
    const elapsedMs = Date.now() - this.startTime;
    const totalRecords = this.getTotalRecordsGenerated();
    this.progress.throughput = totalRecords / (elapsedMs / 1000);

    // Update progress percentage
    this.progress.progressPercent = this.calculateProgressPercent();

    // Estimate remaining time
    this.progress.estimatedTimeRemaining = this.estimateTimeRemaining();

    this.emit({
      type: 'batch_completed',
      timestamp: new Date().toISOString(),
      entity,
      batchNumber: this.progress.currentBatch,
      totalBatches: this.progress.totalBatches,
      recordsGenerated: this.progress.recordsGenerated[entity],
    });
  }

  /**
   * Mark an entity as completed
   */
  completeEntity(entity: keyof EntityRecordCounts): void {
    const entityDuration = Date.now() - this.entityStartTime;

    this.emit({
      type: 'entity_completed',
      timestamp: new Date().toISOString(),
      entity,
      recordsGenerated: this.progress.recordsGenerated[entity],
    });
  }

  /**
   * Mark generation as completed
   */
  complete(): void {
    this.progress.status = 'completed';
    this.progress.currentEntity = null;
    this.progress.progressPercent = 100;
    this.progress.estimatedTimeRemaining = 0;

    this.emit({
      type: 'completed',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record an error
   */
  recordError(entity: keyof EntityRecordCounts, error: Error | string): void {
    this.progress.errorCount++;

    this.emit({
      type: 'error',
      timestamp: new Date().toISOString(),
      entity,
      error: error instanceof Error ? error.message : error,
    });
  }

  /**
   * Mark as failed
   */
  fail(error: Error | string): void {
    this.progress.status = 'failed';

    this.emit({
      type: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
    });
  }

  /**
   * Mark as rolling back
   */
  startRollback(): void {
    this.progress.status = 'rolling_back';
  }

  /**
   * Mark rollback as complete
   */
  completeRollback(): void {
    this.emit({
      type: 'rolled_back',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current progress snapshot
   */
  getProgress(): GenerationProgress {
    return { ...this.progress };
  }

  /**
   * Get total records generated
   */
  private getTotalRecordsGenerated(): number {
    return Object.values(this.progress.recordsGenerated).reduce((a, b) => a + b, 0);
  }

  /**
   * Get total target records
   */
  private getTotalTargetRecords(): number {
    return Object.values(this.targetCounts).reduce((a, b) => a + b, 0);
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgressPercent(): number {
    const total = this.getTotalTargetRecords();
    if (total === 0) return 0;

    const generated = this.getTotalRecordsGenerated();
    return Math.min(100, Math.round((generated / total) * 100));
  }

  /**
   * Estimate time remaining in seconds
   */
  private estimateTimeRemaining(): number | null {
    const generated = this.getTotalRecordsGenerated();
    if (generated === 0) return null;

    const elapsedMs = Date.now() - this.startTime;
    const recordsPerMs = generated / elapsedMs;

    if (recordsPerMs === 0) return null;

    const remaining = this.getTotalTargetRecords() - generated;
    const remainingMs = remaining / recordsPerMs;

    return Math.round(remainingMs / 1000);
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalRecords: number;
    elapsedSeconds: number;
    throughput: number;
    errorCount: number;
  } {
    return {
      totalRecords: this.getTotalRecordsGenerated(),
      elapsedSeconds: this.getElapsedSeconds(),
      throughput: this.progress.throughput,
      errorCount: this.progress.errorCount,
    };
  }

  /**
   * Update target counts
   */
  updateTargetCounts(counts: Partial<EntityRecordCounts>): void {
    this.targetCounts = { ...this.targetCounts, ...counts };
  }
}

/**
 * Create a console-logging progress listener
 */
export function createConsoleProgressListener(): ProgressListener {
  return (progress, event) => {
    const timestamp = new Date().toISOString().substring(11, 19);

    switch (event.type) {
      case 'started':
        console.log(`[${timestamp}] 🚀 Generation started`);
        break;
      case 'entity_started':
        console.log(`[${timestamp}] 📦 Starting ${event.entity} (${event.totalBatches} batches)`);
        break;
      case 'batch_completed':
        console.log(
          `[${timestamp}]   Batch ${event.batchNumber}/${event.totalBatches} - ${event.recordsGenerated} records`
        );
        break;
      case 'entity_completed':
        console.log(`[${timestamp}] ✅ ${event.entity}: ${event.recordsGenerated} records`);
        break;
      case 'completed':
        console.log(`[${timestamp}] 🎉 Generation completed - ${progress.progressPercent}%`);
        break;
      case 'error':
        console.error(`[${timestamp}] ❌ Error in ${event.entity}: ${event.error}`);
        break;
      case 'rolled_back':
        console.log(`[${timestamp}] ⏪ Rollback completed`);
        break;
    }
  };
}
