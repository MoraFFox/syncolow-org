# Drill-Down System Documentation

## Overview

The drill-down system provides a consistent, type-safe way to navigate between related entities in the application. It supports both page-based navigation and modal dialogs, with optional hover previews and async data fetching.

## Architecture

### Core Components

1. **Registry Pattern** ([`src/lib/drilldown-registry.tsx`](file:///d:/My%20projects/firebase-orginal/src/lib/drilldown-registry.tsx))
   - Centralizes routing logic and preview rendering for each drill kind
   - Provides type-safe configuration for each entity type

2. **Type System** ([`src/lib/drilldown-types.ts`](file:///d:/My%20projects/firebase-orginal/src/lib/drilldown-types.ts))
   - Uses mapped types to ensure payload type safety
   - `DrillPayloadMap` defines specific payload structure for each kind

3. **State Management** (`src/store/use-drilldown-store.ts`)
   - Zustand store for dialog and preview state
   - Manages open/closed state and current drill context

4. **Components**
   - `DrillTarget`: Clickable wrapper for drill-down actions
   - `DrillPreviewTooltip`: Hover preview with async support
   - `DrillDialogWrapper`: Lazy-loaded dialog registry

---

## Adding a New Drill Kind

### Step 1: Define Types

Add your drill kind to the `DrillKind` union and payload map in [`drilldown-types.ts`](file:///d:/My%20projects/firebase-orginal/src/lib/drilldown-types.ts):

```typescript
export type DrillKind = 'revenue' | 'product' | 'company' | 'order' | 'your_new_kind';

export interface DrillPayloadMap {
  // ... existing kinds
  your_new_kind: {
    id: string;
    name?: string;
    // Add any other properties needed for routing or preview
    [key: string]: any;
  };
}
```

### Step 2: Add to Registry

Update the `DRILL_REGISTRY` in [`drilldown-registry.tsx`](file:///d:/My%20projects/firebase-orginal/src/lib/drilldown-registry.tsx):

```typescript
export const DRILL_REGISTRY: { [K in DrillKind]: DrillConfig<K> } = {
  // ... existing entries
  your_new_kind: {
    getRoute: (payload) => payload.id ? `/drilldown/your-kind/${payload.id}` : null,
    renderPreview: (payload) => (
      <div className="space-y-2">
        <div className="font-medium">{payload.name || 'Item'}</div>
        {/* Add more preview content */}
      </div>
    )
  }
};
```

### Step 3: Create Route Page

Create a new page at [`src/app/drilldown/your-kind/[id]/page.tsx`](file:///d:/My%20projects/firebase-orginal/src/app/drilldown):

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function YourKindDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Your Kind Details</h1>
      </div>
      {/* Add your content */}
    </div>
  );
}
```

### Step 4: Use DrillTarget

Wrap any clickable element with `DrillTarget`:

```typescript
import { DrillTarget } from '@/components/drilldown/drill-target';

<DrillTarget 
  kind="your_new_kind" 
  payload={{ id: 'item-1', name: 'Sample Item' }}
  className="hover:underline cursor-pointer"
>
  Click to drill down
</DrillTarget>
```

---

## Async Previews

### Overview

Async previews allow you to fetch live data when the user hovers over a drill target. This is perfect for showing real-time status, availability, or other dynamic information.

### Implementation

Update your drill kind configuration with three additional methods:

```typescript
your_kind: {
  getRoute: (payload) => `/drilldown/your-kind/${payload.id}`,
  renderPreview: (payload) => (/* synchronous preview */),
  
  // Add async support
  fetchPreviewData: async (payload) => {
    // Fetch from API or Supabase
    const { data } = await supabase
      .from('your_table')
      .select('*')
      .eq('id', payload.id)
      .single();
    
    return data;
  },
  
  renderLoadingPreview: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
      Loading...
    </div>
  ),
  
  renderAsyncPreview: (payload, data) => (
    <div className="space-y-2">
      <div className="font-medium">{data.name}</div>
      <div className="text-sm">Status: {data.status}</div>
      {/* Render fetched data */}
    </div>
  )
}
```

### Best Practices

1. **Keep async operations fast** - Aim for <500ms response time
2. **Handle errors gracefully** - The system will show a fallback error message
3. **Cache when possible** - Consider using React Query or SWR for caching
4. **Debounce hover events** - The tooltip system has a small delay before showing

---

## Dialog Integration

### Adding a Dialog Component

For drill kinds that should open in a modal instead of navigating to a new page:

#### Step 1: Create Dialog Component

```typescript
// src/components/dialogs/your-kind-dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function YourKindDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Kind Details</DialogTitle>
        </DialogHeader>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 2: Add to Dialog Registry

Update [`drill-dialog-wrapper.tsx`](file:///d:/My%20projects/firebase-orginal/src/components/drilldown/drill-dialog-wrapper.tsx):

```typescript
const YourKindDialog = dynamic(
  () => import('@/components/dialogs/your-kind-dialog').then((mod) => mod.YourKindDialog),
  { ssr: false }
);

const DIALOG_REGISTRY: Partial<Record<DrillKind, React.ComponentType<any>>> = {
  revenue: RevenueDeepDiveDialog,
  your_new_kind: YourKindDialog, // Add here
};
```

#### Step 3: Use Dialog Mode

```typescript
<DrillTarget 
  kind="your_new_kind" 
  payload={{ id: 'item-1' }}
  mode="dialog" // This opens in a modal instead of navigating
>
  Open in dialog
</DrillTarget>
```

---

## API Reference

### `useDrillDown` Hook

```typescript
const { goToDetail, openDetailDialog, showPreview, hidePreview, getDrillContext } = useDrillDown();
```

#### Methods

- **`goToDetail(kind, payload, mode?)`** - Navigate to detail page or open dialog
  - `kind`: DrillKind - The type of entity
  - `payload`: DrillPayload - Data for routing and preview
  - `mode`: 'page' | 'dialog' - Navigation mode (default: 'page')

- **`openDetailDialog(kind, payload)`** - Open detail dialog (shortcut for mode='dialog')

- **`showPreview(kind, payload, coords?)`** - Show hover preview
  - `coords`: { x: number, y: number } - Mouse position for tooltip

- **`hidePreview()`** - Hide hover preview

- **`getDrillContext()`** - Get current drill state

### `DrillTarget` Props

```typescript
interface DrillTargetProps {
  kind: DrillKind;
  payload: DrillPayload;
  mode?: 'page' | 'dialog';
  className?: string;
  children: React.ReactNode;
}
```

---

## Examples

### Example 1: Product with Live Stock Preview

```typescript
// In drilldown-registry.tsx
product: {
  getRoute: (payload) => `/drilldown/product/${payload.id}`,
  renderPreview: (payload) => (
    <div>{payload.name}</div>
  ),
  fetchPreviewData: async (payload) => {
    const { data } = await supabase
      .from('products')
      .select('stock,price')
      .eq('id', payload.id)
      .single();
    return data;
  },
  renderAsyncPreview: (payload, data) => (
    <div className="space-y-2">
      <div className="font-medium">{payload.name}</div>
      <Badge variant={data.stock > 0 ? "outline" : "destructive"}>
        {data.stock} in stock
      </Badge>
      <div className="font-bold">{formatCurrency(data.price)}</div>
    </div>
  )
}

// Usage in component
<DrillTarget kind="product" payload={{ id: 'p1', name: 'Coffee Beans' }}>
  <span className="hover:underline">Coffee Beans</span>
</DrillTarget>
```

### Example 2: Order with Context Menu

```typescript
import { useDrillDown } from '@/hooks/use-drilldown';

function OrderRow({ order }) {
  const { goToDetail } = useDrillDown();
  
  return (
    <tr>
      <td onClick={() => goToDetail('order', { id: order.id, total: order.total })}>
        {order.id}
      </td>
      <td>{order.total}</td>
    </tr>
  );
}
```

---

## Troubleshooting

### Preview not showing?

1. Check that `DrillPreviewTooltip` is rendered in your layout
2. Verify the registry entry has `renderPreview` defined
3. Check browser console for errors

### Type errors when adding new drill kind?

1. Ensure you added the kind to the `DrillKind` union type
2. Add a payload definition to `DrillPayloadMap`
3. The registry must have an entry for every drill kind

### Async preview not working?

1. Verify `fetchPreviewData` returns a Promise
2. Check network tab for API call
3. Ensure `renderAsyncPreview` is defined

### Navigation not working?

1. Check that `getRoute` returns a valid path
2. Verify the route page exists at the correct path
3. Check for console errors in the browser

---

## Migration Guide

### From Old Switch-Based Routing

**Before:**
```typescript
switch (kind) {
  case 'revenue':
    router.push(`/drilldown/revenue/${payload.value}`);
    break;
  case 'product':
    router.push(`/drilldown/product/${payload.id}`);
    break;
}
```

**After:**
```typescript
const { goToDetail } = useDrillDown();
goToDetail(kind, payload);
```

The registry handles all routing logic automatically!

---

## Performance Considerations

### Lazy Loading

All dialogs are lazy-loaded using Next.js `dynamic` imports. This keeps the initial bundle size small.

### Preview Optimization

- Previews only render when `isOpen` is true
- Async data is fetched only when needed
- Portal-based rendering prevents layout shifts

### Type Safety

The mapped type system ensures zero runtime overhead - all type checking happens at compile time.

---

## Future Enhancements

Potential improvements to consider:

1. **Preview Caching** - Cache async preview data with React Query
2. **Keyboard Navigation** - Add keyboard shortcuts for drill-down navigation
3. **Analytics** - Track drill-down usage patterns
4. **Deep Linking** - Share URLs that open specific drill dialogs
5. **Preview Customization** - Allow users to pin/customize previews

---

## Support

For questions or issues with the drill-down system, contact the development team or create an issue in the project repository.
