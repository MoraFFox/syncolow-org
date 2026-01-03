/**
 * Alert Manager
 *
 * Proactive error detection and notification system with
 * configurable alert rules and multiple notification channels.
 */

import type { LogEntry, LogLevel } from '@/types/log-entry';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert notification channels
 */
export type AlertChannel = 'email' | 'slack' | 'pagerduty' | 'sms' | 'webhook';

/**
 * Alert rule definition
 */
export interface AlertRule {
    /** Unique rule ID */
    id: string;

    /** Rule name */
    name: string;

    /** Rule description */
    description?: string;

    /** Whether rule is enabled */
    enabled: boolean;

    /** Alert severity */
    severity: AlertSeverity;

    /** Notification channels */
    channels: AlertChannel[];

    /** Condition for triggering alert */
    condition: AlertCondition;

    /** Throttle settings (prevent alert spam) */
    throttle?: {
        /** Maximum alerts per time window */
        maxAlerts: number;
        /** Time window in seconds */
        windowSeconds: number;
    };

    /** Custom metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Alert condition types
 */
export type AlertCondition =
    | { type: 'error_rate'; threshold: number; windowSeconds: number }
    | { type: 'error_count'; threshold: number; windowSeconds: number }
    | { type: 'response_time_p95'; thresholdMs: number; windowSeconds: number }
    | { type: 'log_level'; level: LogLevel; minCount: number; windowSeconds: number }
    | { type: 'pattern'; pattern: string; minCount: number; windowSeconds: number }
    | { type: 'custom'; evaluate: (metrics: AlertMetrics) => boolean };

/**
 * Alert metrics for condition evaluation
 */
export interface AlertMetrics {
    /** Total requests in window */
    totalRequests: number;

    /** Error count in window */
    errorCount: number;

    /** Error rate (0-1) */
    errorRate: number;

    /** Response time p95 in ms */
    responseTimeP95: number;

    /** Response time avg in ms */
    responseTimeAvg: number;

    /** Log counts by level */
    logCounts: Record<LogLevel, number>;

    /** Pattern match counts */
    patternMatches: Record<string, number>;
}

/**
 * Alert instance
 */
export interface Alert {
    /** Alert ID */
    id: string;

    /** Rule that triggered this alert */
    ruleId: string;

    /** Rule name */
    ruleName: string;

    /** Alert severity */
    severity: AlertSeverity;

    /** Alert message */
    message: string;

    /** Timestamp when alert was triggered */
    triggeredAt: string;

    /** Metrics at time of alert */
    metrics: AlertMetrics;

    /** Whether alert has been acknowledged */
    acknowledged: boolean;

    /** Acknowledgement details */
    acknowledgedBy?: string;
    acknowledgedAt?: string;

    /** Resolution details */
    resolved: boolean;
    resolvedAt?: string;
}

/**
 * Notification sender interface
 */
export interface NotificationSender {
    send(alert: Alert): Promise<void>;
}

/**
 * Email notification sender
 */
class EmailSender implements NotificationSender {
    private recipients: string[];

    constructor(recipients: string[]) {
        this.recipients = recipients;
    }

    async send(alert: Alert): Promise<void> {
        // In production, integrate with SendGrid, AWS SES, etc.
        console.log(`[EMAIL] Alert to ${this.recipients.join(', ')}: ${alert.message}`);
    }
}

/**
 * Slack notification sender
 */
class SlackSender implements NotificationSender {
    private webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    async send(alert: Alert): Promise<void> {
        if (!this.webhookUrl) {
            console.warn('Slack webhook URL not configured');
            return;
        }

        const color = alert.severity === 'critical' ? '#ff0000' :
            alert.severity === 'warning' ? '#ffaa00' : '#00aa00';

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attachments: [{
                        color,
                        title: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
                        text: alert.message,
                        fields: [
                            { title: 'Rule ID', value: alert.ruleId, short: true },
                            { title: 'Triggered At', value: alert.triggeredAt, short: true },
                            { title: 'Error Rate', value: `${(alert.metrics.errorRate * 100).toFixed(2)}%`, short: true },
                            { title: 'P95 Response Time', value: `${alert.metrics.responseTimeP95}ms`, short: true },
                        ],
                        ts: Math.floor(new Date(alert.triggeredAt).getTime() / 1000).toString(),
                    }],
                }),
            });
        } catch (error) {
            console.error('Failed to send Slack notification:', error);
        }
    }
}

/**
 * Console notification sender (for development)
 */
