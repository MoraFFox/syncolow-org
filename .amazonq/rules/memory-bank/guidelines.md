# Development Guidelines

## Code Quality Standards

### File Organization
- **"use client" directive**: Always place at the top of client components (first line)
- **Import grouping**: Organize imports in logical order:
  1. React and core libraries
  2. Third-party UI libraries (Radix, Lucide icons)
  3. Internal components (@/components/ui/*)
  4. Internal utilities and services (@/lib/*, @/hooks/*)
  5. Type imports (type keyword for type-only imports)
- **No unused imports**: All imports must be used in the file

### Naming Conventions
- **Components**: PascalCase (e.g., CsvImporterDialog, PriceRangeFilter)
- **Files**: kebab-case for component files (e.g., csv-importer-dialog.tsx, price-range-filter.tsx)
- **Hooks**: camelCase with "use" prefix (e.g., useToast, useCarousel, useMaintenanceStore)
- **Store files**: kebab-case with "use-" prefix (e.g., use-maintenance-store.ts)
- **Types/Interfaces**: PascalCase (e.g., MaintenanceState, PriceRangeFilterProps)
- **Constants**: UPPER_SNAKE_CASE (e.g., TOAST_LIMIT, INITIAL_SERVICES_CATALOG)
- **Variables/Functions**: camelCase (e.g., handleFileChange, fetchInitialData)

### TypeScript Standards
- **Strict typing**: Always define explicit types for props, state, and function parameters
- **Interface over type**: Use interface for component props (e.g., interface PriceRangeFilterProps)
- **Type keyword**: Use type for unions, intersections, and complex types
- **Optional parameters**: Use ? for optional props (e.g., className?: string)
- **Type imports**: Use type keyword for type-only imports (e.g., import type { MaintenanceVisit })
- **Generic types**: Properly type generic functions and hooks (e.g., create<MaintenanceState>)
- **Avoid any**: Never use any type without explicit justification
- **Null handling**: Explicitly handle null/undefined cases (e.g., || [], || null)

## React Patterns

### Component Structure
1. **"use client" directive** (if client component)
2. **Imports** (grouped logically)
3. **Type definitions** (interfaces, types)
4. **Constants** (outside component)
5. **Component function**
6. **Hooks** (at top of component)
7. **State declarations**
8. **Callbacks and handlers**
9. **Effects**
10. **Render logic**
11. **Return JSX**
12. **Display name** (for forwardRef components)
13. **Exports**

### Hook Usage
- **Hook order**: Always call hooks in the same order at the top of components
- **Custom hooks**: Extract reusable logic into custom hooks (e.g., useCarousel, useToast)
- **useCallback**: Wrap event handlers and callbacks with useCallback for optimization
  ```typescript
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    // handler logic
  }, [dependencies]);
  ```
- **useMemo**: Use for expensive computations
  ```typescript
  const allErrorsResolved = useMemo(() => {
    // computation logic
  }, [errors, resolvedErrors]);
  ```
- **useEffect**: Use for side effects, always specify dependencies
  ```typescript
  useEffect(() => {
    // effect logic
    return () => {
      // cleanup
    };
  }, [dependencies]);
  ```

### State Management
- **useState**: For local component state
  ```typescript
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>('upload');
  ```
- **Zustand stores**: For global state with create pattern
  ```typescript
  export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
    // state
    maintenanceVisits: [],
    loading: true,
    // actions
    fetchInitialData: async () => { /* ... */ },
  }));
  ```
- **Immer integration**: Use produce for immutable updates in Zustand
  ```typescript
  set(produce((state: MaintenanceState) => {
    state.problemsCatalog[category].push(problem);
  }));
  ```

### Event Handlers
- **Naming**: Prefix with "handle" (e.g., handleFileChange, handleSubmit)
- **Type safety**: Always type event parameters
  ```typescript
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
  };
  ```
- **Async handlers**: Use async/await pattern
  ```typescript
  const handleParseAndMap = useCallback(async () => {
    try {
      const data = await parseFile(file);
      // process data
    } catch (error: any) {
      toast({ title: 'Error', description: error.message });
    }
  }, [file]);
  ```

## Component Patterns

### Props Interface Pattern
```typescript
interface ComponentNameProps {
  // Required props first
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  entityType: ImportableEntityType;
  // Optional props with defaults
  fileType?: 'csv' | 'excel';
  className?: string;
}

export function ComponentName({
  isOpen,
  onOpenChange,
  entityType,
  fileType = 'csv', // default value
  className = ''
}: ComponentNameProps) {
  // component logic
}
```

### ForwardRef Pattern
```typescript
const ComponentName = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CustomProps
>(({ className, children, ...props }, ref) => {
  // component logic
  return (
    <div ref={ref} className={cn("base-classes", className)} {...props}>
      {children}
    </div>
  );
});
ComponentName.displayName = "ComponentName";
```

### Context Pattern
```typescript
const ComponentContext = React.createContext<ContextProps | null>(null);

function useComponent() {
  const context = React.useContext(ComponentContext);
  if (!context) {
    throw new Error("useComponent must be used within a <Component />");
  }
  return context;
}
```

## Styling Patterns

### Tailwind CSS Usage
- **cn utility**: Always use cn() from @/lib/utils for conditional classes
  ```typescript
  className={cn(
    "base-classes",
    condition && "conditional-classes",
    className // allow prop override
  )}
  ```
- **Responsive design**: Use responsive prefixes (sm:, md:, lg:)
  ```typescript
  className="grid grid-cols-1 md:grid-cols-2 gap-4"
  ```
- **Dark mode**: Use dark: prefix for dark mode styles
  ```typescript
  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
  ```

### Component Composition
- **Spread props**: Always spread remaining props with {...props}
- **Children prop**: Accept and render children when appropriate
- **Ref forwarding**: Use forwardRef for components that need ref access

## Data Fetching & API Patterns

### Supabase Integration
```typescript
// Fetch data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Insert data
await supabase.from('table_name').insert(data);

