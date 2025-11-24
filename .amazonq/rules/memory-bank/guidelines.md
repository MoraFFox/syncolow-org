# Development Guidelines

## Code Quality Standards

### File Headers
- **Format Comment**: All files start with `/** @format */` comment (5/5 files)
- Indicates code formatting standards are enforced project-wide

### Strict Mode Directives
- **"use client"**: Used in all client-side React components and hooks (4/5 files)
- Required for Next.js App Router client components
- Placed at the top of files after format comment

### Import Organization
- **Grouped imports** in logical order:
  1. External libraries (React, third-party packages)
  2. Internal utilities and types (`@/lib/*`, `@/components/*`)
  3. Relative imports
- **Type imports** use `type` keyword: `import type { Order, Product } from "@/lib/types"`
- **Path aliases**: All internal imports use `@/*` alias pointing to `src/*`

### Naming Conventions
- **Files**: kebab-case for components (`csv-importer-dialog.tsx`, `use-toast.ts`)
- **Components**: PascalCase (`CsvImporterDialog`, `ChartContainer`)
- **Functions/Variables**: camelCase (`handleFileChange`, `runImport`, `fetchOrders`)
- **Constants**: UPPER_SNAKE_CASE (`TOAST_LIMIT`, `INITIAL_SERVICES_CATALOG`, `CHUNK_SIZE`)
- **Types/Interfaces**: PascalCase (`ImportStage`, `MaintenanceState`, `ChartConfig`)
- **Private variables**: camelCase with descriptive names (`toastTimeouts`, `memoryState`)

### Code Structure Standards
- **Consistent indentation**: 2 spaces (TypeScript/React standard)
- **Line length**: Generally kept under 120 characters
- **Semicolons**: Used consistently at end of statements
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Trailing commas**: Used in multi-line objects and arrays

## TypeScript Patterns

### Type Safety
- **Strict typing**: All function parameters and return types explicitly typed
- **Type assertions**: Minimal use, only when necessary with proper casting
- **Generic types**: Used extensively in Zustand stores and React components
- **Union types**: For state machines and status enums (`ImportStage`, `MaintenanceVisit['status']`)
- **Type guards**: Runtime type checking where needed

### Interface Definitions
```typescript
// State interfaces define complete store shape
interface MaintenanceState {
  maintenanceVisits: MaintenanceVisit[];
  loading: boolean;
  fetchInitialData: () => Promise<void>;
  addMaintenanceVisit: (visit: Omit<MaintenanceVisit, 'id'>) => Promise<void>;
}

// Props interfaces for components
interface CsvImporterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  entityType: ImportableEntityType;
}
```

### Type Utilities
- **Omit<T, K>**: Remove properties from types (`Omit<Product, "id">`)
- **Partial<T>**: Make all properties optional (`Partial<MaintenanceVisit>`)
- **Record<K, V>**: Create object types (`Record<string, unknown>`)
- **as const**: Create readonly literal types for constants

## State Management Patterns

### Zustand Store Structure
```typescript
// Standard Zustand store pattern (5/5 stores follow this)
export const useOrderStore = create<AppState>((set, get) => ({
  // State properties
  orders: [],
  loading: true,
  
  // Actions that modify state
  fetchOrders: async (limitCount) => {
    set({ ordersLoading: true });
    // ... async logic
    set({ orders: data, ordersLoading: false });
  },
  
  // Actions using Immer for immutable updates
  updateOrderStatus: async (orderId, status) => {
    set(
      produce((state: AppState) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          order.status = status;
        }
      })
    );
  }
}));
```

### Immer Integration
- **produce()**: Used for complex nested state updates (100% of mutation operations)
- **Immutability**: Never mutate state directly, always use `set()` or `produce()`
- **Type safety**: State type passed to produce for full type checking

### State Access Patterns
```typescript
// Get current state within store
const { orders } = get();

// Access other stores
const { companies } = useCompanyStore.getState();

// Set state directly
set({ loading: false });

// Set state with function
set(produce((state) => { /* mutations */ }));
```

## React Component Patterns

