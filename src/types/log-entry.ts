/**
 * Log Entry Types
 *
 * OpenTelemetry-compatible log format with required fields for
 * enterprise-grade observability, distributed tracing, and compliance.
 */

/**
 * Severity levels for log entries (OpenTelemetry-compatible)
 * TRACE < DEBUG < INFO < WARN < ERROR < FATAL
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Numeric severity values for log level comparison
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
};

/**
 * Core log entry structure - OpenTelemetry compatible
 */
export interface LogEntry {
    /** ISO 8601 timestamp */
    timestamp: string;

    /** Log severity level */
    level: LogLevel;

    /** Human-readable log message */
    message: string;

    /** Unique correlation ID for request tracing */
    correlationId?: string;

    /** OpenTelemetry trace ID (32-character hex) */
    traceId?: string;

    /** OpenTelemetry span ID (16-character hex) */
    spanId?: string;

    /** Service name for multi-service environments */
    service: string;

    /** Environment name (production, staging, development) */
    environment: string;

    /** Application version (from package.json or git commit) */
    version: string;

    /** Extended context data */
    context?: LogContext;

    /** Error details if applicable */
    error?: LogError;

    /** Performance metrics if applicable */
    metrics?: LogMetrics;
}

/**
 * Extended context for log entries
 */
export interface LogContext {
    /** Additional arbitrary data allowed for extensibility */
    [key: string]: unknown;

    /** Generic ID field for various entities */
    id?: string;
    /** Specific entity ID */
    entityId?: string;
    /** Order references */
    orderId?: string;
    /** Visit references */
    visitId?: string;
    /** Product references */
    productId?: string;
    /** Area/Region references */
    areaId?: string;
    /** Notification references */
    notificationId?: string;
    /** Error message detail */
    errorMessage?: string;
    /** Task and Job IDs */
    taskListId?: string;
    jobId?: string;
    operationId?: string;
    transactionId?: string;
    /** Maintenance specific */
    rootVisitId?: string;
    /** Analytics and Import */
    batchSize?: number;
    errorCount?: number;
    kind?: string;
    entityType?: string;
    /** Source component name */
    component?: string;

    /** Action being performed */
    action?: string;

    /** User ID (if authenticated) */
    userId?: string;

    /** Session ID for session tracking */
    sessionId?: string;

    /** Client IP address (anonymized in production) */
    ipAddress?: string;

    /** User agent string */
    userAgent?: string;

    /** Current route/page path */
    route?: string;

    /** HTTP method */
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

    /** HTTP status code */
    statusCode?: number;

    /** Request/operation duration in milliseconds */
    duration?: number;

    /** Additional arbitrary data */
    data?: Record<string, unknown>;

    /** Tags for filtering and categorization */
    tags?: Record<string, string>;

    /** Breadcrumb trail of recent actions */
    breadcrumbs?: LogBreadcrumb[];
}

/**
 * Error information within a log entry
 */
export interface LogError {
    /** Error class name */
    name: string;

    /** Error message */
    message: string;

    /** Stack trace */
    stack?: string;

    /** Error code (if available) */
    code?: string;

    /** Error category for classification */
    category?: ErrorCategory;

    /** Impact level */
    impact?: 'critical' | 'high' | 'medium' | 'low';

    /** Whether this is a known/recoverable error */
    isRecoverable?: boolean;

    /** Original cause if wrapped error */
    cause?: LogError;
}

/**
 * Error category classifications
 */
export type ErrorCategory =
    | 'NetworkError'
    | 'DatabaseError'
    | 'ValidationError'
    | 'AuthenticationError'
    | 'AuthorizationError'
    | 'BusinessLogicError'
    | 'ThirdPartyError'
    | 'RateLimitError'
    | 'TimeoutError'
    | 'ConfigurationError'
    | 'UnknownError';

/**
 * Performance metrics within a log entry
 */
export interface LogMetrics {
    /** Operation duration in milliseconds */
    durationMs?: number;

    /** Database query time in milliseconds */
    dbQueryMs?: number;

