# ♊ SynergyFlow ERP - Project Context

This file provides the essential context, architectural overview, and development guidelines for the SynergyFlow ERP project.

**Last Updated:** 2025-12-30

## 1. Project Overview

SynergyFlow ERP is an AI-powered enterprise resource planning system built with Next.js 16. It features a robust notification system, AI intelligence (Genkit), multi-channel delivery (In-app, Email, Push), and comprehensive offline-first capabilities. The system is designed for high scalability and real-time updates using Supabase.

**Version:** 0.1.0 (Active Development)

### Key Capabilities
- **Order Management**: Multi-step wizard, CSV import, bulk operations, Kanban views
- **Client Management**: Hierarchical companies/branches, payment scoring, status tracking
- **Product Catalog**: Variants, inventory tracking, stock alerts
- **Maintenance System**: Visit scheduling, spare parts, cost tracking, follow-ups
- **Notification System**: 17 notification types, AI priority scoring, multi-channel delivery
- **Analytics**: Payment analytics, order trends, client insights, visual exports
- **Drilldown System**: Context-aware data previews with hover/keyboard navigation
- **Offline Mode**: Service worker, IndexedDB caching, optimistic updates

## 2. Technology Stack

### Core
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | App Router framework |
| React | 18.3.1 | UI library |
| TypeScript | 5.7.2 | Type safety (strict mode) |
| Tailwind CSS | 3.4.1 | Styling |
| shadcn/ui | Latest | Component library (Radix-based) |

### State & Data
| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 4.5.4 | Global state management |
| TanStack Query | 5.90.11 | Server state, caching, mutations |
| Immer | 10.1.1 | Immutable state updates |
| Zod | 3.23.8 | Runtime validation |
| Fuse.js | 7.0.0 | Fuzzy search |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| Supabase | Primary database (PostgreSQL) & auth |
| Firebase | Secondary services (Firestore for notifications) |
| Genkit AI + Google GenAI | AI-powered features |

### UI Enhancements
| Technology | Purpose |
|------------|---------|
| Framer Motion | Animations |
| Recharts | Charts and visualizations |
| React Grid Layout | Drag-and-drop dashboard builder |
| dnd-kit | Sortable/draggable interfaces |
| Leaflet / Google Maps | Map integrations |

### Testing
| Technology | Purpose |
|------------|---------|
| Vitest | Unit & integration tests |
| Playwright | End-to-end tests |
| Testing Library | Component testing utilities |

### Utilities
| Technology | Purpose |
|------------|---------|
| date-fns | Date manipulation |
| jsPDF + autoTable | PDF generation |
| html2canvas | Visual exports |
| Papa Parse | CSV parsing |
| xlsx | Excel file handling |

## 3. Project Structure

```
d:\My projects\firebase-orginal\
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions/           # Server Actions
│   │   ├── analytics/         # Analytics dashboard (20 files)
│   │   ├── api/               # API Routes (31 endpoints)
│   │   ├── clients/           # Client management (36 files)
│   │   ├── dashboard/         # Main dashboard (25 files)
│   │   ├── drilldown/         # Drilldown system (13 files)
│   │   ├── maintenance/       # Maintenance module (27 files)
│   │   ├── notifications/     # Notification center
│   │   ├── orders/            # Order management (27 files)
│   │   ├── payments/          # Payment tracking (10 files)
│   │   ├── products/          # Product catalog (23 files)
│   │   ├── settings/          # App settings (22 files)
│   │   └── visits/            # Visit scheduling (7 files)
│   ├── components/            # Reusable components (167 files)
│   │   ├── analytics/         # Analytics widgets (29 files)
│   │   ├── drilldown/         # Drilldown components (37 files)
│   │   ├── layout/            # Layout components (16 files)
│   │   └── ui/                # shadcn/ui components (60 files)
│   ├── hooks/                 # Custom React hooks (35 files)
│   ├── lib/                   # Utilities & services (73+ files)
│   │   ├── cache/             # Caching infrastructure (19 files)
│   │   ├── drilldown/         # Drilldown logic (14 files)
│   │   ├── logger-transports/ # Logging backends (8 files)
│   │   └── mock-data-generator/ # Test data generation (31 files)
│   ├── services/              # Business services (7 files)
│   ├── store/                 # Zustand stores (17 stores)
│   └── types/                 # TypeScript definitions (4 files)
├── docs/                      # Documentation (75 files)
├── e2e/                       # Playwright tests (11 files)
├── scripts/                   # Build & utility scripts (15 files)
├── supabase-migrations/       # Database migrations (13 files)
└── public/                    # Static assets
```

