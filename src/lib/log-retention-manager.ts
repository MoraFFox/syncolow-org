/**
 * Log Retention Manager
 *
 * GDPR-compliant log retention with automatic deletion,
 * anonymization, and data export capabilities.
 */

import type { LogEntry, AuditLogEntry } from '@/types/log-entry';

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
    /** Policy name */
    name: string;

    /** Log types this policy applies to */
    logTypes: ('operational' | 'audit' | 'security' | 'analytics')[];

    /** Retention period in days */
    retentionDays: number;

    /** Action after retention period */
    action: 'delete' | 'anonymize' | 'archive';

    /** Whether policy is enabled */
    enabled: boolean;
}

/**
 * User data for GDPR operations
 */
export interface UserDataRequest {
    /** User ID */
    userId: string;

    /** Request type */
    type: 'export' | 'delete' | 'anonymize';

    /** Request timestamp */
    requestedAt: string;

    /** Completion timestamp */
    completedAt?: string;

    /** Status */
    status: 'pending' | 'processing' | 'completed' | 'failed';

    /** Error message if failed */
    error?: string;
}

/**
 * Default retention policies
 */
const DEFAULT_POLICIES: RetentionPolicy[] = [
    {
        name: 'operational-logs',
        logTypes: ['operational'],
        retentionDays: 90,
        action: 'delete',
        enabled: true,
    },
    {
        name: 'audit-logs',
        logTypes: ['audit'],
        retentionDays: 2555, // ~7 years
        action: 'archive',
        enabled: true,
    },
    {
        name: 'security-logs',
        logTypes: ['security'],
        retentionDays: 365,
        action: 'archive',
        enabled: true,
    },
    {
        name: 'analytics-logs',
        logTypes: ['analytics'],
        retentionDays: 30,
        action: 'anonymize',
        enabled: true,
    },
];

/**
 * Log retention manager implementation
 */
export class LogRetentionManager {
    private policies: RetentionPolicy[];
    private dataRequests: UserDataRequest[] = [];
    private onPolicyExecuted?: (policy: RetentionPolicy, count: number) => void;

    constructor(options?: {
        policies?: RetentionPolicy[];
        onPolicyExecuted?: (policy: RetentionPolicy, count: number) => void;
    }) {
        this.policies = options?.policies || [...DEFAULT_POLICIES];
        this.onPolicyExecuted = options?.onPolicyExecuted;
    }

    /**
     * Add or update a retention policy
     */
    setPolicy(policy: RetentionPolicy): void {
        const index = this.policies.findIndex((p) => p.name === policy.name);
        if (index >= 0) {
            this.policies[index] = policy;
        } else {
            this.policies.push(policy);
        }
    }

    /**
     * Get all policies
     */
    getPolicies(): RetentionPolicy[] {
        return [...this.policies];
    }

    /**
     * Get policy by name
     */
    getPolicy(name: string): RetentionPolicy | undefined {
        return this.policies.find((p) => p.name === name);
    }

