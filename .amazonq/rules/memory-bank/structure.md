# Project Structure

## Directory Organization

### Root Structure
```
firebase-orginal/
├── src/                    # Source code
├── public/                 # Static assets
├── docs/                   # Comprehensive documentation
├── .amazonq/              # Amazon Q AI rules and memory bank
├── .next/                 # Next.js build output
└── [config files]         # Project configuration
```

## Source Code Structure (`src/`)

### Application Layer (`src/app/`)
Next.js App Router structure with feature-based organization:

- **analytics/** - Analytics dashboards and reporting
- **baristas/** - Barista/staff management
- **clients/** - Client management with wizard-based forms
  - `_components/` - Client-specific components
  - `_wizard-steps/` - Multi-step form components
- **dashboard/** - Main dashboard and overview
- **feedback/** - Customer feedback management
- **maintenance/** - Equipment maintenance scheduling
- **notifications/** - Notification center and preferences
- **orders/** - Order processing and management
  - `_components/` - Order-specific components including CSV importer
- **payment-analytics/** - Payment insights and analytics
- **payments/** - Payment tracking and management
- **products/** - Product catalog management
- **settings/** - User and system settings
- **visits/** - Visit tracking and scheduling
- **login/**, **register/**, **reset-password/** - Authentication flows

### Component Layer (`src/components/`)
Reusable UI components organized by feature:

- **ui/** - shadcn/ui base components (buttons, dialogs, forms, charts, etc.)
- **layout/** - Layout components (sidebar, header, navigation)
- **notifications/** - Notification-specific components
- **orders/** - Order-related components
- **sentiment/** - Sentiment analysis components
- **settings/** - Settings UI components
- Root-level shared components (cards, dialogs, badges, etc.)

### Business Logic Layer (`src/lib/`)
Core utilities and services:

**Notification System:**
- `notification-service.ts` - Core notification management
- `notification-analytics.ts` - Basic analytics
- `notification-analytics-advanced.ts` - Advanced metrics
- `notification-priority-scorer.ts` - AI priority scoring
- `notification-insights.ts` - AI-powered insights
- `notification-automation.ts` - Workflow automation
- `notification-email-service.ts` - Email delivery
- `notification-push-service.ts` - Push notification delivery
- `notification-generator.ts` - Notification creation
- `notification-archive.ts` - Archive management
- `smart-notifications.ts` - Intelligent grouping

**Offline & Sync:**
- `offline-queue-manager.ts` - Offline operation queue
- `optimistic-update-manager.ts` - Optimistic UI updates
- `conflict-resolver.ts` - Conflict resolution logic
- `indexeddb-storage.ts` - Local storage management
- `service-worker-manager.ts` - Service worker integration

**Data Management:**
- `cache-manager.ts` - Multi-layer caching
- `analytics-cache.ts` - Analytics data caching
- `product-cache.ts` - Product data caching
- `file-import-utils.ts` - CSV/file import utilities
- `export-utils.ts` - Data export utilities

**Business Logic:**
- `payment-score.ts` - Payment scoring algorithm
- `payment-warnings.ts` - Payment alert logic
- `price-audit.ts` - Price validation
- `pricing-calculator.ts` - Dynamic pricing
- `performance-score.ts` - Performance metrics
- `auto-status.ts` - Automatic status updates
- `auto-tagging.ts` - AI-powered tagging

**Search & Utilities:**
- `search.ts` - Fuzzy search implementation
- `advanced-search.ts` - Advanced search features
- `order-search-sync.ts` - Search synchronization
- `utils.ts` - General utilities
- `types.ts` - TypeScript type definitions

**PDF Generation:**
- `pdf-invoice.ts` - Invoice generation
- `pdf-utils.ts` - PDF utilities with Arabic support

**External Services:**
- `supabase.ts` - Supabase client (legacy)
- `error-logger.ts` - Error tracking

### State Management (`src/store/`)
Zustand stores for global state:

- `use-order-store.ts` - Order state management
- `use-company-store.ts` - Client/company state
- `use-maintenance-store.ts` - Maintenance state
- `use-manufacturer-store.ts` - Manufacturer data
- `use-notification-store.ts` - Notification state
- `use-offline-queue-store.ts` - Offline queue state
- `use-conflict-store.ts` - Conflict resolution state
- `use-settings-store.ts` - User settings state

### Custom Hooks (`src/hooks/`)
Reusable React hooks:

- `use-auth.tsx` - Authentication hook
- `use-toast.ts` - Toast notification hook
- `use-mobile.tsx` - Mobile detection
- `use-online-status.ts` - Network status monitoring
- `use-offline-queue.ts` - Offline queue management
- `use-optimistic-mutation.ts` - Optimistic updates
- `use-cached-data.ts` - Data caching hook
- `use-service-worker.ts` - Service worker integration
- `use-pull-to-refresh.ts` - Pull-to-refresh gesture
- `use-swipe.ts` - Swipe gesture detection
- `use-keyboard-shortcuts.ts` - Keyboard shortcuts
- `use-toast-on-connection-change.ts` - Connection status toasts

### AI Layer (`src/ai/`)
Genkit AI flows and configuration:

- `flows/` - AI flow definitions
- `genkit.ts` - Genkit configuration
- `dev.ts` - Development server

### Services (`src/services/`)
External service integrations:

- `geocode-service.ts` - Geocoding API integration
- `storage-service.ts` - File storage service

## Public Assets (`public/`)

- `images/` - Image assets (markers, icons)
- `manifest.json` - PWA manifest
- `sw.js` - Service worker
- `offline.html` - Offline fallback page
- Map marker assets for Leaflet integration

## Documentation (`docs/`)

Comprehensive project documentation:

**Implementation Guides:**
- `COMPLETE_IMPLEMENTATION.md` - Full system overview
- `COMPLETE_FEATURES_LIST.md` - Feature inventory
- `APPLICATION_OVERVIEW.md` - Application architecture

**Notification System:**
- `notification-system.md` - Phase 1: Real-time & persistence
- `notification-phase2-ai-email.md` - Phase 2: AI & email
- `PHASE3_SUMMARY.md` - Phase 3: Multi-channel & analytics
- `notification-quick-reference.md` - Developer reference
- `notification-migration-guide.md` - Migration instructions

**Offline Mode:**
- `OFFLINE_MODE_COMPLETE.md` - Complete offline implementation
- `OFFLINE_MODE_PHASE1.md` through `OFFLINE_MODE_PHASE6.md` - Phase documentation

**Deployment:**
- `PRODUCTION_DEPLOYMENT.md` - Production deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `deployment-steps.md` - Step-by-step deployment
- `firestore-rules-notifications.md` - Firestore security rules

**Performance:**
- `performance-optimizations.md` - Optimization strategies
- `performance-monitoring.md` - Monitoring setup
- `OPTIMIZATION_COMPLETE.md` - Optimization summary

**Project Management:**
- `FINAL_HANDOFF.md` - Project completion summary
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview

## Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration (strict mode)
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `components.json` - shadcn/ui configuration
- `eslint.config.mjs` - ESLint rules
- `postcss.config.mjs` - PostCSS configuration
- `firebase.json` - Firebase configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `.env.example` - Environment variable template
- `Dockerfile` - Docker containerization
- `apphosting.yaml` - Firebase App Hosting config

## Architectural Patterns

### Feature-Based Organization
Each major feature (clients, orders, notifications) has:
- Dedicated app route folder
- Feature-specific components in `_components/`
- Zustand store for state management
- Utility functions in `lib/`
- Custom hooks in `hooks/`

### Layered Architecture
1. **Presentation Layer**: React components in `app/` and `components/`
2. **Business Logic Layer**: Services and utilities in `lib/`
3. **State Management Layer**: Zustand stores in `store/`
4. **Data Layer**: Firebase/Firestore integration
5. **AI Layer**: Genkit flows in `ai/`

### Separation of Concerns
- UI components are pure and reusable
- Business logic is centralized in `lib/`
- State management is isolated in stores
- API calls are abstracted in service layers
- Types are centralized in `lib/types.ts`

### Offline-First Design
- Local-first data with IndexedDB
- Optimistic UI updates
- Background synchronization
- Conflict resolution
- Service worker for caching

### Component Composition
- Small, single-purpose components
- Composition over inheritance
- Props-based configuration
- Render props and hooks for logic reuse
