# Implementation Guide - Week 1 Critical Fixes

**Status**: 🚀 Ready to Implement  
**Priority**: Critical  
**Estimated Time**: 5-7 days

---

## ✅ Files Created

The following utility files have been created and are ready to use:

1. ✅ `src/lib/logger.ts` - Centralized logging wrapper
2. ✅ `src/lib/type-utils.ts` - Type utility functions
3. ✅ `src/types/forms.ts` - Form type definitions
4. ✅ `.prettierrc.json` - Prettier configuration
5. ✅ `.lintstagedrc.json` - Lint-staged configuration

---

## 📋 Week 1 Tasks

### Task 1: Setup Tooling (30 minutes)

```bash
# Install dependencies
npm install --save-dev prettier husky lint-staged

# Initialize husky
npx husky init

# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit

# Update package.json scripts
npm pkg set scripts.format="prettier --write \"**/*.{ts,tsx,json,md}\""
npm pkg set scripts.format:check="prettier --check \"**/*.{ts,tsx,json,md}\""
npm pkg set scripts.lint:fix="eslint --ext .js,.jsx,.ts,.tsx --fix ."
npm pkg set scripts.prepare="husky install"

# Run initial format
npm run format
```

### Task 2: Replace Console Statements (2 hours)

Replace console statements in these files:

**Files to update**:
1. `src/lib/drilldown/action-helper.ts` (Lines 14, 16)
2. `src/lib/notification-automation.ts` (Lines 238, 256)
3. `src/lib/conflict-resolver.ts` (Line 65)
4. `src/lib/drill-analytics.ts` (Lines 63, 73)
5. `src/lib/drilldown/api-helper.ts` (Line 13)

**Pattern**:
```typescript
// ❌ Before
console.log(`[DrillAction] Starting: ${label}...`);
console.error('Error:', error);

// ✅ After
import { logger } from '@/lib/logger';

logger.debug(`[DrillAction] Starting: ${label}...`);
logger.error(error, { component: 'DrillAction', action: 'execute' });
```

### Task 3: Fix "use client" Placement (1 hour)

Move "use client" to line 1 in these files:

1. `src/app/dashboard/_components/scroll-indicator.tsx`
2. `src/app/dashboard/_components/today-agenda.tsx`
3. `src/app/dashboard/_components/weekly-lookahead.tsx`
4. `src/components/ui/button.tsx`
5. `src/components/layout/app-shell.tsx`
6. And 7 more files

**Pattern**:
```typescript
// ❌ Before
/** @format */

"use client";

import { useEffect } from "react";

// ✅ After
"use client";

import { useEffect } from "react";
```

### Task 4: Type React Hook Form Components (4 hours)

Update wizard step components to use proper types:

**Files to update**:
1. `src/app/clients/_components/_wizard-steps/Step1_CompanyDetails.tsx`
2. `src/app/clients/_components/_wizard-steps/Step2_CompanyStructure.tsx`
3. `src/app/clients/_components/_wizard-steps/Step3_BranchOrFinal.tsx`
4. `src/app/clients/_components/_wizard-steps/Step4_BranchForms.tsx`

**Pattern**:
```typescript
// ❌ Before
export function Step1_CompanyDetails({ control, register, errors, ... }: any) {

// ✅ After
import type { CompanyFormProps } from '@/types/forms';

export function Step1_CompanyDetails(props: CompanyFormProps) {
  const { control, register, errors, openMapPicker, setValue, watch, isWizard, isEditMode } = props;
```

### Task 5: Split app-shell.tsx (8 hours)

Create these new files:

1. `src/components/layout/app-shell-provider.tsx` - Auth & data fetching
2. `src/components/layout/mobile-layout.tsx` - Mobile UI
3. `src/components/layout/desktop-layout.tsx` - Desktop UI
4. `src/components/layout/form-dialogs.tsx` - All form dialogs
5. `src/hooks/use-notification-computation.ts` - Notification logic

**Structure**:
```typescript
// src/components/layout/app-shell.tsx (simplified)
export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  return (
    <AppShellProvider>
      <OfflineBanner />
      <OnboardingTour />
      <FormDialogs />
      {isMobile ? (
        <MobileLayout>{children}</MobileLayout>
      ) : (
        <DesktopLayout>{children}</DesktopLayout>
      )}
    </AppShellProvider>
  );
}
```

### Task 6: Split use-order-store.ts (12 hours)

Create these new stores:

1. `src/store/use-product-store.ts` - Products & categories
2. `src/store/use-tax-store.ts` - Taxes
3. `src/store/use-visit-store.ts` - Visits & calls
4. Update `src/store/use-order-store.ts` - Orders only

**Pattern**:
```typescript
// src/store/use-product-store.ts
import { create } from 'zustand';
import { produce } from 'immer';
import type { Product, Category } from '@/lib/types';

interface ProductState {
  products: Product[];
  categories: Category[];
  loading: boolean;
  
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  loading: false,
  
  // Implement actions...
}));
```

---

## 🧪 Testing Checklist

After each task:

- [ ] Run `npm run typecheck` - No TypeScript errors
- [ ] Run `npm run lint` - No ESLint errors
- [ ] Run `npm run format:check` - All files formatted
- [ ] Run `npm run build` - Build succeeds
- [ ] Run `npm run test` - All tests pass
- [ ] Manual testing - App works correctly

---

## 📊 Progress Tracking

| Task | Status | Time | Assignee |
|------|--------|------|----------|
| 1. Setup Tooling | ⏳ Pending | 30m | - |
| 2. Console Statements | ⏳ Pending | 2h | - |
| 3. "use client" Placement | ⏳ Pending | 1h | - |
| 4. Type Form Components | ⏳ Pending | 4h | - |
| 5. Split app-shell.tsx | ⏳ Pending | 8h | - |
| 6. Split use-order-store.ts | ⏳ Pending | 12h | - |

**Total Estimated Time**: 27.5 hours (~3.5 days)

---

## 🚨 Important Notes

1. **Backup First**: Create a git branch before starting
   ```bash
   git checkout -b fix/week1-critical-fixes
   ```

2. **Incremental Commits**: Commit after each task
   ```bash
   git add .
   git commit -m "fix: replace console statements with logger"
   ```

3. **Test Frequently**: Run tests after each change

4. **Ask for Help**: If stuck, refer to detailed reports in `docs/code-review/`

---

## 📚 Reference Documents

- [TypeScript & Type Safety Audit](./code-review/phase1-step1-typescript-audit.md)
- [Component Standards Review](./code-review/phase1-step2-component-standards.md)
- [State Management Review](./code-review/phase2-step1-state-management.md)
- [Complete Review](./code-review/REVIEW_COMPLETE.md)

---

## ✅ Success Criteria

Week 1 is complete when:

- [ ] All console statements replaced with logger
- [ ] All "use client" directives on line 1
- [ ] All form components properly typed
- [ ] app-shell.tsx split into 5 files
- [ ] use-order-store.ts split into 4 stores
- [ ] All tests passing
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Prettier and ESLint configured

---

## 🎯 Next Steps

After completing Week 1:

1. Review progress with team
2. Update progress tracking
3. Begin Week 2 tasks (see Phase 1 Summary)
4. Continue with high-priority fixes

---

**Good luck! 🚀**