    /**
     * Calculate expiry date for a log type
     */
    getExpiryDate(logType: RetentionPolicy['logTypes'][0]): Date {
        const policy = this.policies.find(
            (p) => p.enabled && p.logTypes.includes(logType)
        );

        const retentionDays = policy?.retentionDays || 90;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - retentionDays);
        return expiryDate;
    }

    /**
     * Check if a log entry should be retained
     */
    shouldRetain(entry: LogEntry, logType: RetentionPolicy['logTypes'][0]): boolean {
        const expiryDate = this.getExpiryDate(logType);
        return new Date(entry.timestamp) > expiryDate;
    }

    /**
     * Apply retention policies to logs
     * Returns counts of processed logs by action
     */
    async applyPolicies(
        logs: LogEntry[],
        logType: RetentionPolicy['logTypes'][0],
        handlers: {
            delete: (entries: LogEntry[]) => Promise<void>;
            anonymize: (entries: LogEntry[]) => Promise<LogEntry[]>;
            archive: (entries: LogEntry[]) => Promise<void>;
        }
    ): Promise<{ deleted: number; anonymized: number; archived: number }> {
        const policy = this.policies.find(
            (p) => p.enabled && p.logTypes.includes(logType)
        );

        if (!policy) {
            return { deleted: 0, anonymized: 0, archived: 0 };
        }

        const expiryDate = this.getExpiryDate(logType);
        const expiredLogs = logs.filter((e) => new Date(e.timestamp) <= expiryDate);

        if (expiredLogs.length === 0) {
            return { deleted: 0, anonymized: 0, archived: 0 };
        }

        const result = { deleted: 0, anonymized: 0, archived: 0 };

        switch (policy.action) {
            case 'delete':
                await handlers.delete(expiredLogs);
                result.deleted = expiredLogs.length;
                break;
            case 'anonymize':
                await handlers.anonymize(expiredLogs);
                result.anonymized = expiredLogs.length;
                break;
            case 'archive':
                await handlers.archive(expiredLogs);
                result.archived = expiredLogs.length;
                break;
        }

        if (this.onPolicyExecuted) {
            this.onPolicyExecuted(policy, expiredLogs.length);
        }

        return result;
    }

    // === GDPR Operations ===

    /**
     * Request user data export (GDPR data portability)
     */
    async requestDataExport(userId: string): Promise<UserDataRequest> {
        const request: UserDataRequest = {
            userId,
            type: 'export',
            requestedAt: new Date().toISOString(),
            status: 'pending',
        };

        this.dataRequests.push(request);
        return request;
    }

    /**
     * Request user data deletion (GDPR right to be forgotten)
     */
    async requestDataDeletion(userId: string): Promise<UserDataRequest> {
        const request: UserDataRequest = {
            userId,
            type: 'delete',
            requestedAt: new Date().toISOString(),
            status: 'pending',
        };

        this.dataRequests.push(request);
        return request;
    }

    /**
     * Export user data to JSON
     */
    async exportUserData(
        userId: string,
        logs: LogEntry[]
    ): Promise<{ data: LogEntry[]; exportedAt: string; format: string }> {
        const userLogs = logs.filter((e) => e.context?.userId === userId);

        return {
            data: userLogs,
            exportedAt: new Date().toISOString(),
            format: 'json',
        };
    }

    /**
     * Delete all user data from logs
     */
    async deleteUserData(
        userId: string,
        logs: LogEntry[],
        deleteHandler: (entries: LogEntry[]) => Promise<void>
    ): Promise<number> {
        const userLogs = logs.filter((e) => e.context?.userId === userId);

        if (userLogs.length > 0) {
            await deleteHandler(userLogs);
        }

        return userLogs.length;
    }

    /**
     * Anonymize user data in logs
     */
    async anonymizeUserData(
        userId: string,
        logs: LogEntry[]
    ): Promise<LogEntry[]> {
        return logs.map((entry) => {
            if (entry.context?.userId !== userId) {
                return entry;
            }

            return {
                ...entry,
                context: {
                    ...entry.context,
                    userId: 'ANONYMIZED',
                    sessionId: entry.context.sessionId ? 'ANONYMIZED' : undefined,
                    ipAddress: entry.context.ipAddress ? 'XXX.XXX.XXX.XXX' : undefined,
                    userAgent: entry.context.userAgent ? 'ANONYMIZED' : undefined,
                    data: entry.context.data ? this.anonymizeData(entry.context.data) : undefined,
                },
            };
        });
    }

    /**
     * Anonymize arbitrary data object
     */
    private anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
        const sensitiveKeys = ['email', 'phone', 'name', 'address', 'ssn', 'dob', 'birthdate'];
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();

            if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
                result[key] = '[ANONYMIZED]';
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.anonymizeData(value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Get pending data requests
     */
    getPendingRequests(): UserDataRequest[] {
        return this.dataRequests.filter((r) => r.status === 'pending');
    }

    /**
     * Get all data requests for a user
     */
    getUserRequests(userId: string): UserDataRequest[] {
        return this.dataRequests.filter((r) => r.userId === userId);
    }

    /**
     * Complete a data request
     */
    completeRequest(userId: string, type: UserDataRequest['type']): void {
        const request = this.dataRequests.find(
            (r) => r.userId === userId && r.type === type && r.status === 'pending'
        );

        if (request) {
            request.status = 'completed';
            request.completedAt = new Date().toISOString();
        }
    }

    /**
     * Generate retention report
     */
    generateReport(): {
        policies: RetentionPolicy[];
        pendingRequests: number;
        completedRequests: number;
        retentionSummary: { logType: string; retentionDays: number; action: string }[];
    } {
        return {
            policies: this.policies,
            pendingRequests: this.dataRequests.filter((r) => r.status === 'pending').length,
            completedRequests: this.dataRequests.filter((r) => r.status === 'completed').length,
            retentionSummary: this.policies.map((p) => ({
                logType: p.logTypes.join(', '),
                retentionDays: p.retentionDays,
                action: p.action,
            })),
        };
    }
}

/**
 * Singleton instance
 */
let retentionManagerInstance: LogRetentionManager | null = null;

/**
 * Get the global retention manager
 */
export function getLogRetentionManager(): LogRetentionManager {
    if (!retentionManagerInstance) {
        retentionManagerInstance = new LogRetentionManager();
    }
    return retentionManagerInstance;
}
