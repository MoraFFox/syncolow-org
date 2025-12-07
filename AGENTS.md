# 🧠 `agents.md` — Rules & Standards for AI Code Agents

## 🏗️ Purpose
This document defines the **rules, standards, and workflow** all AI coding agents must follow when writing, modifying, or reviewing code in this project.

The project is a **Next.js + React + TypeScript** ERP dashboard.  
The primary goal is to produce **clean, maintainable, and bug-free code** that integrates seamlessly into the existing architecture.

---

## ⚙️ 1. General Agent Behavior

1. **Understand Before Coding**
   - Read all relevant files before writing or modifying code.
   - Understand the component hierarchy, data flow, and API structure.
   - Don’t rewrite existing logic unless it’s a bug fix or explicit refactor.

2. **Incremental and Safe Changes**
   - Implement features step-by-step with working intermediate states.
   - Ensure the app builds successfully after every major code addition.
   - Avoid breaking existing exports, props, or interfaces.

3. **Auto-Fix & Validation**
   - Run **ESLint**, **Prettier**, and **TypeScript checks** after every change.
   - Use `eslint --fix` and `prettier --write` to auto-fix style issues.
   - All TypeScript errors and warnings **must be resolved**, not ignored.

4. **No Guessing**
   - If uncertain about a utility, type, or API endpoint — check the repo before assuming.
   - Reuse existing helpers, hooks, and components wherever possible.

---

## 🧩 2. Code Style & Architecture

1. **File & Folder Structure**
   - Follow Next.js conventions:
     ```
     app/ or pages/
     components/
     hooks/
     lib/
     api/
     types/
     utils/
     ```
   - Keep features self-contained and modular.
   - Use **barrel exports** (`index.ts`) for grouped utilities/components.

2. **Naming Conventions**
   - Variables & functions → `camelCase`
   - Components & classes → `PascalCase`
   - Constants → `UPPER_SNAKE_CASE`
   - Files → `kebab-case` (e.g., `user-card.tsx`)

3. **Code Quality**
   - No unused imports or variables.
   - Avoid inline styles; use Tailwind or styled components.
   - Use modern React patterns (hooks, functional components, context where needed).
   - Keep components small and single-purpose (<150 lines ideally).

4. **Error Handling Standards**
   This project follows a consistent error handling pattern across all layers:

   **A. Services (`src/services/`, `src/lib/`)**
   - Wrap all async methods in `try/catch` blocks.
   - Use `logger.error()` from `@/lib/logger` for all error logging.
   - Include context object with `component` and `action` properties.
   - Additional context (e.g., `taskId`, `orderId`, `userId`) is encouraged.
   - **Critical operations** (create, update, delete): Throw user-friendly errors.
   - **Non-critical operations** (cleanup, analytics): Log but don't throw.
   
   ```typescript
   // Critical operation - throw error
   async createTask(taskData: TaskData) {
     try {
       const result = await api.create(taskData);
       return result;
     } catch (error) {
       logger.error(error, {
         component: 'TaskService',
         action: 'createTask',
         taskData,
       });
       throw new Error('Failed to create task. Please try again.');
     }
   }

   // Non-critical operation - log only
   async cleanupOldRecords(days: number) {
     try {
       await db.deleteOlderThan(days);
     } catch (error) {
       logger.error(error, { component: 'CleanupService', action: 'cleanupOldRecords', days });
       logger.warn('Cleanup failed but continuing', { component: 'CleanupService' });
       // Don't throw - cleanup is non-critical
     }
   }
   ```

   **B. API Routes (`src/app/api/`)**
   - Use `logger.error()` instead of `console.error`.
   - Return appropriate HTTP status codes (400, 401, 404, 500).
   - Include meaningful error messages in response body.
   
   ```typescript
   import { logger } from '@/lib/logger';

   export async function POST(request: NextRequest) {
     try {
       // ... route logic
     } catch (error) {
       logger.error(error, { component: 'MyAPI', action: 'POST' });
       return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
     }
   }
   ```

   **C. React Components**
   - Use `ErrorBoundary` from `@/components/error-boundary` for critical sections.
   - Wrap data-heavy components (tables, charts, lists) in ErrorBoundary.
   - Combine with `Suspense` for lazy-loaded components.
   - Display toast notifications for user actions that fail.
   
   ```tsx
   import { ErrorBoundary } from '@/components/error-boundary';

   <ErrorBoundary>
     <DataTable data={orders} />
   </ErrorBoundary>

   <Suspense fallback={<Skeleton />}>
     <ErrorBoundary>
       <ChartComponent />
     </ErrorBoundary>
   </Suspense>
   ```

   **D. User-Facing Errors**
   - Use `toast()` from `@/hooks/use-toast` for actionable feedback.
   - Messages should be helpful, not technical.
   - Include recovery actions when possible.
   
   ```typescript
   try {
     await updateOrder(orderId, data);
     toast({ title: "Order Updated", description: "Changes saved successfully." });
   } catch (error) {
     toast({
       title: "Update Failed",
       description: "Could not save changes. Please try again.",
       variant: "destructive",
     });
   }
   ```

