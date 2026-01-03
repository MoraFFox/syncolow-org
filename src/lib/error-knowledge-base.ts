/**
 * Error Knowledge Base
 *
 * Central repository of known error patterns, diagnostic information,
 * and remediation strategies. Acts as the brain for the ErrorClassifier.
 */

import type { ErrorCategory } from '@/types/log-entry';

/**
 * Error pattern definition
 */
export interface ErrorPattern {
    /** Pattern name (unique ID) */
    name: string;

    /** Category to assign */
    category: ErrorCategory;

    /** Sub-category */
    subCategory?: string;

    /** Message patterns (regex) */
    messagePatterns: RegExp[];

    /** Error name patterns */
    namePatterns?: RegExp[];

    /** Code patterns */
    codePatterns?: (string | RegExp)[];

    /** Impact level */
    impact: 'critical' | 'high' | 'medium' | 'low';

    /** Whether recoverable */
    isRecoverable: boolean;

    /** Suggested actions */
    suggestedActions: string[];

    /** Documentation links */
    docLinks?: string[];
}

/**
 * Known error patterns database
 */
export const KNOWN_ERROR_PATTERNS: ErrorPattern[] = [
    // === Network Errors ===
    {
        name: 'ConnectionRefused',
        category: 'NetworkError',
        subCategory: 'connection',
        messagePatterns: [
            /ECONNREFUSED/i,
            /connection refused/i,
            /connect ETIMEDOUT/i,
            /socket hang up/i,
            /network unreachable/i,
        ],
        impact: 'high',
        isRecoverable: true,
        suggestedActions: [
            'Check if the target service is running',
            'Verify network connectivity',
            'Check firewall rules',
            'Ensure correct port is being used',
        ],
    },
    {
        name: 'DNSResolutionFailed',
        category: 'NetworkError',
        subCategory: 'dns',
        messagePatterns: [
            /ENOTFOUND/i,
            /getaddrinfo/i,
            /DNS resolution failed/i,
            /EAI_AGAIN/i,
        ],
        impact: 'high',
        isRecoverable: true,
        suggestedActions: [
            'Verify DNS configuration',
            'Check hostname spelling',
            'Try using IP address directly',
            'Flush DNS cache',
        ],
    },
    {
        name: 'RequestTimeout',
        category: 'TimeoutError',
        messagePatterns: [
            /timeout/i,
            /ETIMEDOUT/i,
            /ESOCKETTIMEDOUT/i,
            /request timed out/i,
            /gateway timeout/i,
        ],
        impact: 'medium',
        isRecoverable: true,
        suggestedActions: [
            'Increase timeout threshold',
            'Check for slow downstream services',
            'Implement retry with backoff',
            'Optimize query/request complexity',
        ],
    },

    // === Database Errors ===
    {
        name: 'DatabaseConnectionError',
        category: 'DatabaseError',
        subCategory: 'connection',
        messagePatterns: [
            /database connection/i,
            /ECONNRESET.*postgres/i,
            /connection pool exhausted/i,
            /too many connections/i,
            /client has been closed/i,
        ],
        impact: 'critical',
        isRecoverable: true,
        suggestedActions: [
            'Check database server status',
            'Increase connection pool size',
            'Check for connection leaks',
            'Verify database credentials',
        ],
    },
    {
        name: 'QueryError',
        category: 'DatabaseError',
        subCategory: 'query',
        messagePatterns: [
            /syntax error at or near/i,
            /relation .* does not exist/i,
            /column .* does not exist/i,
            /duplicate key value violates unique constraint/i,
            /value too long/i,
            /invalid input syntax/i,
        ],
        codePatterns: [/^42/], // PostgreSQL class 42 = syntax error
        impact: 'medium',
        isRecoverable: false,
        suggestedActions: [
            'Review the SQL query syntax',
            'Check table and column names against schema',
            'Verify data types of inputs',
            'Check for constraint violations',
        ],
    },
    {
        name: 'ForeignKeyViolation',
        category: 'DatabaseError',
        subCategory: 'constraint',
        messagePatterns: [
            /foreign key constraint/i,
            /violates foreign key/i,
            /update or delete on table .* violates foreign key/i,
        ],
        codePatterns: ['23503'],
        impact: 'low',
        isRecoverable: false,
        suggestedActions: [
            'Ensure referenced record exists',
            'Check cascade delete settings',
            'Verify data integrity',
            'Check order of operations for dependent data',
        ],
    },

    // === Validation Errors ===
    {
        name: 'ValidationError',
        category: 'ValidationError',
        messagePatterns: [
            /validation (?:error|failed)/i,
            /invalid input/i,
            /required field/i,
            /expected .* but got/i,
            /matches regex/i,
            /must be/i,
        ],
        namePatterns: [/ZodError/i, /ValidationError/i, /TypeError/i],
        impact: 'low',
        isRecoverable: false,
        suggestedActions: [
            'Review input data format against schema',
            'Check required fields are present',
            'Verify data types (string, number, boolean)',
            'Provide user-friendly error message',
        ],
    },

    // === Authentication Errors ===
    {
        name: 'InvalidToken',
        category: 'AuthenticationError',
        subCategory: 'token',
        messagePatterns: [
            /invalid token/i,
            /jwt.*(?:expired|invalid|malformed)/i,
            /token has expired/i,
            /signature verification failed/i,
            /invalid signature/i,
            /auth/i,
        ],
        impact: 'low',
        isRecoverable: true,
        suggestedActions: [
            'Request a new token',
            'Check token expiration',
            'Verify token signing key',
            'Check for clock skew',
        ],
    },
    {
        name: 'AuthenticationRequired',
        category: 'AuthenticationError',
        subCategory: 'missing',
        messagePatterns: [
            /unauthorized/i,
            /not authenticated/i,
            /authentication required/i,
            /missing.*(?:token|credentials)/i,
            /no authorization/i,
        ],
        impact: 'low',
        isRecoverable: true,
        suggestedActions: [
            'Ensure user is logged in',
            'Include authentication header',
            'Check session status',
            'Redirect to login page',
        ],
    },

    // === Authorization Errors ===
    {
        name: 'PermissionDenied',
        category: 'AuthorizationError',
        messagePatterns: [
            /forbidden/i,
            /permission denied/i,
            /access denied/i,
            /not authorized/i,
            /insufficient permissions/i,
            /does not have scope/i,
        ],
        impact: 'low',
        isRecoverable: false,
        suggestedActions: [
            'Check user role and permissions',
            'Request elevated access',
            'Verify resource ownership',
            'Contact administrator',
        ],
    },

    // === Rate Limiting ===
    {
        name: 'RateLimited',
        category: 'RateLimitError',
        messagePatterns: [
            /rate limit/i,
            /too many requests/i,
            /throttl/i,
            /quota exceeded/i,
            /429/i,
        ],
        impact: 'medium',
        isRecoverable: true,
        suggestedActions: [
            'Implement request throttling',
            'Add retry with exponential backoff',
            'Consider caching frequent requests',
            'Request quota increase if applicable',
        ],
    },

    // === Third Party Errors ===
    {
        name: 'ThirdPartyServiceError',
        category: 'ThirdPartyError',
        messagePatterns: [
            /external service/i,
            /api error/i,
            /service unavailable/i,
            /503 Service Unavailable/i,
            /bad gateway/i,
            /502 Bad Gateway/i,
        ],
        impact: 'high',
        isRecoverable: true,
        suggestedActions: [
            'Check third-party service status page',
            'Implement circuit breaker pattern',
            'Use fallback strategy',
            'Check API keys/credentials',
        ],
    },

    // === Configuration Errors ===
    {
        name: 'ConfigurationError',
        category: 'ConfigurationError',
        messagePatterns: [
            /missing.*(?:config|env|variable)/i,
            /invalid.*configuration/i,
            /environment variable.*(?:not set|undefined)/i,
            /failed to load config/i,
        ],
        impact: 'critical',
        isRecoverable: false,
        suggestedActions: [
            'Check environment variables exist',
            'Review configuration files',
            'Verify deployment settings',
            'Check secret manager access',
        ],
    },

    // === AI/LLM Errors (Specific to this app) ===
    {
        name: 'AIModelError',
        category: 'ThirdPartyError',
        subCategory: 'ai_model',
        messagePatterns: [
            /model overloaded/i,
            /server overloaded/i,
            /context length exceeded/i,
            /token limit/i,
            /safety filter/i,
        ],
        impact: 'medium',
        isRecoverable: true,
        suggestedActions: [
            'Reduce context/prompt size',
            'Retry with exponential backoff',
            'Check content safety guidelines',
            'Switch to fallback model',
        ],
    },
];