## 4. Key Zustand Stores

| Store | Purpose |
|-------|---------|
| `use-order-store` | Order CRUD, filtering, payment tracking |
| `use-company-store` | Companies & branches management |
| `use-products-store` | Product catalog & inventory |
| `use-maintenance-store` | Maintenance visits & crew |
| `use-notification-store` | Notification state & actions |
| `use-sales-account-store` | Sales account management |
| `use-categories-store` | Product categories |
| `use-manufacturer-store` | Manufacturer management |
| `use-drilldown-store` | Drilldown preview state |
| `use-settings-store` | User preferences |
| `use-offline-queue-store` | Offline action queue |
| `use-conflict-store` | Conflict resolution |

## 5. Development Workflow

### Key Commands
| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server (port **3001**) |
| `npm run genkit:watch` | Start Genkit AI flows in watch mode |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint validation |
| `npm run ci` | Full CI pipeline (lint → test → typecheck → build) |

### Setup Instructions
1. **Environment**: Copy `.env.example` to `.env` and configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_GENAI_API_KEY`
   - Firebase configuration
2. **Install**: `npm install`
3. **Run**: `npm run dev`

## 6. API Routes Structure

```
/api/
├── analytics/          # Analytics data endpoints
├── areas/              # Area management
├── categories/         # Product categories
├── companies/          # Company CRUD
├── drilldown/          # Drilldown data fetching
├── feedback/           # Customer feedback
├── geocode/            # Location services
├── google-tasks/       # Google Tasks integration
├── health/             # Health checks
├── maintenance/        # Maintenance operations
├── manufacturers/      # Manufacturer management
├── mock-data/          # Mock data generation
├── notification-analytics/ # Notification metrics
├── notifications/      # Notification CRUD
├── orders/             # Order operations
├── products/           # Product catalog
├── sales-accounts/     # Sales account management
├── settings/           # User settings
├── taxes/              # Tax management
└── visits/             # Visit scheduling
```

## 7. Offline Infrastructure

The app implements a comprehensive offline-first architecture:

1. **Service Worker**: Background sync, cache management
2. **IndexedDB**: Local data persistence via `idb` library
3. **Optimistic Updates**: Immediate UI feedback with rollback
4. **Conflict Resolution**: Server-first merge strategy with UI prompts
5. **Cache Policies**: 5-minute stale time, 24-hour garbage collection

## 8. Distributed Tracing

All requests are traced with correlation IDs:

- **API Routes**: Wrapped with `withTraceContext`
- **Server Actions**: Wrapped with `withServerActionTrace`
- **Logger**: All logs include `traceId` and `correlationId`

## 9. Documentation Index

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | AI agent coding rules |
| `docs/COMPLETE_FEATURES_LIST.md` | Full feature documentation |
| `docs/notification-system.md` | Notification architecture |
| `docs/PRODUCTION_DEPLOYMENT.md` | Deployment guide |
| `docs/caching-policies.md` | Cache strategy documentation |
| `docs/logging-guide.md` | Logging best practices |
| `ShadCN-context.md` | UI component inventory |

## 10. Critical Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/lib/types.ts` | Core TypeScript interfaces |
| `src/lib/logger.ts` | Centralized logging |
| `src/lib/notification-service.ts` | Notification management |
| `src/store/use-order-store.ts` | Primary order state (~37K bytes) |
| `src/middleware.ts` | Request middleware & auth |
| `src/app/layout.tsx` | Root layout with providers |

## 11. Recent Major Features

Based on conversation history:

1. **Payment System Fixes**: Non-batched fetching, bulk payment actions
2. **Analytics Enhancements**: Category analytics, sales account filtering
3. **Caching System**: Cache warming, invalidation engine, prefetching
4. **Logging Refactoring**: Structured logging, sensitive field redaction
5. **Drilldown System**: Context-aware previews, hover/keyboard navigation
6. **Visual PDF Exports**: Charts and analytics in PDF reports
7. **Dashboard Builder**: Drag-and-drop widget layout (stabilized)
8. **Trace Context**: Distributed tracing across all routes/actions