class ConsoleSender implements NotificationSender {
    async send(alert: Alert): Promise<void> {
        const emoji = alert.severity === 'critical' ? '🚨' :
            alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} ALERT [${alert.severity}] ${alert.ruleName}: ${alert.message}`);
    }
}

/**
 * Alert manager implementation
 */
export class AlertManager {
    private rules: Map<string, AlertRule> = new Map();
    private alerts: Alert[] = [];
    private throttleState: Map<string, { count: number; windowStart: number }> = new Map();
    private senders: Map<AlertChannel, NotificationSender> = new Map();
    private metrics: AlertMetrics = this.createEmptyMetrics();
    private metricsWindowStart = Date.now();
    private metricsWindowSeconds = 60;
    private logBuffer: LogEntry[] = [];
    private maxLogBuffer = 1000;

    constructor() {
        // Register default senders
        this.senders.set('email', new EmailSender(
            (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
        ));
        this.senders.set('slack', new SlackSender(
            process.env.ALERT_SLACK_WEBHOOK || ''
        ));
        // Console sender for development
        if (process.env.NODE_ENV === 'development') {
            this.senders.set('webhook', new ConsoleSender());
        }

        // Set up default rules
        this.setupDefaultRules();
    }

    /**
     * Set up default alert rules
     */
    private setupDefaultRules(): void {
        this.addRule({
            id: 'high-error-rate',
            name: 'High Error Rate',
            description: 'Error rate exceeds 10% over 5 minutes',
            enabled: true,
            severity: 'critical',
            channels: ['slack', 'email'],
            condition: { type: 'error_rate', threshold: 0.1, windowSeconds: 300 },
            throttle: { maxAlerts: 1, windowSeconds: 300 },
        });

        this.addRule({
            id: 'slow-response',
            name: 'Slow Response Time',
            description: 'P95 response time exceeds 2 seconds',
            enabled: true,
            severity: 'warning',
            channels: ['slack'],
            condition: { type: 'response_time_p95', thresholdMs: 2000, windowSeconds: 300 },
            throttle: { maxAlerts: 1, windowSeconds: 600 },
        });

        this.addRule({
            id: 'fatal-errors',
            name: 'Fatal Errors',
            description: 'Any fatal errors occur',
            enabled: true,
            severity: 'critical',
            channels: ['slack', 'email', 'pagerduty'],
            condition: { type: 'log_level', level: 'fatal', minCount: 1, windowSeconds: 60 },
            throttle: { maxAlerts: 5, windowSeconds: 300 },
        });
    }

    /**
     * Add an alert rule
     */
    addRule(rule: AlertRule): void {
        this.rules.set(rule.id, rule);
    }

    /**
     * Remove an alert rule
     */
    removeRule(ruleId: string): boolean {
        return this.rules.delete(ruleId);
    }

    /**
     * Get all rules
     */
    getRules(): AlertRule[] {
        return Array.from(this.rules.values());
    }

    /**
     * Enable/disable a rule
     */
    setRuleEnabled(ruleId: string, enabled: boolean): boolean {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
            return true;
        }
        return false;
    }

    /**
     * Register a notification sender
     */
    registerSender(channel: AlertChannel, sender: NotificationSender): void {
        this.senders.set(channel, sender);
    }

    /**
     * Process a log entry
     */
    processLog(entry: LogEntry): void {
        // Update metrics
        this.updateMetrics(entry);

        // Buffer log for pattern matching
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxLogBuffer) {
            this.logBuffer.shift();
        }

        // Check rules
        this.checkRules();
    }

    /**
     * Update metrics from log entry
     */
    private updateMetrics(entry: LogEntry): void {
        // Reset window if expired
        const now = Date.now();
        if (now - this.metricsWindowStart > this.metricsWindowSeconds * 1000) {
            this.metrics = this.createEmptyMetrics();
            this.metricsWindowStart = now;
        }

        // Update log counts
        this.metrics.logCounts[entry.level] = (this.metrics.logCounts[entry.level] || 0) + 1;

        // Update request metrics if HTTP context present
        if (entry.context?.statusCode !== undefined) {
            this.metrics.totalRequests++;

            if (entry.context.statusCode >= 500) {
                this.metrics.errorCount++;
            }

            this.metrics.errorRate = this.metrics.totalRequests > 0
                ? this.metrics.errorCount / this.metrics.totalRequests
                : 0;

            if (entry.context.duration) {
                // Simple running average (not true p95)
                this.metrics.responseTimeAvg =
                    (this.metrics.responseTimeAvg * (this.metrics.totalRequests - 1) + entry.context.duration)
                    / this.metrics.totalRequests;

                // Approximate p95 as 2x average (simplified)
                this.metrics.responseTimeP95 = Math.max(
                    this.metrics.responseTimeP95,
                    entry.context.duration
                );
            }
        }
    }

    /**
     * Check all rules against current metrics
     */
    private checkRules(): void {
        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;

            if (this.evaluateCondition(rule.condition)) {
                this.triggerAlert(rule);
            }
        }
    }

    /**
     * Evaluate an alert condition
     */
    private evaluateCondition(condition: AlertCondition): boolean {
        switch (condition.type) {
            case 'error_rate':
                return this.metrics.errorRate >= condition.threshold;

            case 'error_count':
                return this.metrics.errorCount >= condition.threshold;

            case 'response_time_p95':
                return this.metrics.responseTimeP95 >= condition.thresholdMs;

            case 'log_level':
                return (this.metrics.logCounts[condition.level] || 0) >= condition.minCount;

            case 'pattern':
                return (this.metrics.patternMatches[condition.pattern] || 0) >= condition.minCount;

            case 'custom':
                return condition.evaluate(this.metrics);

            default:
                return false;
        }
    }

    /**
     * Trigger an alert
     */
    private async triggerAlert(rule: AlertRule): Promise<void> {
        // Check throttle
        if (!this.checkThrottle(rule)) {
            return;
        }

        const alert: Alert = {
            id: generateAlertId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: this.generateAlertMessage(rule),
            triggeredAt: new Date().toISOString(),
            metrics: { ...this.metrics },
            acknowledged: false,
            resolved: false,
        };

        this.alerts.push(alert);

        // Limit stored alerts
        if (this.alerts.length > 1000) {
            this.alerts.shift();
        }

        // Send notifications
        await this.sendNotifications(alert, rule.channels);
    }

    /**
     * Check throttle for a rule
     */
    private checkThrottle(rule: AlertRule): boolean {
        if (!rule.throttle) return true;

        const now = Date.now();
        const state = this.throttleState.get(rule.id) || { count: 0, windowStart: now };

        // Reset window if expired
        if (now - state.windowStart > rule.throttle.windowSeconds * 1000) {
            state.count = 0;
            state.windowStart = now;
        }

        if (state.count >= rule.throttle.maxAlerts) {
            return false;
        }

        state.count++;
        this.throttleState.set(rule.id, state);
        return true;
    }

    /**
     * Generate alert message
     */
    private generateAlertMessage(rule: AlertRule): string {
        const condition = rule.condition;

        switch (condition.type) {
            case 'error_rate':
                return `Error rate is ${(this.metrics.errorRate * 100).toFixed(2)}% (threshold: ${condition.threshold * 100}%)`;
            case 'error_count':
                return `Error count is ${this.metrics.errorCount} (threshold: ${condition.threshold})`;
            case 'response_time_p95':
                return `P95 response time is ${this.metrics.responseTimeP95}ms (threshold: ${condition.thresholdMs}ms)`;
            case 'log_level':
                return `${condition.level} logs: ${this.metrics.logCounts[condition.level]} (threshold: ${condition.minCount})`;
            default:
                return rule.description || `Alert triggered: ${rule.name}`;
        }
    }

    /**
     * Send notifications to channels
     */
    private async sendNotifications(alert: Alert, channels: AlertChannel[]): Promise<void> {
        const promises = channels.map(async (channel) => {
            const sender = this.senders.get(channel);
            if (sender) {
                try {
                    await sender.send(alert);
                } catch (error) {
                    console.error(`Failed to send ${channel} notification:`, error);
                }
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Get recent alerts
     */
    getAlerts(limit = 100): Alert[] {
        return this.alerts.slice(-limit).reverse();
    }

    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = acknowledgedBy;
            alert.acknowledgedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): boolean {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Get current metrics
     */
    getMetrics(): AlertMetrics {
        return { ...this.metrics };
    }

    /**
     * Create empty metrics object
     */
    private createEmptyMetrics(): AlertMetrics {
        return {
            totalRequests: 0,
            errorCount: 0,
            errorRate: 0,
            responseTimeP95: 0,
            responseTimeAvg: 0,
            logCounts: {
                trace: 0,
                debug: 0,
                info: 0,
                warn: 0,
                error: 0,
                fatal: 0,
            },
            patternMatches: {},
        };
    }
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Singleton instance
 */
let alertManagerInstance: AlertManager | null = null;

/**
 * Get the global alert manager
 */
export function getAlertManager(): AlertManager {
    if (!alertManagerInstance) {
        alertManagerInstance = new AlertManager();
    }
    return alertManagerInstance;
}