### Component Structure
```typescript
// 1. Type definitions
interface ComponentProps {
  // props
}

// 2. Component definition with forwardRef if needed
export function Component({ prop1, prop2 }: ComponentProps) {
  // 3. Hooks (in order: state, refs, context, custom hooks)
  const [state, setState] = useState();
  const ref = useRef();
  const { data } = useStore();
  
  // 4. Derived state and memoization
  const computed = useMemo(() => {}, [deps]);
  
  // 5. Effects
  useEffect(() => {}, [deps]);
  
  // 6. Event handlers
  const handleClick = useCallback(() => {}, [deps]);
  
  // 7. Render helpers
  const renderContent = () => {};
  
  // 8. Return JSX
  return <div>...</div>;
}
```

### Hook Usage Patterns
- **useState**: For local component state
- **useCallback**: Memoize event handlers and callbacks (used extensively)
- **useMemo**: Memoize expensive computations
- **useEffect**: Side effects, subscriptions, cleanup
- **Custom hooks**: Extract reusable logic (use-toast, use-auth, use-online-status)

### Conditional Rendering
```typescript
// Early returns for loading/error states
if (stage === 'mapping') {
  return <ColumnMappingStep />;
}

// Ternary for inline conditions
{isLoading ? <Loader /> : <Content />}

// Logical AND for conditional display
{error && <ErrorMessage />}

// Switch-like pattern with multiple conditions
const renderContent = () => {
  if (stage === 'upload') return <UploadUI />;
  if (stage === 'parsing') return <ParsingUI />;
  return <DefaultUI />;
};
```

## Async Patterns

### Error Handling
```typescript
// Try-catch with user feedback
try {
  const result = await importFlow({ entityType, data });
  toast({ title: 'Success' });
} catch (error: any) {
  toast({ 
    title: 'Error', 
    description: error.message, 
    variant: 'destructive' 
  });
}

// Silent error handling for non-critical operations
try {
  await syncToCache();
} catch {
  // Error handled silently or logged
}
```

### Promise Patterns
```typescript
// Parallel execution with Promise.all
await Promise.all([
  supabase.from('orders').upsert(orderUpdates),
  supabase.from('companies').upsert(companyUpdates)
]);

// Sequential async operations
const data = await parseFile(file);
const validated = await validateData(data);
await importData(validated);
```

### Loading States
```typescript
// Set loading before async operation
set({ ordersLoading: true });
try {
  const data = await fetchData();
  set({ orders: data, ordersLoading: false });
} catch {
  set({ ordersLoading: false });
}
```

## Data Fetching Patterns

### Supabase Query Patterns
```typescript
// Basic select
const { data } = await supabase.from('orders').select('*');

// With filters
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'Pending')
  .gte('orderDate', from)
  .lte('orderDate', to);

// With ordering and pagination
const { data } = await supabase
  .from('orders')
  .select('*')
  .order('orderDate', { ascending: false })
  .range(0, 49);

// Insert with return
const { data, error } = await supabase
  .from('products')
  .insert([productData])
  .select()
  .single();

// Update
await supabase
  .from('orders')
  .update({ status: 'Completed' })
  .eq('id', orderId);

// Delete
await supabase
  .from('orders')
  .delete()
  .eq('id', orderId);
```

### Caching Strategy
```typescript
// Check cache before fetching
const cached = AnalyticsCache.get(from, to);
if (cached) {
  set({ analyticsOrders: cached });
  return;
}

// Fetch and cache
const { data } = await supabase.from('orders').select('*');
AnalyticsCache.set(from, to, data);
set({ analyticsOrders: data });
```

## UI Component Patterns

### shadcn/ui Integration
```typescript
// Import from @/components/ui
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

// Use with consistent props
<Button 
  variant="default" 
  size="sm" 
  onClick={handleClick}
  disabled={isLoading}
>
  {isLoading ? <Loader2 className="animate-spin" /> : 'Submit'}
</Button>
```

### Icon Usage (Lucide React)
```typescript
// Import specific icons
import { FileUp, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

// Use with consistent sizing
<FileUp className="h-4 w-4 mr-2" />
<Loader2 className="h-12 w-12 animate-spin text-primary" />
```

### Styling Patterns
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === 'primary' && "variant-classes",
  className // Allow prop override
)} />
```

### Form Patterns
```typescript
// React Hook Form with Controller for custom inputs
<Controller
  name="region"
  control={control}
  render={({ field }) => (
    <Select
      onValueChange={field.onChange}
      defaultValue={field.value}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="A">Option A</SelectItem>
      </SelectContent>
    </Select>
  )}
/>

