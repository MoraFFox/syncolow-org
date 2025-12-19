# Mock Data Generator System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Data Generation Flow](#data-generation-flow)
5. [Entity Generators](#entity-generators)
6. [Scenario Profiles](#scenario-profiles)
7. [Safety & Isolation](#safety--isolation)
8. [API Reference](#api-reference)
9. [CLI Reference](#cli-reference)
10. [Configuration](#configuration)
11. [Extending the System](#extending-the-system)

---

## Overview

The Mock Data Generator is a comprehensive system for generating realistic test data for SynergyFlow ERP. It creates interconnected data across 13 entity types with configurable scenarios, statistical distributions, and anomaly injection for stress testing.

### Key Features
- **Reproducible**: Seed-based generation ensures identical data sets
- **Realistic**: Uses Zipf distribution for product popularity, Egyptian-specific data
- **Safe**: Environment isolation prevents production contamination
- **Flexible**: 6 built-in scenarios + custom scenario support
- **Observable**: Real-time progress tracking with throughput metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      API / CLI Interface                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ /generate   │  │ /status     │  │  CLI        │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mock Data Orchestrator                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Safety Guard  │  Scenario Manager  │  Progress Tracker   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Entity Generators                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Users   │ │Companies │ │ Products │ │  Orders  │  ...      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Output                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  mock_data schema│  │  Export (JSON/CSV)│                    │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Orchestrator (`orchestrator.ts`)
The main coordinator that:
- Validates configuration and runs safety checks
- Initializes generators in dependency order
- Tracks progress and handles errors
- Manages rollback on failure

```typescript
const orchestrator = new MockDataOrchestrator(config, options);
const result = await orchestrator.execute();
```

### 2. Safety Guard (`safety-guard.ts`)
Prevents production contamination:
- Checks `NODE_ENV` and `MOCK_DATA_ENABLED`
- Validates target schema is `mock_data`
- Enforces record limits
- Blocks production writes

### 3. Scenario Manager (`scenarios/scenario-manager.ts`)
Manages scenario profiles:
- Loads built-in and custom scenarios
- Validates scenario configurations
- Supports scenario inheritance

### 4. Progress Tracker (`progress-tracker.ts`)
Provides real-time metrics:
- Current entity and batch
- Records generated
- Throughput (records/sec)
- Estimated time remaining

### 5. Time Series Engine (`time-series-engine.ts`)
Distributes events over time with:
- Daily/weekly patterns
- Seasonal variations
- Burst/spread anomalies

---

## Data Generation Flow

```
1. Configuration
   └─> Validate config with Zod schemas
   └─> Load scenario profile
   └─> Run safety checks

2. Initialization
   └─> Create Faker instance with seed
   └─> Initialize generators with dependencies

3. Generation (in dependency order)
   └─> Users (no dependencies)
   └─> Companies (no dependencies)
   └─> Branches (depends on Companies)
   └─> Products (no dependencies)
   └─> Orders (depends on Companies, Products)
   └─> Inventory (depends on Products, Orders)
   └─> Shipments (depends on Orders)
   └─> Payments (depends on Orders)
   └─> ... other entities

4. Anomaly Injection
   └─> Apply scenario-specific anomalies
   └─> Payment delays, delivery delays, cancellations

5. Validation
   └─> Check referential integrity
   └─> Verify record counts

6. Output
   └─> Write to database (if not dry-run)
   └─> Return generation result
```

---

## Entity Generators

### Dependencies
```
Users ────────────────────┐
                          │
Companies ────────┬──────▼──────┐
                  │             │
Branches ─────────┤   Orders ◄──┤
                  │      │      │
Products ─────────┴──────┼──────┘
                         │
           ┌─────────────┼─────────────┬─────────────┐
           ▼             ▼             ▼             ▼
      Inventory     Shipments     Payments     Discounts
                                                   │
                                                   ▼
                                              Refunds
```

### Generator Descriptions

| Generator | Records | Key Features |
|-----------|---------|--------------|
| **UserGenerator** | Users | Roles: Admin 5%, Manager 15%, Sales 50%, Support 30% |
| **CompanyGenerator** | Companies, Branches | Egyptian areas, tax numbers, payment configs |
| **ProductGenerator** | Products | Zipf popularity (80/20 rule), coffee/beverage names |
| **OrderGenerator** | Orders, OrderItems | Delivery schedules (A/B regions), status history |
| **InventoryGenerator** | Stock movements | Fulfillment, restocks, returns, adjustments |
| **ShipmentGenerator** | Shipments | Delivery attempts, failure reasons |
| **PaymentGenerator** | Payments | Payment timing distributions, bulk payment cycles |
| **DiscountGenerator** | Discounts | Order-level and item-level discounts |
| **RefundGenerator** | Refunds | Approval workflows, rejection handling |
| **MaintenanceGenerator** | Maintenance visits | Spare parts, services, follow-ups |
| **AuditLogGenerator** | Audit logs | User actions across all entities |

---

## Scenario Profiles

### Built-in Scenarios

#### 1. `normal-ops` (Default)
- **Anomaly Rate**: 5%
- **Use Case**: Standard testing
- **Characteristics**: Typical business patterns

#### 2. `peak-season`
- **Anomaly Rate**: 15%
- **Use Case**: Holiday/high-volume simulation
- **Characteristics**: 3x order volume, higher payment delays

#### 3. `anomaly-heavy`
- **Anomaly Rate**: 40%
- **Use Case**: Stress testing
- **Characteristics**: Many payment delays, delivery failures

#### 4. `warehouse-outage`
- **Anomaly Rate**: 60%
- **Use Case**: Supply chain disruption
- **Characteristics**: Low deliveries, high cancellations

#### 5. `growth-phase`
- **Anomaly Rate**: 8%
- **Use Case**: Rapid business growth
- **Characteristics**: 2x companies, increasing orders

#### 6. `payment-crisis`
- **Anomaly Rate**: 25%
- **Use Case**: Payment delay testing
- **Characteristics**: 30% overdue payments

### Custom Scenarios
```typescript
const manager = getScenarioManager();
const custom = manager.createCustomScenario('normal-ops', 'my-scenario', {
  anomalyRate: 0.15,
  description: 'Custom testing scenario',
  entityRates: {
    ordersPerDay: 100,
  },
});
```

---

## Safety & Isolation

### Environment Checks
1. `NODE_ENV` must NOT be `production`
2. `MOCK_DATA_ENABLED` must be `true`
3. Target schema must be `mock_data`

### Database Isolation
All mock data is written to the `mock_data` Supabase schema, completely separate from production tables:

```sql
-- Tables are cloned in mock_data schema
mock_data.users
mock_data.companies
mock_data.orders
-- etc.
```

### Cleanup Protection
Cleanup requires confirmation token:
```bash
DELETE /api/mock-data/cleanup?confirm=DELETE_ALL_MOCK_DATA
```

---

## API Reference

### POST `/api/mock-data/generate`
Start a generation job.

**Request:**
```json
{
  "scenario": "normal-ops",
  "config": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "seed": 12345,
    "volumeMultiplier": 1,
    "dryRun": true
  }
}
```

**Response:**
```json
{
  "jobId": "job-abc123",
  "status": "started",
  "scenario": "normal-ops"
}
```

### GET `/api/mock-data/status?jobId=<id>`
Check job progress.

**Response:**
```json
{
  "status": "generating",
  "progress": {
    "currentEntity": "orders",
    "progressPercent": 45,
    "throughput": 1250,
    "recordsGenerated": { "users": 20, "companies": 100, "orders": 450 }
  }
}
```

### GET `/api/mock-data/scenarios`
List available scenarios.

### POST `/api/mock-data/export`
Export generated data.

### DELETE `/api/mock-data/cleanup?confirm=DELETE_ALL_MOCK_DATA`
Remove all mock data.

### GET/POST `/api/mock-data/toggle`
Enable/disable mock data generation.

---

## CLI Reference

```bash
# List scenarios
npx tsx scripts/mock-data-cli.ts scenarios

# Validate a scenario
npx tsx scripts/mock-data-cli.ts validate --scenario peak-season

# Generate (dry-run by default)
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops

# Generate with options
npx tsx scripts/mock-data-cli.ts generate \
  --scenario normal-ops \
  --from 2024-01-01 \
  --to 2024-03-31 \
  --seed 12345 \
  --multiplier 2 \
  --no-dry-run

# Check job status
npx tsx scripts/mock-data-cli.ts status --job <job-id>

# Cleanup (requires confirmation)
npx tsx scripts/mock-data-cli.ts cleanup --confirm

# Toggle mock data
npx tsx scripts/mock-data-cli.ts toggle --enable
npx tsx scripts/mock-data-cli.ts toggle --disable
```

---

## Configuration

### Environment Variables
```bash
# Required
MOCK_DATA_ENABLED=true
NODE_ENV=development

# Supabase (for database writes)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Generator Config
```typescript
interface MockGeneratorConfig {
  startDate: string;      // ISO date: "2024-01-01"
  endDate: string;        // ISO date: "2024-03-31"
  seed?: number;          // Random seed for reproducibility
  scenario: string;       // Scenario name
  volumeMultiplier?: number; // Scale factor (default: 1)
  batchSize?: number;     // Records per batch (default: 1000)
  dryRun?: boolean;       // Skip database writes (default: true)
}
```

### Entity Volumes
```typescript
interface EntityVolume {
  users: number;              // Default: 20
  companies: number;          // Default: 100
  branchRatio: number;        // Default: 0.3 (30% of companies)
  products: number;           // Default: 200
  ordersPerDay: number;       // Default: 50
  maintenanceVisitsPerWeek: number; // Default: 10
}
```

---

## Extending the System

### Adding a New Generator

1. Create generator file:
```typescript
// src/lib/mock-data-generator/engines/my-generator.ts
import { BaseGenerator } from './base-generator';

export class MyGenerator extends BaseGenerator<MyEntity> {
  getEntityName() { return 'myEntity'; }
  
  async generate(count: number): Promise<MyEntity[]> {
    // Implementation
  }
}
```

2. Register in orchestrator (`orchestrator.ts`):
```typescript
private async generateInOrder() {
  // ... existing generators
  await this.generateEntity('myEntity', count, MyGenerator);
}
```

3. Add to types (`types.ts`):
```typescript
export interface EntityRecordCounts {
  // ... existing
  myEntity: number;
}
```

### Adding a New Scenario

1. Add to built-in scenarios:
```typescript
// scenarios/scenario-manager.ts
const BUILT_IN_SCENARIOS = {
  // ... existing
  'my-scenario': {
    name: 'my-scenario',
    description: 'Description',
    entityRates: { ... },
    distributions: { ... },
    anomalyRate: 0.1,
  },
};
```

2. Or create at runtime:
```typescript
const manager = getScenarioManager();
manager.registerScenario(myScenarioProfile);
```

---

## Troubleshooting

### "Safety checks failed"
- Ensure `MOCK_DATA_ENABLED=true` in environment
- Ensure `NODE_ENV` is NOT `production`

### "Scenario not found"
- List available scenarios: `npx tsx scripts/mock-data-cli.ts scenarios`

### Low throughput
- Reduce batch size for small datasets
- Use `volumeMultiplier` to scale

### Memory issues
- Process in smaller batches
- Use streaming for large exports
