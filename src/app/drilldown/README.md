# Advanced Drill-Down System

This directory contains the implementation of the advanced drill-down system, which provides a unified way to navigate to detailed views (pages or dialogs) and show intelligent previews on hover.

## Core Components

### `DrillTarget`
The primary component for enabling drill-down behavior on any UI element.

**Usage:**
```tsx
import { DrillTarget } from '@/components/drilldown/drill-target';

<DrillTarget kind="revenue" payload={{ value: '2023-10' }}>
  <div className="p-4 border rounded">
    Revenue: $50,000
  </div>
</DrillTarget>
```

**Props:**
- `kind`: The type of entity to drill down into (e.g., 'revenue', 'product', 'company', 'order').
- `payload`: Data required for the drill-down (e.g., `{ id: '123' }`, `{ value: '2023-10' }`).
- `mode`: (Optional) 'page' (default) or 'dialog'.
- `asChild`: (Optional) If true, merges props with the immediate child.

### `DrillPreviewTooltip`
A global component (usually placed in the root layout) that renders the hover preview. It listens to the `useDrillDownStore` state.

### `useDrillDown` Hook
Provides programmatic access to drill-down functionality.

**Usage:**
```tsx
const { goToDetail, showPreview, hidePreview } = useDrillDown();

// Navigate to detail
goToDetail('product', { id: '123' });

// Show preview manually
showPreview('product', { id: '123' }, { x: 100, y: 100 });
```

## Configuration

### Adding a New Drill Kind
1.  Update `DrillKind` type in `src/lib/drilldown-types.ts`.
2.  Update `goToDetail` in `src/hooks/use-drilldown.ts` to handle the new kind (add routing logic).
3.  Update `DrillPreviewTooltip` in `src/components/drilldown/drill-preview-tooltip.tsx` to render a preview card for the new kind.
4.  (Optional) Create a new detail page in `src/app/drilldown/[kind]/[id]/page.tsx`.
5.  (Optional) Create a new dialog component and add it to `DrillDialogWrapper`.

## State Management
The system uses Zustand (`src/store/use-drilldown-store.ts`) to manage:
- **Dialog State**: `isOpen`, `kind`, `payload`.
- **Preview State**: `preview.isOpen`, `preview.kind`, `preview.payload`, `preview.coords`.

## Testing
Run tests with `npm test`.
- Unit tests: `src/hooks/__tests__/use-drilldown.test.tsx`
- Integration tests: `src/components/drilldown/__tests__/drill-target.test.tsx`
