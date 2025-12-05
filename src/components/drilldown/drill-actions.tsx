import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check, Loader2 } from 'lucide-react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown/registry';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DrillActionsProps {
  kind: DrillKind;
  payload: DrillPayload;
  variant?: "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DrillActions({ kind, payload, variant = "outline", size = "sm" }: DrillActionsProps) {
  const { addToCompare, compareItems, toggleCompareMode } = useDrillDownStore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const registryEntry = DRILL_REGISTRY[kind];
  const quickActions = registryEntry?.quickActions ? registryEntry.quickActions(payload as any) : [];

  return (
    <>
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className={cn(
          "mt-3 pt-3 border-t flex gap-2",
          isMobile ? "flex-col space-y-2" : "flex-row"
        )}>
          {quickActions.map((action, idx) => {
            const isLoading = actionLoading === action.label;
            const isSuccess = actionSuccess === action.label;
            
            return (
              <Button
                key={idx}
                size={size}
                variant={isSuccess ? "secondary" : variant}
                className={cn(
                  "flex-1 pointer-events-auto transition-all duration-300",
                  isMobile ? "h-10 text-sm px-3" : "h-7 text-xs",
                  isSuccess && "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                )}
                disabled={isLoading || isSuccess}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isMobile && navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  setActionLoading(action.label);
                  try {
                    await action.onClick();
                    setActionLoading(null);
                    setActionSuccess(action.label);
                    // Reset success state after 2s
                    setTimeout(() => setActionSuccess(null), 2000);
                  } catch (err) {
                    setActionLoading(null);
                    toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
                  }
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : isSuccess ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  action.icon
                )}
                <span className="ml-1">{isSuccess ? "Done" : action.label}</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Compare Action */}
      <div className="mt-2 pt-2 border-t space-y-2">
        <Button
          size={size}
          variant={variant}
          className={cn(
            "w-full pointer-events-auto",
            isMobile ? "h-10 text-sm" : "h-7 text-xs"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile && navigator.vibrate) {
              navigator.vibrate(10);
            }
            if (compareItems.length === 0) toggleCompareMode();
            if (compareItems.length >= 4) {
              toast({ title: 'Limit reached', description: 'Max 4 items', variant: 'destructive' });
              return;
            }
            if (compareItems.length > 0 && compareItems[0].kind !== kind) {
              toast({ title: 'Type mismatch', description: 'Same type only', variant: 'destructive' });
              return;
            }
            addToCompare(kind, payload);
            toast({ title: 'Added to comparison' });
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Compare
        </Button>
      </div>
    </>
  );
}
