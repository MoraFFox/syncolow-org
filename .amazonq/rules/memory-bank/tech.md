# Technology Stack

## Core Technologies

### Frontend Framework
- **Next.js 16.0.0** - React framework with App Router
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes
  - Turbopack for fast development builds
  - Development server on port 9002

### UI Library
- **React 18.3.1** - UI library
  - Functional components with hooks
  - Context API for state sharing
  - Concurrent features

### Language
- **TypeScript 5.x** - Type-safe JavaScript
  - Strict mode enabled
  - Target: ES2017
  - Path aliases: `@/*` → `./src/*`

### Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
  - Custom configuration in `tailwind.config.ts`
  - `tailwindcss-animate` for animations
  - `tailwind-merge` for class merging
  - `class-variance-authority` for component variants

### UI Components
- **shadcn/ui** - Radix UI-based component library
  - @radix-ui/react-* components (dialog, dropdown, select, etc.)
  - Customizable and accessible
  - Configuration in `components.json`

## Backend & Database

### Backend as a Service
- **Firebase/Firestore** - Real-time database and backend
  - Real-time subscriptions
  - Security rules in `firestore.rules`
  - Indexes in `firestore.indexes.json`
  - Authentication

### Alternative Backend
- **Supabase 2.83.0** - PostgreSQL-based backend
  - `@supabase/supabase-js` client library
  - Used alongside Firebase

## State Management

### Global State
- **Zustand 4.5.4** - Lightweight state management
  - Stores in `src/store/`
  - Immer 10.1.1 for immutable updates
  - No boilerplate, simple API

### Form State
- **React Hook Form 7.52.1** - Form state management
  - `@hookform/resolvers` for validation
  - Zod 3.23.8 for schema validation
  - Minimal re-renders

## AI & Intelligence

### AI Framework
- **Genkit 1.0.0** - AI application framework
  - `@genkit-ai/google-genai` for Google AI integration
  - AI flows in `src/ai/flows/`
  - Development server: `npm run genkit:watch`

### AI Services
- **Google Generative AI** - AI capabilities
  - Priority scoring
  - Sentiment analysis
  - Smart grouping
  - Insights generation

## Data Handling

### Search
- **Fuse.js 7.0.0** - Fuzzy search library
  - Client-side search
  - Advanced search capabilities

### Date Handling
- **date-fns 3.6.0** - Date utility library
  - Formatting and parsing
  - Date calculations

### File Processing
- **xlsx 0.18.5** - Excel file processing
  - Import/export functionality
- **papaparse 5.4.1** - CSV parsing
  - CSV import/export

### PDF Generation
- **jsPDF 3.0.3** - PDF generation
- **jspdf-autotable 5.0.2** - Table generation for PDFs

## UI Enhancements

### Visualization
- **Recharts 2.12.7** - Chart library
  - Analytics dashboards
  - Data visualization

### Maps
- **Leaflet 1.9.4** - Interactive maps
- **react-leaflet 4.2.1** - React wrapper for Leaflet
- **leaflet-defaulticon-compatibility** - Icon compatibility

### Drag & Drop
- **@dnd-kit/core 6.1.0** - Drag and drop
- **@dnd-kit/sortable 8.0.0** - Sortable lists

### Virtualization
- **@tanstack/react-virtual 3.13.12** - Virtual scrolling
  - Large list performance

### Carousel
- **embla-carousel-react 8.6.0** - Carousel component

### Other UI
- **react-dropzone 14.3.8** - File upload
- **react-signature-canvas 1.1.0-alpha.2** - Signature capture
- **react-day-picker 8.10.1** - Date picker
- **cmdk 1.0.0** - Command menu

## Utilities

### React Utilities
- **react-use 17.5.0** - React hooks collection
- **use-debounce 10.0.3** - Debounce hook

### Class Utilities
- **clsx 2.1.1** - Conditional class names

### Theme
- **next-themes 0.3.0** - Theme management (dark/light mode)

## Testing

### Unit Testing
- **Vitest 4.0.12** - Unit test framework
  - Fast, Vite-powered
  - Configuration in `vitest.config.ts`
  - Command: `npm run test`

### Testing Libraries
- **@testing-library/react 16.3.0** - React testing utilities
- **@testing-library/jest-dom 6.9.1** - DOM matchers
- **@testing-library/user-event 14.6.1** - User interaction simulation
- **jsdom 27.2.0** - DOM implementation

### E2E Testing
- **Playwright 1.56.1** - End-to-end testing
  - Configuration in `playwright.config.ts`
  - Tests in `e2e/`
  - Command: `npm run test:e2e`

## Development Tools

### Linting & Formatting
- **ESLint 9.0.0** - JavaScript/TypeScript linting
  - `@typescript-eslint/eslint-plugin 8.46.2`
  - `@typescript-eslint/parser 8.46.2`
  - `eslint-config-next 16.0.0`
  - Configuration in `eslint.config.mjs`
  - Command: `npm run lint`

### Build Tools
- **Turbopack** - Fast bundler (Next.js 16)
- **PostCSS 8.x** - CSS processing
- **@vitejs/plugin-react 5.1.1** - Vite React plugin

### Environment
- **dotenv 16.4.5** - Environment variable management
  - `.env` for local configuration
  - `.env.example` for template

## Type Definitions

### TypeScript Types
- `@types/node` - Node.js types
- `@types/react` - React types
- `@types/react-dom` - React DOM types
- `@types/leaflet` - Leaflet types
- `@types/papaparse` - PapaParse types
- `@types/react-signature-canvas` - Signature canvas types

## Development Commands

### Primary Commands
```bash
# Development server (port 9002, Turbopack)
npm run dev

# Genkit AI development server
npm run genkit:dev

# Genkit AI with watch mode
npm run genkit:watch

# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

### Firebase Commands
```bash
# Deploy to Firebase
firebase deploy

# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Firestore indexes only
firebase deploy --only firestore:indexes
```

## Build Configuration

### Next.js Configuration
- Module type: ESM (`"type": "module"`)
- Turbopack enabled for development
- Custom port: 9002
- Path aliases configured

### TypeScript Configuration
- Strict mode enabled
- Target: ES2017
- Module: ESNext
- Module resolution: Bundler
- JSX: react-jsx
- Incremental compilation
- Path aliases: `@/*` → `./src/*`

### Firebase Configuration
- Hosting configuration in `firebase.json`
- Firestore rules in `firestore.rules`
- Firestore indexes in `firestore.indexes.json`
- Project configuration in `.firebaserc`

## Browser Support

### Service Worker
- Custom service worker in `public/sw.js`
- Offline support
- Background sync
- Push notifications

### PWA Features
- Manifest in `public/manifest.json`
- Offline page in `public/offline.html`
- Service worker registration

## Performance Features

### Optimization Strategies
- Virtual scrolling for large lists
- Lazy loading for heavy components
- Dynamic imports for code splitting
- Caching strategies (IndexedDB, service worker)
- Optimistic updates for instant feedback
- Debouncing for search and input

### Monitoring
- Performance monitoring setup
- Error logging service
- Analytics tracking

## Version Requirements

### Node.js
- **Node.js 18+** required
- `.nvmrc` file specifies version

### Package Manager
- **npm** or **yarn** supported
- Lock file: `package-lock.json`

## Environment Variables

### Required Variables
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Application
NEXT_PUBLIC_APP_URL

# Email Service
SENDGRID_API_KEY or AWS_ACCESS_KEY_ID

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY

# AI Services
GOOGLE_GENAI_API_KEY
```

See `.env.example` for complete template.
