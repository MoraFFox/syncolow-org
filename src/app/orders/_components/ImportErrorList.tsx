
import { useState, useMemo } from 'react';
import { ImportRowError } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Sparkles, ChevronDown } from 'lucide-react';

interface ImportErrorListProps {
  errors: ImportRowError[];
  onFix: (error: ImportRowError) => void;
  resolvedErrors: Set<number>;
}

// Performance: Only show this many errors initially
const INITIAL_VISIBLE = 20;
const LOAD_MORE_COUNT = 20;

export function ImportErrorList({ errors, onFix, resolvedErrors }: ImportErrorListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Memoize to avoid recalculation on every render
  const { visibleErrors, remainingCount, totalUnresolved } = useMemo(() => {
    const visible = errors.slice(0, visibleCount);
    const remaining = Math.max(0, errors.length - visibleCount);
    const unresolved = errors.filter(e => !resolvedErrors.has(e.rowIndex)).length;
    return { visibleErrors: visible, remainingCount: remaining, totalUnresolved: unresolved };
  }, [errors, visibleCount, resolvedErrors]);

  if (errors.length === 0) {
    return null;
  }

  const handleShowMore = () => {
    setVisibleCount(prev => prev + LOAD_MORE_COUNT);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Validation Errors Found</h3>
          <p className="text-sm text-muted-foreground">
            {totalUnresolved} of {errors.length} errors need resolution
          </p>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {visibleErrors.map((error, index) => {
          const isResolved = resolvedErrors.has(error.rowIndex);
          return (
            <div
              key={`error-${error.rowIndex}-${index}`}
              className={cn(
                "flex items-start justify-between p-3 border rounded-md gap-4 transition-colors",
                isResolved
                  ? "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50"
                  : "bg-destructive/5 border-destructive/20"
              )}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {isResolved ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Row {error.rowIndex + 1}</p>
                  <p className={cn(
                    "text-sm truncate",
                    isResolved ? "text-muted-foreground" : "text-destructive"
                  )}>
                    {error.errorMessage}
                  </p>
                  {/* Simplified preview - no JSON.stringify for performance */}
                  {error.originalData && !isResolved && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {error.resolution?.suggestedData?.name && (
                        <span className="font-medium">{error.resolution.suggestedData.name}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {!isResolved && error.resolution?.type === 'create-entity' && (
                <Button onClick={() => onFix(error)} size="sm" variant="outline" className="flex-shrink-0">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Fix
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {remainingCount > 0 && (
        <Button
          variant="ghost"
          onClick={handleShowMore}
          className="w-full text-muted-foreground"
        >
          <ChevronDown className="mr-2 h-4 w-4" />
          Show {Math.min(LOAD_MORE_COUNT, remainingCount)} more ({remainingCount} remaining)
        </Button>
      )}
    </div>
  );
}
