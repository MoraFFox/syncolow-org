# Store Refactoring Progress

## Completed Steps

### Phase 1: Store Utilities ✅
- ✅ Created `src/store/utils/store-helpers.ts` with reusable helper functions
- ✅ Created `src/store/utils/store-initializer.ts` for centralized initialization

### Phase 2: Individual Domain Stores ✅
- ✅ Created `src/store/use-products-store.ts` (7 actions, ~200 lines)
- ✅ Created `src/store/use-categories-store.ts` (3 actions, ~80 lines)
- ✅ Created `src/store/use-taxes-store.ts` (3 actions, ~90 lines)
- ⏳ Need to refactor `src/store/use-order-store.ts` (remove product/category/tax actions)

### Phase 3: Barrel Export ✅
- ✅ Created `src/store/index.ts` with all store exports

## Next Steps

### Remaining Phase 2 Work
1. Refactor `use-order-store.ts` to:
   - Remove product actions (addProduct, updateProduct, deleteProduct, deleteAllProducts, loadRemainingProducts, searchProducts, filterProductsByCategory)
   - Remove category actions (addCategory, updateCategory, deleteCategory)
   - Remove tax actions (addTax, updateTax, deleteTax)
   - Remove products, categories, taxes from state
   - Update fetchInitialData to use initializeAllStores
   - Keep orders, visits, notifications, returns

### Phase 4: Update Import Sites
Need to update 45+ files to import from new stores. Key files include:
- Orders domain: Keep importing from use-order-store
- Products domain: Update to use-products-store
- Categories domain: Update to use-categories-store
- Taxes domain: Update to use-taxes-store

## Files Created
1. `src/store/utils/store-helpers.ts`
2. `src/store/utils/store-initializer.ts`
3. `src/store/use-products-store.ts`
4. `src/store/use-categories-store.ts`
5. `src/store/use-taxes-store.ts`
6. `src/store/index.ts`
7. `src/store/use-order-store.ts.backup` (backup of original)

## Status
**Phase 1**: ✅ Complete
**Phase 2**: 75% Complete (3/4 stores created, need to refactor orders store)
**Phase 3**: ✅ Complete (barrel export created)
**Phase 4**: ⏳ Pending (awaiting Phase 2 completion)
**Phase 5**: ⏳ Pending
**Phase 6**: ⏳ Pending
