# Project Structure

## Directory Organization

### `/src/app` - Next.js App Router
Application pages and routes following Next.js 16 conventions:
- `analytics/` - Business analytics and reporting dashboards
- `baristas/` - Barista/technician management
- `clients/` - Client management and CRM features
- `dashboard/` - Main dashboard and overview
- `feedback/` - Customer feedback collection
- `maintenance/` - Maintenance scheduling and tracking
- `notifications/` - Notification center
- `orders/` - Order processing and management
- `payment-analytics/` - Payment tracking and scoring
- `payments/` - Payment processing
- `products/` - Product catalog management
- `profile/` - User profile management
- `sentiment/` - Sentiment analysis views
- `settings/` - Application configuration
- `visits/` - Service visit tracking
- `login/`, `register/`, `reset-password/` - Authentication flows

### `/src/components` - Reusable UI Components
- `layout/` - Layout components (navigation, sidebar, header)
- `sentiment/` - Sentiment analysis UI components
- `ui/` - shadcn/ui component library (buttons, dialogs, forms, tables, etc.)
- Root-level components: cards, badges, icons, theme provider

### `/src/hooks` - Custom React Hooks
- `use-auth.tsx` - Authentication state and user management
- `use-mobile.tsx` - Responsive design utilities
- `use-toast.ts` - Toast notification system

### `/src/lib` - Core Utilities & Business Logic
- `types.ts` - Core TypeScript type definitions
- `utils.ts` - General utility functions
- `firebase.ts` - Firebase configuration and initialization
- `advanced-search.ts` - Fuzzy search implementation
- `auto-status.ts` - Automated order status transitions
- `auto-tagging.ts` - Intelligent tagging system
- `payment-score.ts` - Payment health scoring algorithms
- `payment-warnings.ts` - Payment risk detection
- `performance-score.ts` - Business performance metrics
- `pdf-invoice.ts` - Invoice PDF generation
- `export-utils.ts` - Data export functionality
- `file-import-utils.ts` - CSV/file import processing
- `notification-generator.ts` - Notification creation logic

### `/src/store` - Zustand State Management
- `use-order-store.ts` - Order state management
- `use-company-store.ts` - Company data state
- `use-maintenance-store.ts` - Maintenance scheduling state
- `use-manufacturer-store.ts` - Manufacturer data state
- `use-settings-store.ts` - Application settings state

### `/src/ai` - Genkit AI Integration
- `genkit.ts` - Genkit configuration
- `dev.ts` - Development server for AI flows
- `flows/` - AI flow definitions

### `/src/services` - External Service Integrations
- `geocode-service.ts` - Geolocation and mapping services
- `storage-service.ts` - File storage operations

### `/public` - Static Assets
- `images/` - Image assets (map markers, icons)
- Map marker icons for Leaflet integration

## Core Component Relationships

### Authentication Flow
`use-auth.tsx` → Firebase Auth → Protected Routes → User Context

### Data Flow Architecture
1. **State Management**: Zustand stores manage global state
2. **Data Fetching**: Firebase Firestore for real-time data
3. **UI Updates**: React components subscribe to store changes
4. **AI Processing**: Genkit flows for intelligent operations

### Order Processing Pipeline
CSV Import → `file-import-utils.ts` → `use-order-store.ts` → `auto-status.ts` → Firebase → UI Components

### Payment Monitoring System
Client Data → `payment-score.ts` → `payment-warnings.ts` → `notification-generator.ts` → Alerts

## Architectural Patterns

### Frontend Architecture
- **Next.js App Router**: File-based routing with server/client components
- **Component Composition**: Atomic design with shadcn/ui primitives
- **State Management**: Zustand for global state, React hooks for local state
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Integration
- **Firebase Firestore**: NoSQL database for real-time data
- **Firebase Auth**: User authentication and authorization
- **Firebase Storage**: File and image storage
- **Genkit AI**: AI-powered business logic and automation

### Code Organization Principles
- Feature-based routing in `/app` directory
- Shared components in `/components` with ui primitives
- Business logic isolated in `/lib` utilities
- Type safety enforced through `/lib/types.ts`
- State management centralized in `/store`

### Key Design Patterns
- **Provider Pattern**: Theme and auth context providers
- **Custom Hooks**: Encapsulated logic for reusability
- **Compound Components**: Complex UI components with sub-components
- **Factory Pattern**: Notification and PDF generation
- **Observer Pattern**: Zustand subscriptions for reactive updates
