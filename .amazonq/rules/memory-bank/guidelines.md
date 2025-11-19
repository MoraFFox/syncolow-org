# Development Guidelines

## Code Quality Standards

### File Headers & Formatting
- **Format Pragma**: Use `/** @format */` at the top of files (observed in 1/5 files)
- **"use client" Directive**: Required for client-side React components (observed in 4/5 files)
- **Consistent Spacing**: 2-space indentation throughout the codebase
- **Line Length**: Keep lines readable, break long imports and function signatures appropriately

### Import Organization
- **Grouped Imports**: Organize imports in logical groups:
  1. External libraries (React, third-party packages)
  2. Firebase/Firestore imports
  3. Internal types from `@/lib/types`
  4. Internal utilities from `@/lib/*`
  5. Store imports from `@/store/*`
  6. Component imports from `@/components/*`
  7. Hook imports from `@/hooks/*`
- **Path Aliases**: Always use `@/` prefix for internal imports
- **Type Imports**: Use `import type` for TypeScript types when importing only types

### Naming Conventions
- **Components**: PascalCase with descriptive names (e.g., `CsvImporterDialog`, `PriceRangeFilter`)
- **Files**: kebab-case for component files (e.g., `csv-importer-dialog.tsx`, `price-range-filter.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `useToast`, `useCarousel`, `useOrderStore`)
- **Functions**: camelCase with descriptive verb-noun patterns (e.g., `handleFileChange`, `calculateNextDeliveryDate`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `CHUNK_SIZE`)
- **Type Aliases**: PascalCase (e.g., `CarouselApi`, `ToasterToast`, `ImportStage`)
- **Interfaces**: PascalCase with descriptive suffixes (e.g., `AppState`, `CarouselProps`, `PriceRangeFilterProps`)

### TypeScript Standards
- **Strict Typing**: Always define explicit types for props, state, and function parameters
- **Type Inference**: Let TypeScript infer return types when obvious
- **Interface vs Type**: Use interfaces for component props, types for unions and complex types
- **Generic Types**: Use generics for reusable patterns (e.g., `React.forwardRef<HTMLDivElement, Props>`)
- **Optional Properties**: Use `?` for optional props and parameters
- **Type Guards**: Implement proper type checking before operations
- **Avoid Any**: Never use `any` type - use `unknown` or proper types

## React Patterns

### Component Structure
- **Functional Components**: Use function declarations with React.FC or explicit typing
- **Props Interface**: Define props interface immediately before component
- **Component Organization**:
  1. Props interface/type definition
  2. Component function declaration
  3. State declarations (useState, useReducer)
  4. Refs (useRef)
  5. Context usage (useContext)
  6. Custom hooks
  7. useEffect hooks
  8. Event handlers
  9. Helper functions
  10. Render logic
- **Display Names**: Set displayName for forwardRef components (e.g., `Carousel.displayName = "Carousel"`)

### State Management Patterns
- **Zustand Stores**: Use Zustand for global state with Immer for immutable updates
  ```typescript
  export const useOrderStore = create<AppState>((set, get) => ({
    // State properties
    orders: [],
    loading: false,
    
    // Actions
    fetchOrders: async () => {
      set({ loading: true });
      // Logic here
      set({ loading: false });
    },
    
    // Immer for complex updates
    updateOrder: (id, data) => {
      set(produce((state: AppState) => {
        const order = state.orders.find(o => o.id === id);
        if (order) {
          Object.assign(order, data);
        }
      }));
    }
  }));
  ```

- **Local State**: Use useState for component-specific state
- **Derived State**: Use useMemo for computed values
- **State Updates**: Use functional updates when depending on previous state

### Hooks Patterns
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Hook Dependencies**: Always specify complete dependency arrays
- **Cleanup Functions**: Return cleanup functions from useEffect when needed
- **Hook Composition**: Build complex hooks from simpler ones

### Context Pattern
- **Context Creation**: Create context with null default and custom hook
  ```typescript
  const CarouselContext = React.createContext<CarouselContextProps | null>(null);
  
  function useCarousel() {
    const context = React.useContext(CarouselContext);
    if (!context) {
      throw new Error("useCarousel must be used within a <Carousel />");
    }
    return context;
  }
  ```

### Event Handlers
- **Naming**: Prefix with "handle" (e.g., `handleFileChange`, `handleSliderChange`)
- **useCallback**: Wrap handlers in useCallback with proper dependencies
- **Async Handlers**: Use async/await for asynchronous operations
- **Error Handling**: Always wrap async operations in try/catch blocks

## Firebase Integration

### Firestore Operations
- **Batch Operations**: Use writeBatch for multiple writes
  ```typescript
  const batch = writeBatch(db);
  items.forEach(item => {
    batch.update(doc(db, 'collection', item.id), item.data);
  });
  await batch.commit();
  ```

- **Transactions**: Use runTransaction for atomic operations
- **Query Patterns**: Use query builders with proper constraints
  ```typescript
  const q = query(
    collection(db, 'orders'),
    where('status', '==', 'Pending'),
    orderBy('orderDate', 'desc'),
    limit(20)
  );
  ```

- **Pagination**: Implement cursor-based pagination with startAfter
- **Data Mapping**: Always map Firestore docs to typed objects
  ```typescript
  const orders = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
  ```

### Firebase Best Practices
- **Collection References**: Use collection() and doc() helpers
- **Incremental Updates**: Use increment() for counters
- **Null Handling**: Set null explicitly for optional fields
- **Timestamps**: Use ISO strings for dates (toISOString())
- **Error Handling**: Catch and handle Firebase errors gracefully

## UI Component Patterns

### shadcn/ui Integration
- **Component Composition**: Build complex components from shadcn primitives
- **Variant Props**: Use variant props for component variations
- **Forwarding Refs**: Use React.forwardRef for DOM access
- **Spread Props**: Spread remaining props to underlying elements
  ```typescript
  const Component = React.forwardRef<HTMLDivElement, Props>(
    ({ className, variant, ...props }, ref) => {
      return <div ref={ref} className={cn(baseClass, className)} {...props} />;
    }
  );
  ```

### Styling Patterns
- **cn Utility**: Use cn() from @/lib/utils for conditional classes
  ```typescript
  className={cn(
    "base-classes",
    condition && "conditional-classes",
    className
  )}
  ```

- **Tailwind Classes**: Use Tailwind utility classes exclusively
- **Responsive Design**: Use responsive prefixes (sm:, md:, lg:)
- **Dark Mode**: Use dark: prefix for dark mode variants
- **Dynamic Classes**: Use cn() for dynamic class composition

### Dialog/Modal Patterns
- **Controlled State**: Use controlled open/onOpenChange pattern
- **State Reset**: Reset internal state when dialog closes
- **Multi-Step Flows**: Use stage/step state for complex workflows
- **Footer Actions**: Place primary actions in DialogFooter

### Form Patterns
- **Controlled Inputs**: Use controlled components with state
- **Validation**: Validate on change and on submit
- **Error Display**: Show inline errors near inputs
- **Loading States**: Disable inputs and show loading indicators during submission

## Data Handling

### Async Operations
- **Loading States**: Always track loading state for async operations
- **Error States**: Track and display errors appropriately
- **Toast Notifications**: Use toast for user feedback
  ```typescript
  try {
    setLoading(true);
    await operation();
    toast({ title: 'Success', description: 'Operation completed' });
  } catch (error) {
    toast({ 
      title: 'Error', 
      description: error.message, 
      variant: 'destructive' 
    });
  } finally {
    setLoading(false);
  }
  ```

### Data Transformation
- **Type Safety**: Cast data to proper types after fetching
- **Null Safety**: Handle null/undefined values explicitly
- **Default Values**: Provide sensible defaults for optional fields
- **Data Sanitization**: Clean data before submission
  ```typescript
  const sanitizedItems = items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    taxRate: item.taxRate || 0,
    discountValue: item.discountValue || null
  }));
  ```

### Pagination & Infinite Scroll
- **Cursor-Based**: Use lastDoc cursor for pagination
- **hasMore Flag**: Track if more data is available
- **Load More**: Implement loadMore function with proper state management

## Performance Optimization

### Memoization
- **useMemo**: Memoize expensive computations
  ```typescript
  const allErrorsResolved = useMemo(() => {
    const blockingErrorIndexes = new Set(errors.filter(e => e.blocking).map(e => e.rowIndex));
    return Array.from(blockingErrorIndexes).every(index => resolvedErrors.has(index));
  }, [errors, resolvedErrors]);
  ```

- **useCallback**: Memoize callback functions
- **React.memo**: Memoize components when appropriate

### Chunking & Batching
- **Large Operations**: Split into chunks to avoid limits
  ```typescript
  const CHUNK_SIZE = 500;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await processChunk(chunk);
  }
  ```

- **Progress Tracking**: Update progress during chunked operations
- **Error Recovery**: Handle partial failures gracefully

## Error Handling

### User-Facing Errors
- **Toast Notifications**: Use toast for immediate feedback
- **Error Messages**: Provide clear, actionable error messages
- **Variant Types**: Use 'destructive' variant for errors
- **Duration**: Set appropriate duration for error toasts

### Developer Errors
- **Console Logging**: Log errors to console for debugging
- **Error Boundaries**: Implement error boundaries for component trees
- **Validation Errors**: Collect and display validation errors clearly
- **Error Recovery**: Provide retry mechanisms where appropriate

### Error Logging
- **Detailed Logs**: Maintain detailed error logs for debugging
- **Timestamps**: Include timestamps in error logs
- **Error Context**: Capture relevant context with errors
- **Export Logs**: Allow users to download error logs

## Code Documentation

### JSDoc Comments
- **Function Documentation**: Document complex functions with JSDoc
- **Parameter Descriptions**: Describe non-obvious parameters
- **Return Values**: Document return value types and meanings
- **Examples**: Include usage examples for complex APIs

### Inline Comments
- **Why Not What**: Explain why, not what the code does
- **Complex Logic**: Comment complex algorithms and business logic
- **TODOs**: Mark incomplete work with TODO comments
- **Warnings**: Use comments to warn about gotchas

## Testing Considerations

### Component Testing
- **Test User Interactions**: Test button clicks, form submissions
- **Test State Changes**: Verify state updates correctly
- **Test Error States**: Test error handling and display
- **Test Loading States**: Verify loading indicators appear

### Integration Testing
- **Test Data Flow**: Verify data flows through components
- **Test API Integration**: Mock Firebase calls and test responses
- **Test Store Integration**: Test Zustand store actions and state

## Common Patterns

### Conditional Rendering
```typescript
{stage === 'upload' && <UploadUI />}
{stage === 'loading' && <LoadingSpinner />}
{errors.length > 0 && <ErrorList errors={errors} />}
```

### List Rendering
```typescript
{items.map((item, index) => (
  <ItemComponent key={item.id || index} item={item} />
))}
```

### Async Data Fetching
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchFromFirebase();
      setData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

### Store Actions Pattern
```typescript
// In store
fetchData: async () => {
  set({ loading: true });
  try {
    const data = await getData();
    set({ data, loading: false });
  } catch (e) {
    set({ loading: false });
    toast({ title: 'Error', variant: 'destructive' });
  }
}
```

## Accessibility

### ARIA Attributes
- **Roles**: Use appropriate ARIA roles (e.g., `role="region"`, `role="group"`)
- **Labels**: Provide aria-roledescription for custom components
- **Screen Reader Text**: Use sr-only class for screen reader only text
  ```typescript
  <span className="sr-only">Previous slide</span>
  ```

### Keyboard Navigation
- **Keyboard Handlers**: Implement keyboard event handlers
- **Focus Management**: Manage focus appropriately in modals and dialogs
- **Tab Order**: Ensure logical tab order

## File Organization

### Component Files
- **Single Responsibility**: One main component per file
- **Sub-components**: Export related sub-components from same file
- **Barrel Exports**: Use index files for grouped exports

### Utility Files
- **Pure Functions**: Keep utilities as pure functions
- **Single Purpose**: Each utility file has a clear purpose
- **Type Exports**: Export types alongside utilities

### Store Files
- **Feature-Based**: One store per feature domain
- **Complete State**: Include all related state and actions
- **Type Safety**: Fully type store state and actions
