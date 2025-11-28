import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useToast } from '@/hooks/use-toast';

interface DrillActionsProps {
  kind: DrillKind;
  payload: DrillPayload;
}

export function DrillActions({ kind, payload }: DrillActionsProps) {
  const { addToCompare, compareItems, toggleCompareMode } = useDrillDownStore();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const registryEntry = DRILL_REGISTRY[kind];
  const quickActions = registryEntry?.quickActions ? registryEntry.quickActions(payload as any) : [];

  return (
    <>
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs pointer-events-auto"
              disabled={actionLoading === action.label}
              onClick={async (e) => {
                e.stopPropagation();
                setActionLoading(action.label);
                try {
                  await action.onClick();
                  toast({ title: action.label, description: 'Action completed' });
                } catch (err) {
                  toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
                } finally {
                  setActionLoading(null);
                }
              }}
            >
              {action.icon}
              <span className="ml-1">{action.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Compare Action */}
      <div className="mt-2 pt-2 border-t space-y-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
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
