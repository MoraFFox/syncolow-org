/**
 * Audit Logger
 *
 * Compliance-ready audit trail system for tracking user actions,
 * data access, authentication events, and configuration changes.
 */

import type { AuditLogEntry, AuditAction, LogContext } from '@/types/log-entry';
import { getCorrelationId, getTraceContext, getContextUserId } from './correlation-context';
import { getLoggerConfig } from './logger-config';

/**
 * Audit log storage interface
 */
export interface AuditLogStorage {
    /** Store an audit log entry */
    store(entry: AuditLogEntry): Promise<void>;

    /** Query audit logs */
    query(filter: AuditLogFilter): Promise<AuditLogEntry[]>;

    /** Get entry count */
    count(filter?: AuditLogFilter): Promise<number>;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
    /** Filter by user ID */
    userId?: string;

    /** Filter by action type */
    action?: AuditAction;

    /** Filter by resource type */
    resource?: string;

    /** Filter by time range start */
    startTime?: Date;

    /** Filter by time range end */
    endTime?: Date;

    /** Filter by result */
    result?: 'success' | 'failure' | 'denied';

    /** Pagination offset */
    offset?: number;

    /** Pagination limit */
    limit?: number;
}

/**
 * In-memory audit log storage (for development/testing)
 */
class InMemoryAuditStorage implements AuditLogStorage {
    private logs: AuditLogEntry[] = [];
    private maxLogs = 10000;

    async store(entry: AuditLogEntry): Promise<void> {
        if (this.logs.length >= this.maxLogs) {
            this.logs.shift();
        }
        this.logs.push(entry);
    }

    async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
        let result = [...this.logs];

        if (filter.userId) {
            result = result.filter((e) => e.context?.userId === filter.userId);
        }
        if (filter.action) {
            result = result.filter((e) => e.auditAction === filter.action);
        }
        if (filter.resource) {
            result = result.filter((e) => e.resource === filter.resource);
        }
        if (filter.result) {
            result = result.filter((e) => e.result === filter.result);
        }
        if (filter.startTime) {
            result = result.filter((e) => new Date(e.timestamp) >= filter.startTime!);
        }
        if (filter.endTime) {
            result = result.filter((e) => new Date(e.timestamp) <= filter.endTime!);
        }

        // Sort by timestamp descending
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply pagination
        const offset = filter.offset || 0;
        const limit = filter.limit || 100;
        return result.slice(offset, offset + limit);
    }

    async count(filter?: AuditLogFilter): Promise<number> {
        if (!filter) return this.logs.length;
        return (await this.query({ ...filter, limit: Infinity })).length;
    }
}

/**
 * Audit logger implementation
 */
export class AuditLogger {
    private storage: AuditLogStorage;
    private serviceName: string;
    private environment: string;
    private version: string;

    constructor(storage?: AuditLogStorage) {
        const config = getLoggerConfig();
        this.storage = storage || new InMemoryAuditStorage();
        this.serviceName = config.serviceName;
        this.environment = config.environment;
        this.version = config.version;
    }

