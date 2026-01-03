/**
 * Security Logger
 *
 * Specialized logging for security events including suspicious activity,
 * access violations, rate limiting, and threat detection.
 */

import type { SecurityLogEntry, SecurityEventType, LogContext } from '@/types/log-entry';
import { getCorrelationId, getTraceContext, getContextUserId } from './correlation-context';
import { getLoggerConfig } from './logger-config';

/**
 * Security event with full context
 */
export interface SecurityEvent {
    /** Event type */
    type: SecurityEventType;

    /** Threat level */
    threatLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';

    /** Whether the threat was blocked */
    blocked: boolean;

    /** Source IP address */
    sourceIp?: string;

    /** User ID if authenticated */
    userId?: string;

    /** Affected resource */
    resource?: string;

    /** Detection rule or mechanism */
    detectionRule?: string;

    /** Additional details */
    details?: Record<string, unknown>;

    /** Request context */
    request?: {
        method?: string;
        path?: string;
        userAgent?: string;
        headers?: Record<string, string>;
        body?: unknown;
    };
}

/**
 * IP reputation data
 */
interface IpReputation {
    ip: string;
    score: number; // 0-100, lower is worse
    failedAttempts: number;
    lastFailedAttempt?: number;
    lastSuccessfulRequest?: number;
    blockedUntil?: number;
    reasons: string[];
}

/**
 * Security logger implementation
 */
export class SecurityLogger {
    private serviceName: string;
    private environment: string;
    private version: string;
    private eventLog: SecurityLogEntry[] = [];
    private maxEventLog = 10000;
    private ipReputations = new Map<string, IpReputation>();
    private onEvent?: (event: SecurityLogEntry) => void;

    constructor(options?: {
        onEvent?: (event: SecurityLogEntry) => void;
    }) {
        const config = getLoggerConfig();
        this.serviceName = config.serviceName;
        this.environment = config.environment;
        this.version = config.version;
        this.onEvent = options?.onEvent;
    }

    /**
     * Log a security event
     */
    async logSecurityEvent(event: SecurityEvent): Promise<SecurityLogEntry> {
        const traceContext = getTraceContext();

        const entry: SecurityLogEntry = {
            timestamp: new Date().toISOString(),
            level: this.threatLevelToLogLevel(event.threatLevel),
            message: this.generateMessage(event),
            service: this.serviceName,
            environment: this.environment,
            version: this.version,
            correlationId: getCorrelationId(),
            traceId: traceContext?.traceId,
            spanId: traceContext?.spanId,
            securityEvent: event.type,
            threatLevel: event.threatLevel,
            blocked: event.blocked,
            detectionRule: event.detectionRule,
            context: {
                userId: event.userId || getContextUserId(),
                ipAddress: event.sourceIp,
                route: event.request?.path,
                method: event.request?.method as LogContext['method'],
                userAgent: event.request?.userAgent,
                data: event.details,
            },
        };

        // Store event
        if (this.eventLog.length >= this.maxEventLog) {
            this.eventLog.shift();
        }
        this.eventLog.push(entry);

        // Update IP reputation
        if (event.sourceIp) {
            this.updateIpReputation(event);
        }

        // Notify listener
        if (this.onEvent) {
            this.onEvent(entry);
        }

        // Log to console
        this.logToConsole(entry);

        return entry;
    }

