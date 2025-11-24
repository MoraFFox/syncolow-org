# Technology Stack

## Core Technologies

### Frontend Framework
- **Next.js 16.0.0** - React framework with App Router
  - Server Components and Client Components
  - File-based routing
  - API routes
  - Image optimization
  - Turbopack for fast development builds

### Language
- **TypeScript 5.x** - Strict mode enabled
  - Target: ES2017
  - Strict type checking
  - Path aliases: `@/*` → `./src/*`
  - JSX: react-jsx

### UI Framework
- **React 18.3.1** - UI library
  - Functional components
  - Hooks-based architecture
  - Context API for global state
  - Concurrent features

## State Management

### Global State
- **Zustand 4.5.4** - Lightweight state management
  - Minimal boilerplate
  - TypeScript-first
  - Immer integration for immutable updates
  - Devtools support

### Form State
- **React Hook Form 7.52.1** - Form management
  - Uncontrolled components
  - Validation with Zod
  - `@hookform/resolvers` for schema validation

## UI Component Library

### Base Components
- **shadcn/ui** - Accessible component system
  - Built on Radix UI primitives
  - Customizable with Tailwind CSS
  - Copy-paste component model

### Radix UI Primitives
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-select` - Select inputs
- `@radix-ui/react-toast` - Toast notifications
- `@radix-ui/react-tabs` - Tab navigation
- `@radix-ui/react-switch` - Toggle switches
- `@radix-ui/react-checkbox` - Checkboxes
- `@radix-ui/react-radio-group` - Radio buttons
- `@radix-ui/react-slider` - Range sliders
- `@radix-ui/react-progress` - Progress bars
- `@radix-ui/react-scroll-area` - Custom scrollbars
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-popover` - Popovers
- `@radix-ui/react-accordion` - Accordions
- `@radix-ui/react-alert-dialog` - Alert dialogs
- `@radix-ui/react-avatar` - Avatar components
- `@radix-ui/react-label` - Form labels
- `@radix-ui/react-menubar` - Menu bars
- `@radix-ui/react-separator` - Dividers
- `@radix-ui/react-toggle-group` - Toggle groups

## Styling

### CSS Framework
- **Tailwind CSS 3.4.1** - Utility-first CSS
  - Custom configuration in `tailwind.config.ts`
  - `tailwindcss-animate` for animations
  - `tailwind-merge` for class merging
  - `class-variance-authority` for variant management
  - `clsx` for conditional classes

### Theming
- **next-themes 0.3.0** - Dark mode support
  - System preference detection
  - Persistent theme selection
  - No flash of unstyled content

## Backend & Database

### Backend as a Service
- **Firebase** - Complete backend solution
  - Firestore for real-time database
  - Authentication
  - Cloud Storage
  - Hosting
  - Security rules in `firestore.rules`
  - Indexes in `firestore.indexes.json`

### Legacy Database (Migration)
- **Supabase 2.83.0** - PostgreSQL backend
  - Currently being migrated from
  - Client in `lib/supabase.ts`

## AI & Intelligence

### AI Framework
- **Genkit 1.0.0** - Google's AI framework
  - Flow-based AI operations
  - `@genkit-ai/google-genai` for Google AI integration
  - Development server: `genkit start`
  - Watch mode: `genkit start -- tsx --watch`

### AI Capabilities
- Priority scoring for notifications
- Sentiment analysis for feedback
- Smart notification grouping
- Auto-tagging and categorization
- Predictive insights

## Data Visualization

### Charts
- **Recharts 2.12.7** - React charting library
  - Line charts, bar charts, pie charts
  - Responsive design
  - Custom tooltips and legends

### Virtual Scrolling
- **@tanstack/react-virtual 3.13.12** - Virtual scrolling
  - Performance optimization for large lists
  - Smooth scrolling experience

## Data Processing

### File Handling
- **xlsx 0.18.5** - Excel file processing
  - Read/write Excel files
  - CSV conversion
- **papaparse 5.4.1** - CSV parsing
  - Streaming support
  - Error handling
- **react-dropzone 14.3.8** - File upload
  - Drag-and-drop interface
  - File validation

