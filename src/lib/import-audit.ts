/**
 * @fileoverview Import Audit Logging for Orders Import Service
 * Provides comprehensive audit trail for all import operations.
 */

import { AutoFix, ErrorCode } from './import-schema';

// =============================================================================
// AUDIT ENTRY TYPES
// =============================================================================

export interface ImportAuditEntry {
    id: string;
    importBatchId: string;
    sourceFileName: string;
    rowIndex: number;
    originalRow: Record<string, string>;
    normalizedRow: Record<string, unknown>;
    autoFixes: AutoFix[];
    importHash: string;
    resultOrderId?: string;
    status: 'imported' | 'skipped' | 'error';
    errorCode?: ErrorCode;
    errorMessage?: string;
    timestamp: string;
    userId: string;
}

export interface ImportBatchSummary {
    batchId: string;
    fileName: string;
    startedAt: string;
    completedAt?: string;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    autoFixCount: number;
    userId: string;
    status: 'in_progress' | 'completed' | 'failed' | 'partial';
}

// =============================================================================
// IN-MEMORY AUDIT LOG (for current session)
// =============================================================================

let currentBatchId: string | null = null;
let auditEntries: ImportAuditEntry[] = [];
let batchSummary: ImportBatchSummary | null = null;

/**
 * Generates a unique batch ID for an import session.
 */
export function generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `import_${timestamp}_${random}`;
}

/**
 * Starts a new import batch for audit logging.
 */
export function startImportBatch(fileName: string, totalRows: number, userId: string): string {
    currentBatchId = generateBatchId();
    auditEntries = [];
    batchSummary = {
        batchId: currentBatchId,
        fileName,
        startedAt: new Date().toISOString(),
        totalRows,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        autoFixCount: 0,
        userId,
        status: 'in_progress',
    };
    return currentBatchId;
}

/**
 * Logs an audit entry for a single row import.
 */
export function logImportRow(entry: Omit<ImportAuditEntry, 'id' | 'timestamp'>): void {
    if (!currentBatchId) {
        console.warn('[ImportAudit] No active batch. Call startImportBatch first.');
        return;
    }

    const fullEntry: ImportAuditEntry = {
        ...entry,
        id: `${currentBatchId}_row_${entry.rowIndex}`,
        timestamp: new Date().toISOString(),
    };

    auditEntries.push(fullEntry);

    // Update batch summary
    if (batchSummary) {
        if (entry.status === 'imported') batchSummary.importedCount++;
        else if (entry.status === 'skipped') batchSummary.skippedCount++;
        else if (entry.status === 'error') batchSummary.errorCount++;

        batchSummary.autoFixCount += entry.autoFixes.length;
    }
}

/**
 * Completes the current import batch.
 */
export function completeImportBatch(success: boolean): ImportBatchSummary | null {
    if (!batchSummary) return null;

    batchSummary.completedAt = new Date().toISOString();
    batchSummary.status = success
        ? 'completed'
        : batchSummary.errorCount === batchSummary.totalRows
            ? 'failed'
            : 'partial';

    const summary = { ...batchSummary };

    // Log to console for debugging
    console.log('[ImportAudit] Batch completed:', summary);

    return summary;
}

/**
 * Gets all audit entries for the current batch.
 */
export function getCurrentBatchEntries(): ImportAuditEntry[] {
    return [...auditEntries];
}

/**
 * Gets the current batch summary.
 */
export function getCurrentBatchSummary(): ImportBatchSummary | null {
    return batchSummary ? { ...batchSummary } : null;
}

/**
 * Clears the current batch (call after processing is complete).
 */
export function clearCurrentBatch(): void {
    currentBatchId = null;
    auditEntries = [];
    batchSummary = null;
}

// =============================================================================
// AUDIT LOG EXPORT
// =============================================================================

/**
 * Exports audit log entries to a downloadable format.
 */
export function exportAuditLog(): string {
    const exportData = {
        summary: batchSummary,
        entries: auditEntries.map(e => ({
            rowIndex: e.rowIndex,
            status: e.status,
            autoFixes: e.autoFixes,
            errorCode: e.errorCode,
            errorMessage: e.errorMessage,
            importHash: e.importHash,
            resultOrderId: e.resultOrderId,
        })),
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Formats an audit entry for display in the UI.
 */
export function formatAuditEntryForDisplay(entry: ImportAuditEntry): string {
    const lines: string[] = [];

    lines.push(`Row ${entry.rowIndex + 1}: ${entry.status.toUpperCase()}`);

    if (entry.autoFixes.length > 0) {
        lines.push(`  Auto-fixes applied (${entry.autoFixes.length}):`);
        for (const fix of entry.autoFixes) {
            lines.push(`    - ${fix.field}: "${fix.before}" → "${fix.after}" [${fix.ruleId}]`);
        }
    }

    if (entry.errorCode) {
        lines.push(`  Error: ${entry.errorCode} - ${entry.errorMessage}`);
    }

    if (entry.resultOrderId) {
        lines.push(`  Order ID: ${entry.resultOrderId}`);
    }

    return lines.join('\n');
}
