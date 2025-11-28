# Project Structure

## Directory Organization

### Root Structure
```
firebase-orginal/
├── src/                    # Source code
├── docs/                   # Comprehensive documentation
├── public/                 # Static assets and service worker
├── e2e/                    # End-to-end tests (Playwright)
├── scripts/                # Utility scripts
├── .amazonq/               # Amazon Q AI rules and memory bank
└── Configuration files     # Next.js, TypeScript, Firebase, etc.
```

## Source Code Structure (`src/`)

### Application Routes (`src/app/`)
Next.js 16 App Router structure with feature-based organization:

- **analytics/** - Analytics dashboards and metrics visualization
- **baristas/** - Barista/staff management
- **clients/** - Client management with wizard forms and branch handling
- **dashboard/** - Main dashboard with overview widgets
- **drilldown/** - Deep-dive analytics system
- **feedback/** - Customer feedback collection and management
- **health/** - System health monitoring
- **login/** - Authentication pages
- **maintenance/** - Maintenance scheduling and tracking
- **notifications/** - Notification center and preferences
- **orders/** - Order management and lifecycle
- **payment-analytics/** - Payment tracking and analytics
- **payments/** - Payment processing and history
- **products/** - Product catalog and inventory
- **profile/** - User profile management
- **register/** - User registration
- **reset-password/** - Password reset flow
- **sentiment/** - Sentiment analysis dashboard
- **settings/** - Application and user settings
- **visits/** - Visit tracking and management

Each route contains:
- `page.tsx` - Main page component
- `_components/` - Route-specific components (private)
- `layout.tsx` - Route-specific layouts (when needed)

### Components (`src/components/`)
Reusable UI components organized by feature:

- **ui/** - shadcn/ui components (Button, Dialog, Input, etc.)
- **dialogs/** - Reusable dialog components
- **drilldown/** - Drilldown system components
- **layout/** - Layout components (Sidebar, Header, etc.)
- **notifications/** - Notification-related components
- **orders/** - Order-related components
- **sentiment/** - Sentiment analysis components
- **settings/** - Settings UI components

### Core Libraries (`src/lib/`)
Business logic, utilities, and services:

**Notification System:**
- `notification-service.ts` - Core notification service
- `notification-analytics.ts` - Analytics tracking
- `notification-analytics-advanced.ts` - Advanced analytics
- `notification-archive.ts` - Archival system
- `notification-automation.ts` - Workflow automation
- `notification-email-service.ts` - Email delivery
- `notification-generator.ts` - Notification generation
- `notification-insights.ts` - AI insights
- `notification-priority-scorer.ts` - Priority calculation
- `notification-push-service.ts` - Push notifications
- `smart-notifications.ts` - Smart grouping

**Core Utilities:**
- `types.ts` - TypeScript type definitions
- `utils.ts` - General utilities
- `supabase.ts` - Firebase/Supabase client configuration

**Business Logic:**
- `payment-score.ts` - Payment scoring algorithm
- `payment-warnings.ts` - Payment warning system
- `price-audit.ts` - Price auditing
- `pricing-calculator.ts` - Pricing calculations
- `auto-status.ts` - Automatic status updates
- `auto-tagging.ts` - Automatic tagging

**Data Management:**
- `cache-manager.ts` - Caching strategies
- `analytics-cache.ts` - Analytics caching
- `product-cache.ts` - Product caching
- `indexeddb-storage.ts` - IndexedDB wrapper
- `offline-queue-manager.ts` - Offline queue
- `optimistic-update-manager.ts` - Optimistic updates
- `conflict-resolver.ts` - Conflict resolution

**Search & Export:**
- `search.ts` - Search functionality
- `advanced-search.ts` - Advanced search
- `order-search-sync.ts` - Order search sync
- `export-utils.ts` - Data export utilities
- `file-import-utils.ts` - File import utilities

**PDF Generation:**
- `pdf-invoice.ts` - Invoice PDF generation
- `pdf-utils.ts` - PDF utilities

**Analytics:**
- `drilldown-types.ts` - Drilldown type definitions
- `drilldown-registry.tsx` - Drilldown registry
- `performance-score.ts` - Performance scoring

**Error Handling:**
- `error-logger.ts` - Error logging service

### State Management (`src/store/`)
Zustand stores for global state:

- `use-company-store.ts` - Company/client state
- `use-conflict-store.ts` - Conflict resolution state
- `use-drilldown-store.ts` - Drilldown state
- `use-maintenance-store.ts` - Maintenance state
- `use-manufacturer-store.ts` - Manufacturer state
- `use-notification-store.ts` - Notification state
- `use-offline-queue-store.ts` - Offline queue state
- `use-order-store.ts` - Order state
- `use-settings-store.ts` - Settings state

### Custom Hooks (`src/hooks/`)
Reusable React hooks:

- `use-auth.tsx` - Authentication hook
- `use-cached-data.ts` - Data caching hook
- `use-drilldown.ts` - Drilldown functionality
- `use-keyboard-shortcuts.ts` - Keyboard shortcuts
- `use-mobile.tsx` - Mobile detection
- `use-offline-queue.ts` - Offline queue management
- `use-online-status.ts` - Online/offline status
- `use-optimistic-mutation.ts` - Optimistic updates
- `use-pull-to-refresh.ts` - Pull-to-refresh gesture
- `use-service-worker.ts` - Service worker integration
- `use-swipe.ts` - Swipe gestures
- `use-toast.ts` - Toast notifications
- `use-toast-on-connection-change.ts` - Connection status toasts

### AI Integration (`src/ai/`)
Genkit AI flows and configuration:

- `genkit.ts` - Genkit configuration
- `dev.ts` - Development server
- `flows/` - AI flow definitions

### Services (`src/services/`)
External service integrations:

- `geocode-service.ts` - Geocoding service
- `storage-service.ts` - Storage service

### Testing (`src/test/`)
Test utilities and setup:

- `setup.ts` - Test configuration
- `fixtures/` - Test fixtures
- `__tests__/` - Unit tests (co-located with source files)

## Documentation Structure (`docs/`)

### Getting Started
- `COMPLETE_IMPLEMENTATION.md` - Full system overview
- `notification-quick-reference.md` - Developer quick reference
- `PRODUCTION_DEPLOYMENT.md` - Deployment guide
- `FINAL_HANDOFF.md` - Project completion summary

### Feature Documentation
- `notification-system.md` - Phase 1: Real-time & Persistence
- `notification-phase2-ai-email.md` - Phase 2: AI & Email
- `PHASE3_SUMMARY.md` - Phase 3: Multi-Channel & Analytics
- `DRILLDOWN_SYSTEM.md` - Drilldown analytics
- `OFFLINE_MODE_*.md` - Offline mode phases

### Reference
- `notification-migration-guide.md` - Migration guide
- `firestore-rules-notifications.md` - Firestore security rules
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `APPLICATION_OVERVIEW.md` - Application overview
- `COMPLETE_FEATURES_LIST.md` - Complete features list

## Architectural Patterns

### 1. Feature-Based Organization
Routes and components organized by business feature, not technical layer. Each feature contains its own components, logic, and types.

### 2. Separation of Concerns
- **Presentation**: React components in `app/` and `components/`
- **Business Logic**: Pure functions in `lib/`
- **State Management**: Zustand stores in `store/`
- **Side Effects**: Custom hooks in `hooks/`

### 3. Component Hierarchy
```
App Layout (layout.tsx)
├── Route Pages (page.tsx)
│   ├── Public Components (components/)
│   └── Private Components (_components/)
└── Shared UI (components/ui/)
```

### 4. Data Flow
```
User Action → Hook → Store → Service → Firebase
                ↓
            Component Update
```

### 5. Offline-First Architecture
```
User Action → Optimistic Update → UI Update
                ↓
            Offline Queue → Background Sync → Firebase
                ↓
            Conflict Resolution (if needed)
```

## Key Relationships

### Notification System Flow
```
Event Trigger → notification-generator.ts
    ↓
notification-priority-scorer.ts (AI scoring)
    ↓
notification-service.ts (persistence)
    ↓
Multi-channel delivery:
├── In-app (use-notification-store.ts)
├── Email (notification-email-service.ts)
└── Push (notification-push-service.ts)
    ↓
notification-analytics.ts (tracking)
```

### Order Management Flow
```
Order Creation (orders/page.tsx)
    ↓
use-order-store.ts (state)
    ↓
Optimistic Update (use-optimistic-mutation.ts)
    ↓
Firebase Sync
    ↓
Notification Generation
```

### Offline Sync Flow
```
Offline Action → offline-queue-manager.ts
    ↓
IndexedDB Storage (indexeddb-storage.ts)
    ↓
Online Detection (use-online-status.ts)
    ↓
Background Sync (service-worker-manager.ts)
    ↓
Conflict Resolution (conflict-resolver.ts)
```

## Configuration Files

- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration (strict mode)
- `tailwind.config.ts` - Tailwind CSS configuration
- `firebase.json` - Firebase configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `vitest.config.ts` - Vitest test configuration
- `playwright.config.ts` - Playwright E2E configuration
- `eslint.config.mjs` - ESLint configuration
- `components.json` - shadcn/ui configuration