// Register for native inputs
<Input {...register("name")} />
{errors.name && <p className="text-destructive">{errors.name.message}</p>}
```

## Performance Patterns

### Chunked Processing
```typescript
// Process large datasets in chunks
const CHUNK_SIZE = 500;
for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  await processChunk(chunk);
  setProgress(Math.round((i / data.length) * 100));
}
```

### Pagination
```typescript
// Offset-based pagination
const { data } = await supabase
  .from('orders')
  .select('*')
  .range(offset, offset + limit - 1);

set({
  orders: [...existingOrders, ...data],
  offset: offset + limit,
  hasMore: data.length === limit
});
```

### Memoization
```typescript
// Memoize expensive computations
const allErrorsResolved = useMemo(() => {
  const blockingErrorIndexes = new Set(errors.filter(e => e.blocking).map(e => e.rowIndex));
  return Array.from(blockingErrorIndexes).every(index => resolvedErrors.has(index));
}, [errors, resolvedErrors]);
```

## User Feedback Patterns

### Toast Notifications
```typescript
// Success toast
toast({ 
  title: 'Order Created',
  description: 'Order has been placed successfully'
});

// Error toast
toast({ 
  title: 'Error',
  description: error.message,
  variant: 'destructive'
});

// With duration
toast({ 
  title: 'Warning',
  duration: 5000
});
```

### Progress Indicators
```typescript
// Progress state
const [importProgress, setImportProgress] = useState(0);
const [importStageDetails, setImportStageDetails] = useState('');

// Update during operation
setImportProgress(Math.round((current / total) * 100));
setImportStageDetails(`Processing ${current} of ${total}...`);

// Display
<Progress value={importProgress} />
<p className="text-xs text-muted-foreground">{importStageDetails}</p>
```

## Common Utilities

### Date Handling
```typescript
// date-fns for date operations
import { parseISO, isValid, differenceInDays } from 'date-fns';

const date = parseISO(dateString);
if (isValid(date)) {
  const days = differenceInDays(new Date(), date);
}
```

### Data Sanitization
```typescript
// Remove undefined values before database operations
const cleanData = { ...data };
Object.keys(cleanData).forEach(key => {
  if (cleanData[key] === undefined) {
    delete cleanData[key];
  }
});
```

### Search Implementation
```typescript
// Client-side search with lowercase comparison
const searchLower = searchTerm.toLowerCase();
const filtered = items.filter(item =>
  (item.name && item.name.toLowerCase().includes(searchLower)) ||
  (item.description && item.description.toLowerCase().includes(searchLower))
);
```

## Best Practices Summary

### DO:
- ✅ Use TypeScript strict mode with explicit types
- ✅ Use Immer's produce() for nested state updates
- ✅ Implement proper error handling with user feedback
- ✅ Use async/await for asynchronous operations
- ✅ Memoize expensive computations and callbacks
- ✅ Provide loading states for async operations
- ✅ Use path aliases (@/*) for imports
- ✅ Follow consistent naming conventions
- ✅ Use "use client" directive for client components
- ✅ Implement proper cleanup in useEffect
- ✅ Use toast notifications for user feedback
- ✅ Cache frequently accessed data
- ✅ Process large datasets in chunks
- ✅ Validate and sanitize data before operations

### DON'T:
- ❌ Mutate state directly (always use set() or produce())
- ❌ Use `any` type without justification
- ❌ Ignore error handling in async operations
- ❌ Forget to set loading states back to false
- ❌ Use inline styles (use Tailwind classes)
- ❌ Create deeply nested component structures
- ❌ Forget cleanup functions in useEffect
- ❌ Use magic numbers (define constants)
- ❌ Leave console.log statements in production code
- ❌ Skip type definitions for function parameters
- ❌ Use var (always use const/let)
- ❌ Forget to handle edge cases (null, undefined, empty arrays)

## Code Review Checklist

Before committing code, ensure:
1. ✅ All TypeScript errors resolved
2. ✅ ESLint warnings addressed
3. ✅ Proper error handling implemented
4. ✅ Loading states managed correctly
5. ✅ User feedback provided (toasts, progress)
6. ✅ Types explicitly defined
7. ✅ Imports organized and using path aliases
8. ✅ No unused variables or imports
9. ✅ Consistent naming conventions followed
10. ✅ Comments added for complex logic
11. ✅ Proper cleanup in effects
12. ✅ Accessibility attributes included