// Update data
await supabase.from('table_name').update(data).eq('id', id);

// Delete data
await supabase.from('table_name').delete().eq('id', id);
```

### Error Handling
- **Try-catch blocks**: Wrap async operations
  ```typescript
  try {
    const result = await asyncOperation();
    // success handling
  } catch (error: any) {
    console.error("Error:", error);
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
  ```
- **Toast notifications**: Use toast for user feedback
  ```typescript
  toast({ 
    title: "Success", 
    description: "Operation completed successfully" 
  });
  
  toast({ 
    title: "Error", 
    description: error.message, 
    variant: 'destructive' 
  });
  ```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await fetchFromAPI();
    // process data
  } finally {
    setLoading(false);
  }
};
```

## State Update Patterns

### Immutable Updates
```typescript
// Array updates
setItems(prev => [...prev, newItem]); // add
setItems(prev => prev.filter(item => item.id !== id)); // remove
setItems(prev => prev.map(item => item.id === id ? updated : item)); // update

// Object updates
setState(prev => ({ ...prev, key: value }));

// Set updates
setSet(prev => new Set(prev).add(value));
setSet(prev => {
  const newSet = new Set(prev);
  newSet.delete(value);
  return newSet;
});
```

### Zustand Store Updates
```typescript
// Direct set
set({ loading: false, data: newData });

// Functional update
set(state => ({ ...state, count: state.count + 1 }));

// Immer produce
set(produce((state: StateType) => {
  state.nested.property = value;
  state.array.push(item);
}));

// Get current state
const currentState = get();
```

## Form Handling

### React Hook Form Pattern
```typescript
import { useForm, Controller } from 'react-hook-form';

const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>();

// Register input
<Input {...register('fieldName')} />

// Controller for custom components
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => (
    <Select onValueChange={field.onChange} value={field.value}>
      {/* options */}
    </Select>
  )}
/>

// Error display
{errors.fieldName && (
  <p className="text-sm text-destructive">{errors.fieldName.message}</p>
)}
```

## Performance Optimization

### Memoization
- **React.memo**: Wrap components that receive same props frequently
- **useCallback**: Memoize callbacks passed to child components
- **useMemo**: Memoize expensive computations

### Conditional Rendering
```typescript
// Preferred: Early return
if (!data) return null;

// Conditional rendering
{condition && <Component />}
{condition ? <ComponentA /> : <ComponentB />}

// Null coalescing
{data?.property || 'default'}
```

## Testing Patterns

### Component Testing
- Test files co-located with source: `__tests__/` folder or `.test.ts` suffix
- Use Vitest for unit tests
- Use Playwright for E2E tests

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Brief description of the function
 * 
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 * 
 * @example
 * const result = functionName(value1, value2);
 */
```

### Inline Comments
- Explain "why", not "what"
- Use for complex logic or non-obvious decisions
- Keep comments concise and up-to-date

## Common Utilities

### cn() - Class Name Utility
```typescript
import { cn } from "@/lib/utils";

className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === "primary" && "primary-classes",
  className // prop override
)}
```

### Date Handling
```typescript
import { parseISO, isValid, differenceInDays, format } from 'date-fns';

const date = parseISO(dateString);
if (isValid(date)) {
  const formatted = format(date, 'yyyy-MM-dd');
}
```

## Accessibility

### ARIA Attributes
```typescript
<div
  role="region"
  aria-roledescription="carousel"
  aria-label="Descriptive label"
>
  {/* content */}
</div>
```

### Semantic HTML
- Use semantic elements (button, nav, main, article, etc.)
- Provide sr-only text for screen readers
  ```typescript
  <span className="sr-only">Descriptive text</span>
  ```

## File Structure Best Practices

### Component Files
- One component per file (except small related sub-components)
- Co-locate types and interfaces with component
- Export component as named export or default based on usage

### Store Files
- One store per domain (e.g., use-maintenance-store.ts)
- Include all related actions in the store
- Use TypeScript interfaces for state shape

### Utility Files
- Group related utilities together
- Export individual functions
- Include JSDoc comments for public APIs

## Error Prevention

### Type Guards
```typescript
if (typeof value === 'string') {
  // TypeScript knows value is string here
}

if (Array.isArray(value)) {
  // TypeScript knows value is array here
}
```

### Null Checks
```typescript
// Optional chaining
const value = object?.property?.nested;

// Nullish coalescing
const result = value ?? defaultValue;

// Array safety
const items = data || [];
```

### Validation
- Use Zod for runtime validation
- Validate user input before processing
- Check API responses for expected structure

## Code Review Checklist

Before committing code, ensure:
- ✅ No TypeScript errors or warnings
- ✅ ESLint passes with no errors
- ✅ All imports are used
- ✅ Proper error handling in place
- ✅ Loading states handled
- ✅ User feedback via toast notifications
- ✅ Responsive design implemented
- ✅ Accessibility attributes added
- ✅ Comments explain complex logic
- ✅ Tests written for new functionality
