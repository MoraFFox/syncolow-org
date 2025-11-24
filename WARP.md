# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Commands

Use these commands to develop, test, and build the application.

### Development
- **Start Dev Server:** `npm run dev`
  - Runs Next.js with Turbopack on port 9002.
- **Start AI Flows (Genkit):** `npm run genkit:watch`
  - Starts the Genkit developer UI for testing AI flows.

### Quality Assurance
- **Run Unit Tests:** `npm run test`
  - Uses Vitest. To run a single test file: `npx vitest run path/to/test.test.ts`.
- **Run E2E Tests:** `npm run test:e2e`
  - Uses Playwright.
- **Type Check:** `npm run typecheck`
  - Runs `tsc --noEmit`. Mandatory before commits.
- **Lint Code:** `npm run lint`
  - Uses ESLint. Use `npm run lint -- --fix` to auto-fix issues.

### Deployment
- **Build for Production:** `npm run build`
- **Deploy Firestore Rules:** `firebase deploy --only firestore:rules`
- **Deploy Firestore Indexes:** `firebase deploy --only firestore:indexes`

## High-Level Architecture

SynergyFlow ERP is a **Next.js** application using **Firebase** for backend services and **Genkit** for AI features.

### Core Technologies
- **Frontend:** Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Firebase (Firestore, Auth, Hosting).
- **State Management:** Zustand (`src/store/`) & React Context.
- **AI Integration:** Google GenAI via Genkit (`src/ai/`).
- **Forms:** React Hook Form + Zod validation.

### Directory Structure
- **`src/app/`**: Next.js App Router pages and layouts.
  - `notifications/`: Notification center logic and UI.
  - `analytics/`: Analytics dashboards.
- **`src/components/`**: Reusable UI components (shadcn/ui).
- **`src/lib/`**: Core utilities and configuration.
  - `firebase.ts`: Firebase initialization.
  - `notification-*.ts`: Notification system logic.
- **`src/ai/`**: Genkit AI flow definitions.
- **`src/hooks/`**: Custom React hooks.
- **`src/store/`**: Global state management (Zustand).
- **`docs/`**: Detailed project documentation (Implementation, Deployment, API).

### Key Systems
- **Notification System:** Real-time updates via Firestore, supporting in-app, email, and push channels. Logic resides in `src/lib/notification-*.ts` and `src/app/notifications/`.
- **AI Intelligence:** Uses Genkit for priority scoring and insights.
- **Authentication:** Managed via Firebase Auth.

## Development Rules & Standards

Derived from `AGENTS.md`.

### Coding Standards
- **Naming:**
  - Variables/Functions: `camelCase`
  - Components: `PascalCase`
  - Files: `kebab-case` (e.g., `user-card.tsx`)
- **TypeScript:** Strict mode enabled. **No `any` types allowed.** Use explicit interfaces/types.
- **Style:** Use Tailwind CSS. Avoid inline styles.

### Testing Strategy
- **Unit Tests (Vitest):** Required for all new logic/utilities. Locate tests next to source files (`*.test.ts`).
- **E2E Tests (Playwright):** For critical user flows.
- **Verification:** Ensure `typecheck`, `lint`, and `test` pass before finishing a task.

### Workflow
1. **Understand:** Read relevant files in `src/` and `docs/` before changing code.
2. **Implement:** Make incremental changes.
3. **Verify:** Run lint/typecheck/tests.
4. **Refine:** Ensure no console warnings or unused imports.
