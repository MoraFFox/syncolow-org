# Advanced Drill-Down System

This directory contains the implementation of the advanced drill-down system, which provides a unified way to navigate to detailed views (pages or dialogs) and show intelligent previews on hover.

## Quick Start

The drill-down system now works **globally** across the entire application. Any element with the proper data attributes will automatically gain drilldown capabilities.

### Global Drilldown (Recommended)
Use data attributes on any element to make it a drilldown target:

```tsx
<div 
  data-drill-kind="order" 
  data-drill-payload='{"id":"123","total":500}'
>
  Order #123
</div>
```

**Available Data Attributes:**
- `data-drill-kind`: Entity type ('order', 'product', 'company', 'revenue', etc.)
- `data-drill-payload`: JSON string with entity data
- `data-drill-mode`: (Optional) 'page' or 'dialog' (defaults to 'page')
- `data-drill-disabled`: (Optional) Disables drilldown if present

**Benefits:**
- No component wrapper needed
- Works on any existing element
- Minimal performance overhead (event delegation)
- Easier to use in tables, lists, and dynamic content

## Core Components

### `GlobalDrillListener`
Automatically included in the `DrillDownProvider`. Uses event delegation to detect and handle clicks and hovers on elements with drill data attributes.

### `DrillTarget`
A convenience component that applies data attributes for you. Useful when you want type-safe props.

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
- `disabled`: (Optional) Disables drilldown behavior.

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
1. Update `DrillKind` type in `src/lib/drilldown-types.ts`.
2. Add a configuration entry in `DRILL_REGISTRY` in `src/lib/drilldown-registry.tsx`:
   - `getRoute`: Function to generate the detail page URL
   - `renderPreview`: Function to render the hover preview
   - (Optional) `fetchPreviewData`: Async function to load additional data
   - (Optional) `quickActions`: Function returning quick action buttons
3. (Optional) Create a new detail page in `src/app/drilldown/[kind]/[id]/page.tsx`.
4. (Optional) Create a new dialog component and add it to `DrillDialogWrapper`.

## State Management
The system uses Zustand (`src/store/use-drilldown-store.ts`) to manage:
- **Dialog State**: `isOpen`, `kind`, `payload`.
- **Preview State**: `preview.isOpen`, `preview.kind`, `preview.payload`, `preview.coords`.
- **History**: Navigation history with back/forward support.
- **Compare**: Side-by-side comparison of entities.
- **Bookmarks**: Saved drill-down targets.
- **Pinned Previews**: Persistable floating preview cards.

## Testing
Run tests with `npm test`.
- Unit tests: `src/components/drilldown/__tests__/global-drill-listener.test.tsx`
- Integration tests: `src/components/drilldown/__tests__/drill-target.test.tsx`

