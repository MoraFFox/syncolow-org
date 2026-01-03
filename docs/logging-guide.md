# Enterprise Logging System

## Overview

SynergyFlow ERP includes a comprehensive enterprise-grade logging system with distributed tracing, multi-transport output, performance monitoring, and compliance features.

## Quick Start

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User logged in', { component: 'Auth', userId: '123' });
logger.warn('Rate limit approaching', { component: 'API', remaining: 10 });
logger.error(new Error('Payment failed'), { component: 'Checkout' });

// With structured context
logger.info('Order created', {
  component: 'Orders',
  action: 'create',
  orderId: 'ORD-001',
  customerId: 'CUST-123',
});
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` (prod), `debug` (dev) |
| `LOG_FORMAT` | Output format | `json` (prod), `pretty` (dev) |
| `LOG_TRANSPORTS` | Enabled transports | `console` |
| `SENTRY_DSN` | Sentry DSN for error tracking | - |
| `ENABLE_SENTRY` | Enable Sentry integration | `false` |
| `ENABLE_PERFORMANCE_MONITORING` | Enable APM | `false` |
| `ENABLE_AUDIT_LOGGING` | Enable audit logs | `false` |

### Log Levels

- `trace` - Very detailed debugging (sampled in production)
- `debug` - Debug information (sampled in production)
- `info` - General information (sampled in production)
- `warn` - Warning conditions (always logged)
- `error` - Error conditions (always logged)
- `fatal` - Critical failures (always logged)

## Features

### Correlation IDs

Every request automatically receives a correlation ID via middleware:

```typescript
// Automatically added to logs within request context
{
  correlationId: "550e8400-e29b-41d4-a716-446655440000",
  traceId: "abc123def456...",
  spanId: "1234567890abcdef"
}
```

### Performance Monitoring

```typescript
import { perf } from '@/lib/performance-monitor';

// Track async operations
const result = await perf.trace('database.query', async () => {
  return await db.query('SELECT * FROM orders');
});

// Record custom metrics
perf.recordMetric('orders.processed', 150);
perf.histogram('response.time', 245);
```

### Audit Logging

```typescript
import { audit } from '@/lib/audit-logger';

// Log user actions
await audit.logUserAction('update_profile', 'users', { field: 'email' });

// Log data access
await audit.logDataAccess(userId, 'orders', 'read', orderId);

// Log auth events
await audit.logAuthEvent('login', userId, { ip: clientIp });
```

### Security Logging

```typescript
import { security } from '@/lib/security-logger';

// Log suspicious activity
await security.logSuspiciousActivity('repeated_failures', { attempts: 5 }, clientIp);

// Log access violations
await security.logAccessViolation(userId, '/admin', 'insufficient_permissions', clientIp);

// Check IP blocking
if (security.isIpBlocked(clientIp)) {
  return Response.json({ error: 'Blocked' }, { status: 403 });
}
```

## Transports

### Console Transport
Colorized output in development, JSON in production.

### File Transport
Rotating file logs with size and time-based rotation.

### Sentry Transport
Automatic error tracking with full context and breadcrumbs.

### DataDog Transport
APM integration with metrics and distributed tracing.

### CloudWatch Transport
AWS CloudWatch Logs integration for cloud deployments.

## API Endpoints

### GET /api/logs/search
Search and filter logs with pagination.

Query parameters:
- `levels` - Comma-separated levels (e.g., `error,warn`)
- `component` - Filter by component
- `correlationId` - Filter by correlation ID
- `startTime` / `endTime` - Time range
- `search` - Full-text search
- `page` / `pageSize` - Pagination

### GET /api/health/logging
Health check for the logging system.

Returns transport status, buffer metrics, and any issues detected.

## Best Practices

1. **Always include context**: Use `component` and `action` for all logs
2. **Use structured data**: Pass objects, not formatted strings
3. **Don't log sensitive data**: PII is automatically redacted
4. **Use appropriate levels**: Reserve `error` for actual errors
5. **Include correlation IDs**: Automatic in request context, manual for background jobs

## Compliance

- **GDPR**: User data export and deletion via `LogRetentionManager`
- **Audit Trail**: Immutable audit logs with 7-year retention
- **PII Protection**: Automatic redaction of sensitive fields

See `docs/compliance-guide.md` for detailed compliance information.