    /**
     * Log suspicious activity
     */
    async logSuspiciousActivity(
        type: string,
        details: Record<string, unknown>,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'suspicious_activity',
            threatLevel: 'medium',
            blocked: false,
            sourceIp,
            userId: getContextUserId(),
            details: { activityType: type, ...details },
        });
    }

    /**
     * Log access violation
     */
    async logAccessViolation(
        userId: string,
        resource: string,
        reason: string,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'access_violation',
            threatLevel: 'high',
            blocked: true,
            sourceIp,
            userId,
            resource,
            details: { reason },
        });
    }

    /**
     * Log rate limit exceeded
     */
    async logRateLimitExceeded(
        identifier: string,
        endpoint: string,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'rate_limit_exceeded',
            threatLevel: 'low',
            blocked: true,
            sourceIp,
            details: { identifier, endpoint },
            request: { path: endpoint },
        });
    }

    /**
     * Log brute force attempt
     */
    async logBruteForceAttempt(
        targetUserId: string,
        attemptCount: number,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        const threatLevel = attemptCount >= 10 ? 'critical' :
            attemptCount >= 5 ? 'high' : 'medium';

        return this.logSecurityEvent({
            type: 'brute_force_attempt',
            threatLevel,
            blocked: attemptCount >= 5,
            sourceIp,
            userId: targetUserId,
            details: { attemptCount },
        });
    }

    /**
     * Log invalid token
     */
    async logInvalidToken(
        reason: string,
        tokenType: string,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'invalid_token',
            threatLevel: 'low',
            blocked: true,
            sourceIp,
            details: { reason, tokenType },
        });
    }

    /**
     * Log SQL injection attempt
     */
    async logSqlInjectionAttempt(
        payload: string,
        endpoint: string,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'sql_injection_attempt',
            threatLevel: 'critical',
            blocked: true,
            sourceIp,
            details: { payload: payload.slice(0, 200), endpoint },
            detectionRule: 'sql_injection_pattern',
        });
    }

    /**
     * Log XSS attempt
     */
    async logXssAttempt(
        payload: string,
        endpoint: string,
        sourceIp?: string
    ): Promise<SecurityLogEntry> {
        return this.logSecurityEvent({
            type: 'xss_attempt',
            threatLevel: 'high',
            blocked: true,
            sourceIp,
            details: { payload: payload.slice(0, 200), endpoint },
            detectionRule: 'xss_pattern',
        });
    }

    /**
     * Get IP reputation
     */
    getIpReputation(ip: string): IpReputation | undefined {
        return this.ipReputations.get(ip);
    }

    /**
     * Check if IP is blocked
     */
    isIpBlocked(ip: string): boolean {
        const reputation = this.ipReputations.get(ip);
        if (!reputation) return false;

        if (reputation.blockedUntil && Date.now() < reputation.blockedUntil) {
            return true;
        }

        // Auto-block if score is too low
        return reputation.score < 20;
    }

    /**
     * Block an IP
     */
    blockIp(ip: string, durationMs: number, reason: string): void {
        const reputation = this.getOrCreateReputation(ip);
        reputation.blockedUntil = Date.now() + durationMs;
        reputation.reasons.push(`Blocked: ${reason}`);
        reputation.score = Math.max(0, reputation.score - 30);
    }

    /**
     * Update IP reputation based on event
     */
    private updateIpReputation(event: SecurityEvent): void {
        if (!event.sourceIp) return;

        const reputation = this.getOrCreateReputation(event.sourceIp);

        // Decrease score based on threat level
        const scoreDecrease = {
            critical: 30,
            high: 20,
            medium: 10,
            low: 5,
            info: 0,
        };

        reputation.score = Math.max(0, reputation.score - scoreDecrease[event.threatLevel]);
        reputation.failedAttempts++;
        reputation.lastFailedAttempt = Date.now();
        reputation.reasons.push(event.type);

        // Keep only last 10 reasons
        if (reputation.reasons.length > 10) {
            reputation.reasons = reputation.reasons.slice(-10);
        }

        // Auto-block on critical or repeated offenses
        if (event.threatLevel === 'critical' || reputation.failedAttempts >= 10) {
            reputation.blockedUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        }
    }

    /**
     * Get or create IP reputation
     */
    private getOrCreateReputation(ip: string): IpReputation {
        let reputation = this.ipReputations.get(ip);
        if (!reputation) {
            reputation = {
                ip,
                score: 100,
                failedAttempts: 0,
                reasons: [],
            };
            this.ipReputations.set(ip, reputation);
        }
        return reputation;
    }

    /**
     * Convert threat level to log level
     */
    private threatLevelToLogLevel(threatLevel: SecurityEvent['threatLevel']): 'info' | 'warn' | 'error' | 'fatal' {
        switch (threatLevel) {
            case 'critical':
                return 'fatal';
            case 'high':
                return 'error';
            case 'medium':
                return 'warn';
            default:
                return 'info';
        }
    }

    /**
     * Generate message for security event
     */
    private generateMessage(event: SecurityEvent): string {
        const blocked = event.blocked ? '[BLOCKED] ' : '';
        const ip = event.sourceIp ? ` from ${event.sourceIp}` : '';
        return `${blocked}Security: ${event.type}${ip}`;
    }

    /**
     * Log to console
     */
    private logToConsole(entry: SecurityLogEntry): void {
        const emoji = entry.blocked ? '🛡️' : '⚠️';
        const severity = entry.threatLevel.toUpperCase();

        if (entry.threatLevel === 'critical' || entry.threatLevel === 'high') {
            console.error(`${emoji} SECURITY [${severity}] ${entry.message}`, {
                event: entry.securityEvent,
                ip: entry.context?.ipAddress,
                userId: entry.context?.userId,
            });
        } else {
            console.warn(`${emoji} SECURITY [${severity}] ${entry.message}`);
        }
    }

    /**
     * Get recent security events
     */
    getRecentEvents(limit = 100): SecurityLogEntry[] {
        return this.eventLog.slice(-limit).reverse();
    }

    /**
     * Get events by type
     */
    getEventsByType(type: SecurityEventType): SecurityLogEntry[] {
        return this.eventLog.filter((e) => e.securityEvent === type);
    }

    /**
     * Get threat summary
     */
    getThreatSummary(): {
        total: number;
        byLevel: Record<string, number>;
        byType: Record<string, number>;
        blockedCount: number;
        blockedIps: number;
    } {
        const byLevel: Record<string, number> = {};
        const byType: Record<string, number> = {};
        let blockedCount = 0;

        for (const event of this.eventLog) {
            byLevel[event.threatLevel] = (byLevel[event.threatLevel] || 0) + 1;
            byType[event.securityEvent] = (byType[event.securityEvent] || 0) + 1;
            if (event.blocked) blockedCount++;
        }

        const blockedIps = Array.from(this.ipReputations.values())
            .filter((r) => r.blockedUntil && Date.now() < r.blockedUntil).length;

        return {
            total: this.eventLog.length,
            byLevel,
            byType,
            blockedCount,
            blockedIps,
        };
    }
}

/**
 * Singleton instance
 */
let securityLoggerInstance: SecurityLogger | null = null;

/**
 * Get the global security logger
 */
export function getSecurityLogger(): SecurityLogger {
    if (!securityLoggerInstance) {
        securityLoggerInstance = new SecurityLogger();
    }
    return securityLoggerInstance;
}

/**
 * Convenience functions
 */
export const security = {
    logSuspiciousActivity: (type: string, details: Record<string, unknown>, ip?: string) =>
        getSecurityLogger().logSuspiciousActivity(type, details, ip),

    logAccessViolation: (userId: string, resource: string, reason: string, ip?: string) =>
        getSecurityLogger().logAccessViolation(userId, resource, reason, ip),

    logRateLimitExceeded: (identifier: string, endpoint: string, ip?: string) =>
        getSecurityLogger().logRateLimitExceeded(identifier, endpoint, ip),

    logBruteForceAttempt: (userId: string, count: number, ip?: string) =>
        getSecurityLogger().logBruteForceAttempt(userId, count, ip),

    isIpBlocked: (ip: string) =>
        getSecurityLogger().isIpBlocked(ip),

    blockIp: (ip: string, durationMs: number, reason: string) =>
        getSecurityLogger().blockIp(ip, durationMs, reason),
};
