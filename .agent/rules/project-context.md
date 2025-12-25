---
trigger: always_on
---


# ♊ SynergyFlow ERP - Gemini Context

This file provides the essential context, architectural overview, and development guidelines for the SynergyFlow ERP project.

## 1. Project Overview
SynergyFlow ERP is an AI-powered enterprise resource planning system built with Next.js. It features a robust notification system, AI intelligence (Genkit), and multi-channel delivery (In-app, Email, Push). The system is designed for high scalability and real-time updates using Firebase.

**Version:** 3.0.0 (Production Ready)

## 2. Technology Stack

### Core
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict mode)
- **State Management:** Zustand + TanStack Query (React Query)
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI)

### Backend & Database
- **Primary Backend:** Firebase (Firestore, Auth, Hosting)
- **Database:** Firestore (NoSQL) + Supabase (Migrations present for specific features)
- **AI Engine:** Genkit AI + Google GenAI

### Testing
- **Unit/Integration:** Vitest (`npm run test`)
- **End-to-End:** Playwright (`npm run test:e2e`)

### Other Key Libraries
- **Maps:** React Google Maps + Leaflet
- **Forms:** React Hook Form + Zod
- **Dates:** date-fns
- **Drag & Drop:** dnd-kit

## 3. Project Structure

```
D:\My projects\firebase-orginal\
├── src/
│   ├── app/                    # Next.js App Router (pages & layouts)
│   │   ├── notifications/      # Notification system UI
│   │   ├── analytics/          # Analytics dashboards
│   │   └── api/                # API Routes
│   ├── components/             # Reusable UI components (shadcn/ui)
│   ├── lib/                    # Core utilities, Firebase setup, types
│   ├── ai/                     # Genkit AI flows and definitions
│   ├── hooks/                  # Custom React hooks
│   └── store/                  # Global state (Zustand)
├── docs/                       # Comprehensive documentation (Read these!)
├── e2e/                        # Playwright E2E tests
├── public/                     # Static assets
└── functions/                  # Firebase Cloud Functions (if applicable)
```

## 4. Development Workflow

### Key Commands
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server on port **9002** |
| `npm run genkit:watch` | Start Genkit AI flows in watch mode |
| `npm run build` | Build the application for production |
| `npm run test` | Run unit and integration tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm run lint` | Run ESLint validation |

### Setup Instructions
1.  **Environment:** Ensure `.env` is configured with Firebase and API keys (see `.env.example`).
2.  **Install:** `npm install`
3.  **Run:** `npm run dev`

## 5. Coding Standards & Agent Guidelines
*(Derived from `AGENTS.md` - Strictly Enforced)*

### General Behavior
- **Understand First:** Read relevant files before editing. Don't guess APIs.
- **Incremental Changes:** Verify builds (`npm run build`) after major changes.
- **No Regressions:** Run tests (`npm run test`) to ensure no breaking changes.

### Code Style
- **Naming:** `camelCase` for variables/functions, `PascalCase` for components.
- **Types:** **No `any`**. Use explicit interfaces and Zod schemas.
- **Components:** Functional components with Hooks. Keep them small (<150 lines).
- **Imports:** Use barrel exports (`index.ts`) where available.

### Testing Strategy
- **Unit Tests:** Co-locate with source files (e.g., `component.test.tsx`).
- **Pattern:** Use AAA (Arrange, Act, Assert).
- **Requirement:** **Every new feature or fix must have a corresponding test.**

## 6. Documentation Index
Refer to `docs/` for deep dives:
- `docs/COMPLETE_IMPLEMENTATION.md`: System overview.
- `docs/notification-system.md`: Notification architecture.
- `docs/PRODUCTION_DEPLOYMENT.md`: Deployment guide.
- `AGENTS.md`: Detailed rules for AI agents.
