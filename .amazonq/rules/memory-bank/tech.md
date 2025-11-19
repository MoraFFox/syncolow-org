# Technology Stack

## Programming Languages
- **TypeScript 5.x**: Primary language with strict mode enabled
- **JavaScript (ES2017+)**: Target compilation for modern browsers
- **CSS**: Tailwind CSS utility-first styling

## Core Framework
- **Next.js 16.0.0**: React framework with App Router
  - Turbopack for fast development builds
  - Server and client components
  - File-based routing
  - Development server on port 9002

## Frontend Technologies

### UI Framework & Libraries
- **React 18.3.1**: Component-based UI library
- **React DOM 18.3.1**: DOM rendering
- **shadcn/ui**: Component library built on Radix UI primitives

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog
  - Dropdown Menu, Label, Popover, Progress, Radio Group
  - Scroll Area, Select, Separator, Slider, Switch
  - Tabs, Toast, Toggle Group, Tooltip
- **Lucide React 0.414.0**: Icon library
- **cmdk 1.0.0**: Command menu component

### Styling & Theming
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **tailwindcss-animate 1.0.7**: Animation utilities
- **tailwind-merge 2.4.0**: Class name merging
- **class-variance-authority 0.7.0**: Variant-based styling
- **next-themes 0.3.0**: Dark/light theme management
- **PostCSS 8.x**: CSS processing

### Data Visualization & Charts
- **Recharts 2.12.7**: Composable charting library
- **React Virtual 3.13.12**: Virtual scrolling for large lists

### Maps & Geolocation
- **Leaflet 1.9.4**: Interactive map library
- **React Leaflet 4.2.1**: React bindings for Leaflet
- **leaflet-defaulticon-compatibility 0.1.2**: Icon compatibility layer

### Form Management
- **React Hook Form 7.52.1**: Form state management
- **@hookform/resolvers 3.9.0**: Validation resolvers
- **Zod 3.23.8**: Schema validation
- **React Day Picker 8.10.1**: Date picker component

### Drag & Drop
- **@dnd-kit/core 6.1.0**: Drag and drop toolkit
- **@dnd-kit/sortable 8.0.0**: Sortable list utilities

### File Handling
- **React Dropzone 14.3.8**: File upload component
- **PapaParse 5.4.1**: CSV parsing
- **XLSX 0.18.5**: Excel file processing

### PDF Generation
- **jsPDF 3.0.3**: PDF document generation
- **jspdf-autotable 5.0.2**: Table generation for PDFs

### Utilities
- **date-fns 3.6.0**: Date manipulation
- **clsx 2.1.1**: Conditional class names
- **use-debounce 10.0.3**: Debouncing hook
- **react-use 17.5.0**: Collection of React hooks
- **Fuse.js 7.0.0**: Fuzzy search library

## Backend & Services

### Firebase Platform
- **Firebase 10.12.3**: Backend-as-a-Service
  - Firestore: NoSQL database
  - Authentication: User management
  - Storage: File storage
  - Hosting: Application deployment

### AI & Machine Learning
- **Genkit 1.0.0**: AI framework for building AI-powered features
- **@genkit-ai/google-genai 1.0.0**: Google AI integration

## State Management
- **Zustand 4.5.4**: Lightweight state management
- **Immer 10.1.1**: Immutable state updates

## Development Tools

### Build & Development
- **Node.js**: Runtime environment (version specified in .nvmrc)
- **npm**: Package manager
- **Turbopack**: Next.js bundler for fast development
- **tsx**: TypeScript execution for AI flows

### Code Quality
- **ESLint 9.0.0**: Linting with Next.js config
- **TypeScript Compiler**: Type checking with strict mode
- **Prettier**: Code formatting (implied by project standards)

### Configuration Files
- `tsconfig.json`: TypeScript configuration with strict mode
- `eslint.config.mjs`: ESLint rules
- `tailwind.config.ts`: Tailwind customization
- `postcss.config.mjs`: PostCSS plugins
- `next.config.js`: Next.js configuration
- `components.json`: shadcn/ui configuration

## Development Commands

### Primary Commands
```bash
npm run dev              # Start development server (port 9002, Turbopack)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
npm run genkit:dev       # Start Genkit AI development server
npm run genkit:watch     # Start Genkit with file watching
```

### Environment
- **Development Port**: 9002
- **Environment Variables**: Configured in `.env`
- **Firebase Config**: `.firebaserc`, `firebase.json`
- **Docker Support**: `Dockerfile`, `.dockerignore`

## Deployment

### Firebase Hosting
- **Configuration**: `apphosting.yaml`, `firebase.json`
- **Firestore Indexes**: `firestore.indexes.json`
- **Environment**: Firebase Studio environment

## Type System
- **Strict TypeScript**: Enabled in tsconfig.json
- **Path Aliases**: `@/*` maps to `./src/*`
- **Target**: ES2017 for broad compatibility
- **Module System**: ESNext with bundler resolution
- **JSX**: react-jsx transform
