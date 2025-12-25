---
trigger: always_on
---



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

## 2. UI Component & Tooling Guidelines

1. **Component Usage**

   * Always prioritize **ShadCN UI components** whenever they are applicable to the use case.
   * Avoid creating custom components when a ShadCN equivalent already exists.
2. **Component & Package Discovery**

   * Use the **Context7 MCP Tool** to:

     * Discover suitable UI components.
     * Identify relevant libraries or packages when unsure.
     * Understand usage patterns and best practices for a given dependency.
3. **Fallback Tooling**

   * If Context7 cannot fully satisfy the requirement:

     * Use your search **MCP Tool** for discovery and search.
4. **URL-Based References**

   * When a user provides a **URL** for a component or package:

     * Always use the **Fetch tool** to scrape and analyze the source.
     * Base implementation decisions on the retrieved content.
5. **ShadCN Component Tracking**

   * Maintain a centralized file named **`ShadCN-context.md`**.
   * This file must:

     * List **all ShadCN components currently used** in the project.
     * Act as a reference to determine whether a component:

       * Is already installed.
       * Needs to be added via the ShadCN CLI.
   * If the file does not exist, create it immediately.

---

## 🧩 3. Code Style & Architecture

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
4. **Error Handling**

   - Wrap async calls in `try/catch`.
   - Handle null, undefined, and empty states gracefully.
   - Provide user-friendly error UI for API or data-fetching failures.
5. **TypeScript Strict Mode**

   - Always define types and interfaces explicitly.
   - Never use `any` unless justified with a code comment.
   - Prefer utility types (`Partial<>`, `Pick<>`, `Omit<>`, etc.).
   - Use `zod` or TypeScript guards for runtime type validation where appropriate.

---

## 🧪 4. Testing & Verification (Vitest)

1. **Write Tests for Every New Logic**

   - Use **Vitest** for all unit and integration tests.
   - Store tests next to source files (`*.test.ts` / `*.test.tsx`).
   - Follow **AAA pattern** (Arrange → Act → Assert).
2. **Coverage & Reliability**

   - Test all core logic: utilities, hooks, and API integrations.
   - Mock network requests or localStorage interactions.
   - Ensure `vitest run` passes before finalizing work.
3. **Agent Checklist Before Finishing**

   - ✅ Build succeeds (`next build` has 0 errors).
   - ✅ ESLint and Prettier are clean.
   - ✅ TypeScript compiles without errors.
   - ✅ Vitest tests pass.
   - ✅ No console warnings in browser or server logs.

---

## 💬 5. Documentation & Collaboration

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

## 🧱 6. Frontend Best Practices (Next.js + React)

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

## 🚫 7. Strictly Forbidden Practices

- ❌ Using `any`, `as unknown as`, or unsafe type casts.
- ❌ Committing commented-out code or debug logs.
- ❌ Hardcoding API URLs, tokens, or credentials.
- ❌ Using outdated React lifecycle methods.
- ❌ Writing side-effects in render logic.
- ❌ Creating duplicate utilities or components that already exist.
- ❌ Ignoring ESLint or TypeScript warnings.

---

## 🚀 8. Example Agent Workflow

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

## ✅ 9. Final Principles

 The AI’s responsibility is to **produce production-ready, clean, and stable code**.Every change should be:

- Predictable
- Typed
- Tested
- Aligned with project conventions