5. **TypeScript Strict Mode**
   - Always define types and interfaces explicitly.
   - Never use `any` unless justified with a code comment.
   - Prefer utility types (`Partial<>`, `Pick<>`, `Omit<>`, etc.).
   - Use `zod` or TypeScript guards for runtime type validation where appropriate.

---

## 🧪 3. Testing & Verification (Vitest)

1. **Write Tests for Every New Logic**
   - Use **Vitest** for all unit and integration tests.
   - Follow **AAA pattern** (Arrange → Act → Assert).
   - Every new feature or bug fix **must have corresponding tests**.

2. **Test File Organization**
   - **Co-locate tests** with source files in `__tests__/` directories:
     ```
     src/lib/__tests__/notification-service.test.ts
     src/store/__tests__/use-order-store.test.ts
     src/hooks/__tests__/use-auth.test.tsx
     src/app/api/geocode/__tests__/route.test.ts
     ```
   - Use `.test.ts` for logic, `.test.tsx` for React components/hooks.

3. **Test Utilities (src/test/)**
   - `setup.ts` - Global mocks (Supabase, Next.js navigation, window APIs).
   - `test-utils.ts` - Reusable mock factories and helpers:
     - `createMockOrder()`, `createMockCompany()`, `createMockNotification()`
     - `createSupabaseChain()` for chainable query mocks
     - `daysAgo()`, `daysFromNow()` for date helpers
   - `example.test.ts` - Reference patterns for all testing scenarios.

4. **Mocking Strategies**
   - **Supabase**: Mock `@/lib/supabase` with chainable methods:
     ```typescript
     vi.mock('@/lib/supabase', () => ({
       supabase: {
         from: vi.fn(() => ({
           select: vi.fn().mockReturnThis(),
           eq: vi.fn().mockReturnThis(),
           single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
         })),
       },
     }));
     ```
   - **Next.js**: Mock `next/navigation`, `next/headers` for router/cookies.
   - **Browser APIs**: Mock `matchMedia`, `localStorage`, `IndexedDB`.
   - **External APIs**: Mock `fetch` for geocoding, Google Tasks, etc.

5. **Coverage Requirements**
   - **Target**: 70%+ coverage for business logic files.
   - **Priority files**:
     | File | Target |
     |------|--------|
     | Services (`notification-service.ts`, `payment-score.ts`) | 80%+ |
     | Zustand Stores | 70%+ |
     | Custom Hooks | 80%+ |
     | API Routes | 75%+ |
   - Run coverage: `npm run test -- --coverage`

6. **Testing Patterns by Type**
   - **Services**: Test all methods, edge cases, error handling.
   - **Stores**: Test state updates, async actions, cache invalidation.
   - **Hooks**: Use `renderHook` from `@testing-library/react`.
   - **API Routes**: Mock `NextRequest`, test all HTTP status codes.