### PDF Generation
- **jspdf 3.0.3** - PDF creation
- **jspdf-autotable 5.0.2** - Table generation
  - Arabic text support (Amiri font)
  - Invoice generation
  - Report generation

## Search & Filtering

### Search Engine
- **Fuse.js 7.0.0** - Fuzzy search
  - Approximate string matching
  - Configurable threshold
  - Multi-field search

## Maps & Geolocation

### Mapping Library
- **Leaflet 1.9.4** - Interactive maps
- **react-leaflet 4.2.1** - React wrapper
- **leaflet-defaulticon-compatibility 0.1.2** - Icon compatibility
  - OpenStreetMap integration
  - Custom markers
  - Geocoding service integration

## Utilities

### Date Handling
- **date-fns 3.6.0** - Date utilities
  - Formatting
  - Parsing
  - Calculations

### Debouncing
- **use-debounce 10.0.3** - Debounce hook
  - Search optimization
  - Performance improvement

### React Utilities
- **react-use 17.5.0** - React hooks collection
  - useLocalStorage
  - useDebounce
  - useAsync
  - Many more utility hooks

### Command Palette
- **cmdk 1.0.0** - Command menu
  - Keyboard-driven interface
  - Fuzzy search

### Drag & Drop
- **@dnd-kit/core 6.1.0** - Drag and drop
- **@dnd-kit/sortable 8.0.0** - Sortable lists
  - Reorderable lists
  - Accessible

### Carousel
- **embla-carousel-react 8.6.0** - Carousel component
  - Touch-friendly
  - Responsive

### Signature
- **react-signature-canvas 1.1.0-alpha.2** - Digital signatures
  - Touch and mouse support
  - Export to image

### Day Picker
- **react-day-picker 8.10.1** - Date picker
  - Range selection
  - Customizable

## Validation

### Schema Validation
- **Zod 3.23.8** - TypeScript-first schema validation
  - Runtime type checking
  - Form validation
  - API validation

## Development Tools

### Linting & Formatting
- **ESLint 9.0.0** - JavaScript/TypeScript linter
  - `@typescript-eslint/eslint-plugin 8.46.2`
  - `@typescript-eslint/parser 8.46.2`
  - `eslint-config-next 16.0.0`
  - Max warnings: 0 (strict)

### Type Checking
- **TypeScript Compiler** - Type checking
  - `tsc --noEmit` for validation
  - Strict mode enabled

### Build Tools
- **Turbopack** - Fast bundler (Next.js 16)
- **PostCSS 8.x** - CSS processing

## Environment & Configuration

### Environment Variables
- **dotenv 16.4.5** - Environment variable management
  - `.env` for local development
  - `.env.example` for template

### Configuration Files
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind configuration
- `components.json` - shadcn/ui configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS configuration

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
npm start

# Lint with strict mode (max warnings: 0)
npm run lint

# Type checking
npm run typecheck
```

### Testing
- **Vitest** - Unit testing framework (referenced in docs)
  - Fast execution
  - Jest-compatible API
  - TypeScript support

## Deployment

### Hosting
- **Firebase Hosting** - Static hosting
  - CDN distribution
  - SSL certificates
  - Custom domains

### Containerization
- **Docker** - Container support
  - `Dockerfile` for containerization
  - `.dockerignore` for optimization

### CI/CD
- **Firebase App Hosting** - Automated deployment
  - `apphosting.yaml` configuration
  - GitHub integration

## Browser APIs

### Service Worker
- Custom service worker in `public/sw.js`
- Background sync
- Cache management
- Offline support

### IndexedDB
- Local data persistence
- Offline queue storage
- Cache storage

### Push Notifications
- Web Push API
- VAPID keys for authentication
- Multi-channel delivery

## Node.js Version

### Runtime
- **Node.js 18+** - Required version
  - Specified in `.nvmrc`
  - ES2017 target compatibility

## Type Definitions

### Custom Types
- `src/types/xlsx.d.ts` - XLSX type definitions
- `src/lib/types.ts` - Application types

### Third-Party Types
- `@types/node` - Node.js types
- `@types/react` - React types
- `@types/react-dom` - React DOM types
- `@types/leaflet` - Leaflet types
- `@types/papaparse` - PapaParse types
- `@types/react-signature-canvas` - Signature canvas types
