# Store Refactoring Progress

## Overview
Splitting monolithic `use-order-store.ts` (1292 lines) into focused domain stores.

## Current Status: Phase 2 Complete → Ready for Phase 4

**Completed**:
- ✅ Phase 1: Store utilities and helpers (100%)
- ✅ Phase 2: All domain stores created and orders store refactored (100%)
- ✅ Phase 3: Barrel export for clean imports (100%)

**Next**:
- 🎯 Phase 4: Update 45+ import sites across codebase

**Pending**:
- ⏸️ Phase 5: Testing and validation (after Phase 4)
- ⏸️ Phase 6: Documentation and cleanup (after Phase 5)

## Phase 2: Create New Domain Stores (100% Complete)

### ✅ Products Store (`use-products-store.ts`)
- [x] State: products, loading, offset, hasMore
- [x] Actions: loadRemainingProducts, searchProducts, filterProductsByCategory
- [x] Actions: addProduct, updateProduct, deleteProduct, deleteAllProducts
- [x] Uses: universalCache, CacheKeyFactory, toast, logger, drilldown invalidation
- [x] AI image generation integration

### ✅ Categories Store (`use-categories-store.ts`)
- [x] State: categories, loading
- [x] Actions: addCategory, updateCategory, deleteCategory
- [x] Validation: Check for products before deletion
- [x] Uses: universalCache, CacheKeyFactory, toast, logger, drilldown invalidation

### ✅ Taxes Store (`use-taxes-store.ts`)
- [x] State: taxes, loading
- [x] Actions: addTax, updateTax, deleteTax
- [x] Validation: Rate must be 0-100%
- [x] Uses: universalCache, CacheKeyFactory, toast, logger, drilldown invalidation

### ✅ Orders Store Refactoring (`use-order-store.ts`)
- [x] Remove product/category/tax state and actions
- [x] Update fetchInitialData to use initializeAllStores
- [x] Remove product/category/tax imports
- [x] Keep visits and notifications (tightly coupled)
- [x] Update interface to remove product/category/tax methods
- [x] Reduced from 1292 lines to ~850 lines (34% reduction)

## Phase 4: Update Import Sites (Ready to Start)

**Status**: Ready - Phase 2 complete, can now proceed

### Files to Update (45+ locations)

#### High Priority - Direct Store Usage
1. `src/app/products/page.tsx` - Main products page
2. `src/app/products/_components/*.tsx` - Product components
3. `src/app/orders/page.tsx` - Order creation (uses products/categories/taxes)
4. `src/app/orders/_components/*.tsx` - Order components
5. `src/components/dialogs/*.tsx` - Product/category/tax dialogs

#### Medium Priority - Indirect Usage
6. `src/app/dashboard/page.tsx` - Dashboard widgets
7. `src/app/analytics/*.tsx` - Analytics pages
8. `src/lib/pricing-calculator.ts` - May reference products
9. `src/lib/auto-*.ts` - Auto-tagging, auto-status utilities

#### Low Priority - Potential Usage
10. Various other components that may import useOrderStore

### Update Pattern
```typescript
// OLD
import { useOrderStore } from '@/store/use-order-store';
const { products, addProduct } = useOrderStore();

// NEW
import { useProductsStore } from '@/store';
const { products, addProduct } = useProductsStore();
```

### Next Steps
1. Search for all `useOrderStore` usage: `products`, `categories`, `taxes`
2. Update imports systematically by priority
3. Test each component after update
4. Run type check after all updates

## Metrics

- **Original Store Size**: 1292 lines
- **Refactored Store Size**: ~850 lines (34% reduction)
- **New Stores Created**: 4/4 (Products, Categories, Taxes, Orders-refactored)
- **Utilities Created**: 2 files (helpers, initializer)
- **Import Sites to Update**: 45+ files
- **Lines Removed**: 442 lines (product/category/tax code extracted)
