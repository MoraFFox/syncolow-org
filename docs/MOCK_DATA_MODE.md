# Mock Data Mode - Complete Usage Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup Guide](#setup-guide)
4. [Environment Configuration](#environment-configuration)
5. [Generating Mock Data](#generating-mock-data)
6. [CLI Commands](#cli-commands)
7. [Switching Between Modes](#switching-between-modes)
8. [Scenario Profiles](#scenario-profiles)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Overview

Mock Data Mode allows SynergyFlow ERP to display **mock/test data** instead of production data. This is useful for:

- **Development**: Work without affecting real data
- **Demos**: Show realistic data to clients
- **Testing**: Test features with predictable data
- **Training**: Train new users without risk

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SynergyFlow ERP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   USE_MOCK_DATA=false          USE_MOCK_DATA=true           │
│         ↓                            ↓                      │
│   ┌─────────────┐              ┌─────────────┐              │
│   │   public    │              │  mock_data  │              │
│   │   schema    │              │   schema    │              │
│   │ (production)│              │   (test)    │              │
│   └─────────────┘              └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Production Mode** (`USE_MOCK_DATA=false`): App reads from `public` schema
- **Mock Mode** (`USE_MOCK_DATA=true`): App reads from `mock_data` schema

---

## Quick Start

### 1. Set Up Database Schema (One Time)

Run the following SQL in your Supabase Dashboard (SQL Editor):

```sql
-- Create mock_data schema with all tables
CREATE SCHEMA IF NOT EXISTS mock_data;

-- Clone essential tables
CREATE TABLE IF NOT EXISTS mock_data.users (LIKE public.users INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.companies (LIKE public.companies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.branches (LIKE public.branches INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.contacts (LIKE public.contacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.products (LIKE public.products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.orders (LIKE public.orders INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data."orderItems" (LIKE public."orderItems" INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data."maintenanceVisits" (LIKE public."maintenanceVisits" INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.payments (LIKE public.payments INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.returns (LIKE public.returns INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data."auditLogs" (LIKE public."auditLogs" INCLUDING ALL);

-- Grant permissions
GRANT USAGE ON SCHEMA mock_data TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mock_data TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mock_data TO anon, authenticated, service_role;
```

### 2. Configure Environment

Add to your `.env` file:

```env
# Enable mock data generation (allows running the generator)
MOCK_DATA_ENABLED=true

# Enable mock data display mode (app reads from mock_data schema)
# NOTE: Must use NEXT_PUBLIC_ prefix for client-side access
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### 3. Generate Mock Data

```bash
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --no-dry-run
```

### 4. Restart Server & Clear Cache

1. Stop current server (Ctrl+C)
2. Run `npm run dev`
3. **IMPORTANT**: Clear your browser's Local Storage or open in Incognito/Private window to avoid seeing cached production data.

### 5. View Mock Data

Open http://localhost:3001 - you should see mock data!

---

## Setup Guide

### Prerequisites

1. **Supabase Project** with database access
2. **Node.js** 18+ installed
3. **Environment Variables** configured

### Step-by-Step Database Setup

#### Option A: Run Full Migration (Recommended)

The complete migration file is at `supabase-migrations/create_mock_data_schema.sql`:

1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `create_mock_data_schema.sql`
3. Click "Run"

#### Option B: Use Supabase CLI

```bash
# If you have Supabase CLI configured
supabase db push
```

#### Option C: Manual Table Creation

Create tables one by one in SQL Editor:

```sql
-- Example: Create companies table in mock_data schema
CREATE TABLE mock_data.companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    area text,
    region text DEFAULT 'A',
    -- ... other columns matching public.companies
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Values |
|----------|-------------|--------|
| `MOCK_DATA_ENABLED` | Allows mock data generation | `true` / `false` |
| `USE_MOCK_DATA` | App reads from mock_data schema | `true` / `false` |
| `NODE_ENV` | Environment (blocks mock in production) | `development` |

### Example `.env` Configuration

```env
# === Database ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === Mock Data Mode ===
MOCK_DATA_ENABLED=true    # Allow generation
USE_MOCK_DATA=true        # Display mock data
NODE_ENV=development      # Required for safety
```

### Safety Note

⚠️ **Production Protection**: Mock data mode is automatically disabled in production:
- `USE_MOCK_DATA` is ignored when `NODE_ENV=production`
- This prevents accidentally showing mock data to real users

---

## Generating Mock Data

### Using the CLI

```bash
# Basic generation (dry-run by default)
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops

# Generate and write to database
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --no-dry-run

# Custom date range
npx tsx scripts/mock-data-cli.ts generate \
  --scenario peak-season \
  --from 2024-01-01 \
  --to 2024-06-30 \
  --no-dry-run

# With custom seed (reproducible data)
npx tsx scripts/mock-data-cli.ts generate \
  --scenario normal-ops \
  --seed 12345 \
  --no-dry-run

# Scale volume (2x data)
npx tsx scripts/mock-data-cli.ts generate \
  --scenario normal-ops \
  --multiplier 2 \
  --no-dry-run
```

### Generation Options

| Option | Default | Description |
|--------|---------|-------------|
| `--scenario` | `normal-ops` | Scenario profile to use |
| `--from` | 30 days ago | Start date (YYYY-MM-DD) |
| `--to` | Today | End date (YYYY-MM-DD) |
| `--seed` | Random | Seed for reproducible data |
| `--multiplier` | 1 | Volume multiplier |
| `--dry-run` | true | Don't write to database |
| `--no-dry-run` | - | Write to database |

### What Gets Generated

| Entity | Default Count | Description |
|--------|---------------|-------------|
| Users | 20 | Staff accounts with roles |
| Companies | 100 | Client companies |
| Branches | ~30 | Company branches (30% ratio) |
| Products | 200 | Coffee/beverage products |
| Orders | ~50/day | Customer orders |
| Payments | Based on orders | Payment records |
| Maintenance | ~10/week | Service visits |
| Audit Logs | Per entity | Change history |

---

## CLI Commands

### List All Commands

```bash
npx tsx scripts/mock-data-cli.ts --help
```

### Available Commands

#### `generate` - Generate Mock Data
```bash
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --no-dry-run
```

#### `scenarios` - List Available Scenarios
```bash
npx tsx scripts/mock-data-cli.ts scenarios
```

Output:
```
📋 Available Scenarios

  normal-ops
    Standard business operations with typical patterns

  peak-season
    High-volume holiday/peak season simulation

  anomaly-heavy
    Stress testing with high anomaly rate

  warehouse-outage
    Simulates warehouse disruption scenario

  growth-phase
    Rapid business growth with increasing orders

  payment-crisis
    High payment delays and overdue rates

Total: 6 scenarios
```

#### `validate` - Validate a Scenario
```bash
npx tsx scripts/mock-data-cli.ts validate --scenario peak-season
```

#### `status` - Check Job Status (requires server)
```bash
npx tsx scripts/mock-data-cli.ts status --job <job-id>
```

#### `cleanup` - Remove All Mock Data (requires server)
```bash
npx tsx scripts/mock-data-cli.ts cleanup --confirm
```

#### `toggle` - Enable/Disable Generation (requires server)
```bash
npx tsx scripts/mock-data-cli.ts toggle --enable
npx tsx scripts/mock-data-cli.ts toggle --disable
```

---

## Switching Between Modes

### Switch to Mock Data

1. Edit `.env`:
   ```env
   USE_MOCK_DATA=true
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. Verify in console - you'll see:
   ```
   🎭 Mock Data Mode ENABLED - Reading from mock_data schema
   ```

### Switch to Production Data

1. Edit `.env`:
   ```env
   USE_MOCK_DATA=false
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

### Check Current Mode

In browser console or server logs, look for:
- `🎭 Mock Data Mode ENABLED` = Using mock data
- No message = Using production data

---

## Scenario Profiles

### 1. `normal-ops` (Default)
- **Anomaly Rate**: 5%
- **Use Case**: Standard development/testing
- **Characteristics**: 
  - 50 orders/day
  - 80% orders delivered
  - 5% payment issues

### 2. `peak-season`
- **Anomaly Rate**: 15%
- **Use Case**: Holiday simulation
- **Characteristics**: 
  - 150 orders/day (3x normal)
  - Higher payment delays
  - More delivery issues

### 3. `anomaly-heavy`
- **Anomaly Rate**: 40%
- **Use Case**: Stress testing
- **Characteristics**: 
  - Many payment delays
  - High cancellation rate
  - Delivery failures

### 4. `warehouse-outage`
- **Anomaly Rate**: 60%
- **Use Case**: Disaster recovery testing
- **Characteristics**: 
  - Few deliveries
  - Stock shortages
  - High cancellation rate

### 5. `growth-phase`
- **Anomaly Rate**: 8%
- **Use Case**: Business growth simulation
- **Characteristics**: 
  - 200 companies (2x)
  - 80 orders/day
  - More products

### 6. `payment-crisis`
- **Anomaly Rate**: 25%
- **Use Case**: Financial stress testing
- **Characteristics**: 
  - 30% overdue payments
  - High pending rate

---

## Troubleshooting

### "Failed to connect to API"
**Cause**: Server not running  
**Fix**: Start the dev server first
```bash
npm run dev
# Then run CLI command in another terminal
```

### "App shows no data"
**Cause**: Mock data not generated  
**Fix**: Generate data first
```bash
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --no-dry-run
```

### "Still seeing production data"
**Cause**: Environment variable not loaded  
**Fix**: 
1. Check `.env` has `USE_MOCK_DATA=true`
2. Restart the dev server (env changes require restart)
3. Check server console for "Mock Data Mode ENABLED" message

### "Schema mock_data does not exist"
**Cause**: Database migration not run  
**Fix**: Run the SQL migration in Supabase Dashboard

### "Permission denied on mock_data"
**Cause**: Missing schema permissions  
**Fix**: Run:
```sql
GRANT USAGE ON SCHEMA mock_data TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mock_data TO anon, authenticated, service_role;
```

### "Safety checks failed"
**Cause**: `MOCK_DATA_ENABLED` not set  
**Fix**: Add to `.env`:
```env
MOCK_DATA_ENABLED=true
```

---

## FAQ

### Q: Is my production data safe?
**A**: Yes! Mock data is stored in a completely separate `mock_data` schema. Production data in `public` schema is never touched.

### Q: Can I use mock mode in production?
**A**: No. Mock mode is automatically disabled when `NODE_ENV=production`. This is a safety feature.

### Q: How do I reset mock data?
**A**: Use the cleanup command:
```bash
npx tsx scripts/mock-data-cli.ts cleanup --confirm
```
Then regenerate:
```bash
npx tsx scripts/mock-data-cli.ts generate --scenario normal-ops --no-dry-run
```

### Q: Can I customize generated data?
**A**: Yes! You can:
1. Create custom scenarios
2. Modify entity generators in `src/lib/mock-data-generator/engines/`
3. Adjust distributions in scenario profiles

### Q: How much data is generated?
**A**: Depends on the scenario and date range. For `normal-ops` with 30 days:
- ~20 users
- ~100 companies
- ~1,500 orders
- ~200 products
- ~thousands of order items

### Q: Does mock data have foreign key relationships?
**A**: Yes! All relationships are maintained:
- Orders reference valid companies
- Order items reference valid products
- Payments reference valid orders
- etc.

---

## Related Documentation

- [MOCK_DATA_GENERATOR.md](./MOCK_DATA_GENERATOR.md) - Full system documentation
- [supabase-migrations/create_mock_data_schema.sql](../supabase-migrations/create_mock_data_schema.sql) - Database migration