    /** External API call time in milliseconds */
    externalApiMs?: number;

    /** Memory usage in bytes */
    memoryBytes?: number;

    /** CPU usage percentage */
    cpuPercent?: number;

    /** Request size in bytes */
    requestBytes?: number;

    /** Response size in bytes */
    responseBytes?: number;

    /** Custom numeric metrics */
    custom?: Record<string, number>;
}

/**
 * Breadcrumb for tracking recent actions leading to an event
 */
export interface LogBreadcrumb {
    /** Timestamp of the breadcrumb */
    timestamp: string;

    /** Category of the breadcrumb */
    category: 'navigation' | 'click' | 'console' | 'http' | 'error' | 'custom';

    /** Short message describing the breadcrumb */
    message: string;

    /** Additional data for the breadcrumb */
    data?: Record<string, unknown>;

    /** Severity level of the breadcrumb */
    level?: LogLevel;
}

/**
 * Audit log entry for compliance tracking
 */
export interface AuditLogEntry extends LogEntry {
    /** Type of audit action */
    auditAction: AuditAction;

    /** Resource being accessed/modified */
    resource: string;

    /** Resource ID if applicable */
    resourceId?: string;

    /** Old value before change (for updates) */
    oldValue?: unknown;

    /** New value after change (for updates) */
    newValue?: unknown;

    /** Result of the action */
    result: 'success' | 'failure' | 'denied';

    /** Reason for failure/denial */
    reason?: string;
}

/**
 * Audit action types
 */
export type AuditAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'failed_login'
    | 'password_change'
    | 'permission_change'
    | 'config_change'
    | 'export'
    | 'import';

/**
 * Security event log entry
 */
export interface SecurityLogEntry extends LogEntry {
    /** Type of security event */
    securityEvent: SecurityEventType;

    /** Threat level assessment */
    threatLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';

    /** Whether the threat was blocked */
    blocked: boolean;

    /** Rule or mechanism that detected the event */
    detectionRule?: string;
}

/**
 * Security event types
 */
export type SecurityEventType =
    | 'suspicious_activity'
    | 'access_violation'
    | 'rate_limit_exceeded'
    | 'sql_injection_attempt'
    | 'xss_attempt'
    | 'brute_force_attempt'
    | 'invalid_token'
    | 'permission_escalation'
    | 'data_exfiltration_attempt';

/**
 * Transport configuration for log routing
 */
export interface TransportConfig {
    /** Transport name */
    name: string;

    /** Whether this transport is enabled */
    enabled: boolean;

    /** Minimum log level for this transport */
    minLevel: LogLevel;

    /** Maximum log level for this transport (optional) */
    maxLevel?: LogLevel;

    /** Sampling rate (0-1) for this transport */
    samplingRate?: number;

    /** Batch configuration */
    batch?: {
        size: number;
        flushIntervalMs: number;
    };

    /** Retry configuration */
    retry?: {
        maxRetries: number;
        backoffMs: number;
    };

    /** Transport-specific options */
    options?: Record<string, unknown>;
}

/**
 * Filtering options for log search
 */
export interface LogSearchFilter {
    /** Filter by log level(s) */
    levels?: LogLevel[];

    /** Filter by component */
    component?: string;

    /** Filter by action */
    action?: string;

    /** Filter by correlation ID */
    correlationId?: string;

    /** Filter by user ID */
    userId?: string;

    /** Filter by time range start */
    startTime?: string;

    /** Filter by time range end */
    endTime?: string;

    /** Full-text search on message */
    searchText?: string;

    /** Filter by error category */
    errorCategory?: ErrorCategory;

    /** Filter by tags */
    tags?: Record<string, string>;
}

/**
 * Paginated log search result
 */
export interface LogSearchResult {
    /** Log entries matching the filter */
    entries: LogEntry[];

    /** Total count of matching entries */
    totalCount: number;

    /** Current page number */
    page: number;

    /** Page size */
    pageSize: number;

    /** Whether there are more results */
    hasMore: boolean;

    /** Cursor for next page (if using cursor pagination) */
    nextCursor?: string;
}