7. **Agent Checklist Before Finishing**

   > **⚠️ Important**: `next build` is configured with `typescript.ignoreBuildErrors: true`. A successful build does NOT guarantee TypeScript correctness. You MUST run `typecheck` separately.

   **Required sequence:**
   ```bash
   npm run lint          # Step 1: Fix lint errors
   npm run test          # Step 2: Ensure tests pass
   npm run typecheck     # Step 3: Verify TypeScript correctness
   npm run build         # Step 4: Build for production
   ```

   Or use the combined CI script:
   ```bash
   npm run ci            # Runs all 4 steps in sequence
   ```

   **Final checks:**
   - ✅ ESLint and Prettier are clean.
   - ✅ All Vitest tests pass.
   - ✅ TypeScript compiles without errors (`npm run typecheck`).
   - ✅ Build succeeds (`next build`).
   - ✅ Coverage meets thresholds for modified files.
   - ✅ No console warnings in browser or server logs.

---

## 💬 4. Documentation & Collaboration

1. **Comment Intelligently**
   - Explain “why”, not “what”.
   - Add docstrings for complex functions, hooks, or classes using JSDoc format.
   - Include `@param`, `@returns`, and `@example` where helpful.

2. **Component Documentation**
   - Document expected props and state transitions.
   - When creating reusable components, add a short usage example in a comment block.

3. **Commit Standards**
   - Use [Conventional Commits](https://www.conventionalcommits.org/):
     ```
     feat: add invoice summary widget
     fix: correct API pagination in orders table
     refactor: simplify auth hook
     test: add Vitest for customer utils
     docs: update setup instructions
     ```
   - Each commit should represent one clear change.

---

## 🧱 5. Frontend Best Practices (Next.js + React)

1. **State Management**
   - Use React hooks and context for local/global state.
   - Prefer `useReducer` for complex component state logic.
   - Avoid prop drilling; use context or custom hooks.

2. **Data Fetching**
   - Use `fetch` or `axios` wrappers from `lib/api/`.
   - Handle loading and error states explicitly.
   - Use React Query or SWR for caching and revalidation (if installed).

3. **UI Standards**
   - Use responsive design (mobile-first).
   - Ensure accessibility (ARIA attributes, semantic HTML).
   - Use consistent spacing, font, and color tokens.

4. **Performance**
   - Lazy load large components or charts.
   - Avoid unnecessary re-renders (memoize when needed).
   - Use dynamic imports for heavy modules.

---

## 🚫 6. Strictly Forbidden Practices

- ❌ Using `any`, `as unknown as`, or unsafe type casts.  
- ❌ Committing commented-out code or debug logs.  
- ❌ Hardcoding API URLs, tokens, or credentials.  
- ❌ Using outdated React lifecycle methods.  
- ❌ Writing side-effects in render logic.  
- ❌ Creating duplicate utilities or components that already exist.  
- ❌ Ignoring ESLint or TypeScript warnings.

---

## 🚀 7. Example Agent Workflow

> **Task:** Add a “Revenue Summary” widget to the dashboard.

1. Read `components/dashboard/` and `api/revenue.ts`.
2. Create `components/dashboard/revenue-summary.tsx`.
3. Fetch data from existing API with error handling.
4. Display total revenue + growth percentage.
5. Add `revenue-summary.test.tsx` using Vitest.
6. Run:
   ```bash
   npm run lint -- --fix
   npm run prettier --write .
   npm run test
   npm run build
   ```
7. Commit:
   ```
   feat(dashboard): add revenue summary widget with API integration
   ```

---

## ✅ 8. Final Principles

> The AI’s responsibility is to **produce production-ready, clean, and stable code**.  
> Every change should be:
> - Predictable  
> - Typed  
> - Tested  
> - Aligned with project conventions  
