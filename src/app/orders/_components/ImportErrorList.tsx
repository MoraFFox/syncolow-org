
import { ImportRowError } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

interface ImportErrorListProps {
  errors: ImportRowError[];
  onFix: (error: ImportRowError) => void;
  resolvedErrors: Set<number>;
}

export function ImportErrorList({ errors, onFix, resolvedErrors }: ImportErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Validation Errors Found</h3>
      <p className="text-sm text-muted-foreground">
        The following rows in your CSV could not be validated. Please resolve them to proceed.
      </p>
      {errors.map((error, index) => {
        const isResolved = resolvedErrors.has(error.rowIndex);
        return (
          <div
            key={index}
            className={cn(
              "flex items-start justify-between p-3 border rounded-md gap-4 transition-colors",
              "animate-in fade-in-0",
              isResolved ? "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50" : "bg-destructive/5 border-destructive/20"
            )}
          >
            <div className="flex items-start gap-3">
               {isResolved ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">Row {error.rowIndex + 1}</p>
                <p className={cn("text-sm", isResolved ? "text-muted-foreground" : "text-destructive")}>{error.errorMessage}</p>
                <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-2 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(error.originalData, null, 2)}</pre>
              </div>
            </div>
            {!isResolved && error.resolution?.type === 'create-entity' && (
              <Button onClick={() => onFix(error)} size="sm" className="flex-shrink-0">
                <Sparkles className="mr-2 h-4 w-4"/>
                Fix
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