    /**
     * Log a user action
     */
    async logUserAction(
        action: string,
        resource: string,
        details: Record<string, unknown> = {},
        result: 'success' | 'failure' | 'denied' = 'success'
    ): Promise<void> {
        const entry = this.createEntry('update', resource, result);
        entry.message = `User action: ${action} on ${resource}`;
        entry.context = {
            ...entry.context,
            action,
            data: details,
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log data access
     */
    async logDataAccess(
        userId: string,
        resource: string,
        operation: 'read' | 'write' | 'delete',
        resourceId?: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        const auditAction: AuditAction = operation === 'write' ? 'update' :
            operation === 'delete' ? 'delete' : 'read';

        const entry = this.createEntry(auditAction, resource, 'success');
        entry.message = `Data access: ${operation} on ${resource}`;
        entry.resourceId = resourceId;
        entry.context = {
            ...entry.context,
            userId,
            data: details,
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log authentication event
     */
    async logAuthEvent(
        event: 'login' | 'logout' | 'failed_login',
        userId: string,
        details?: {
            ip?: string;
            userAgent?: string;
            reason?: string;
            method?: string;
        }
    ): Promise<void> {
        const result = event === 'failed_login' ? 'failure' : 'success';
        const entry = this.createEntry(event, 'authentication', result);
        entry.message = `Authentication: ${event}`;
        entry.reason = details?.reason;
        entry.context = {
            ...entry.context,
            userId,
            ipAddress: details?.ip,
            userAgent: details?.userAgent,
            data: { method: details?.method },
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log configuration change
     */
    async logConfigChange(
        setting: string,
        oldValue: unknown,
        newValue: unknown,
        changedBy: string
    ): Promise<void> {
        const entry = this.createEntry('config_change', 'configuration', 'success');
        entry.message = `Configuration change: ${setting}`;
        entry.oldValue = this.sanitizeValue(oldValue);
        entry.newValue = this.sanitizeValue(newValue);
        entry.context = {
            ...entry.context,
            userId: changedBy,
            data: { setting },
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log permission change
     */
    async logPermissionChange(
        userId: string,
        targetUserId: string,
        permission: string,
        granted: boolean
    ): Promise<void> {
        const entry = this.createEntry('permission_change', 'permissions', 'success');
        entry.message = `Permission ${granted ? 'granted' : 'revoked'}: ${permission}`;
        entry.resourceId = targetUserId;
        entry.context = {
            ...entry.context,
            userId,
            data: { permission, granted, targetUserId },
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log data export
     */
    async logDataExport(
        userId: string,
        dataType: string,
        recordCount: number,
        format: string
    ): Promise<void> {
        const entry = this.createEntry('export', dataType, 'success');
        entry.message = `Data export: ${recordCount} ${dataType} records`;
        entry.context = {
            ...entry.context,
            userId,
            data: { recordCount, format },
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Log data import
     */
    async logDataImport(
        userId: string,
        dataType: string,
        recordCount: number,
        source: string,
        result: 'success' | 'failure'
    ): Promise<void> {
        const entry = this.createEntry('import', dataType, result);
        entry.message = `Data import: ${recordCount} ${dataType} records from ${source}`;
        entry.context = {
            ...entry.context,
            userId,
            data: { recordCount, source },
        };

        await this.storage.store(entry);
        this.logToConsole(entry);
    }

    /**
     * Query audit logs
     */
    async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
        return this.storage.query(filter);
    }

    /**
     * Get audit log count
     */
    async count(filter?: AuditLogFilter): Promise<number> {
        return this.storage.count(filter);
    }

    /**
     * Create a base audit log entry
     */
    private createEntry(
        auditAction: AuditAction,
        resource: string,
        result: 'success' | 'failure' | 'denied'
    ): AuditLogEntry {
        const traceContext = getTraceContext();
        const userId = getContextUserId();

        return {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '',
            service: this.serviceName,
            environment: this.environment,
            version: this.version,
            correlationId: getCorrelationId(),
            traceId: traceContext?.traceId,
            spanId: traceContext?.spanId,
            auditAction,
            resource,
            result,
            context: {
                userId,
            },
        };
    }

    /**
     * Sanitize value for logging (remove sensitive data)
     */
    private sanitizeValue(value: unknown): unknown {
        if (value === null || value === undefined) return value;

        if (typeof value === 'object') {
            const sanitized: Record<string, unknown> = {};
            const obj = value as Record<string, unknown>;

            for (const [key, val] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                if (
                    lowerKey.includes('password') ||
                    lowerKey.includes('secret') ||
                    lowerKey.includes('token') ||
                    lowerKey.includes('apikey')
                ) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = val;
                }
            }

            return sanitized;
        }

        return value;
    }

    /**
     * Log to console in development mode
     */
    private logToConsole(entry: AuditLogEntry): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(
                `📋 AUDIT [${entry.auditAction}] ${entry.resource}: ${entry.result}`,
                { userId: entry.context?.userId, message: entry.message }
            );
        }
    }
}

/**
 * Singleton instance
 */
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get the global audit logger
 */
export function getAuditLogger(): AuditLogger {
    if (!auditLoggerInstance) {
        auditLoggerInstance = new AuditLogger();
    }
    return auditLoggerInstance;
}

/**
 * Convenience functions
 */
export const audit = {
    logUserAction: (action: string, resource: string, details?: Record<string, unknown>) =>
        getAuditLogger().logUserAction(action, resource, details),

    logDataAccess: (
        userId: string,
        resource: string,
        operation: 'read' | 'write' | 'delete',
        resourceId?: string
    ) => getAuditLogger().logDataAccess(userId, resource, operation, resourceId),

    logAuthEvent: (
        event: 'login' | 'logout' | 'failed_login',
        userId: string,
        details?: { ip?: string; userAgent?: string; reason?: string }
    ) => getAuditLogger().logAuthEvent(event, userId, details),

    logConfigChange: (
        setting: string,
        oldValue: unknown,
        newValue: unknown,
        changedBy: string
    ) => getAuditLogger().logConfigChange(setting, oldValue, newValue, changedBy),

    query: (filter: AuditLogFilter) => getAuditLogger().query(filter),
};
