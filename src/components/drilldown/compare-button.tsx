"use client";

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { useToast } from '@/hooks/use-toast';

interface CompareButtonProps {
  kind: DrillKind;
  payload: DrillPayload;
}

export function CompareButton({ kind, payload }: CompareButtonProps) {
  const { addToCompare, compareItems, toggleCompareMode } = useDrillDownStore();
  const { toast } = useToast();

  const handleAdd = () => {
    if (compareItems.length === 0) toggleCompareMode();
    
    if (compareItems.length >= 4) {
      toast({ title: 'Limit reached', description: 'Maximum 4 items can be compared', variant: 'destructive' });
      return;
    }
    
    if (compareItems.length > 0 && compareItems[0].kind !== kind) {
      toast({ title: 'Type mismatch', description: 'Can only compare same entity types', variant: 'destructive' });
      return;
    }
    
    addToCompare(kind, payload);
    toast({ title: 'Added to comparison', description: `${kind} added` });
  };

  return (
    <Button size="sm" variant="outline" onClick={handleAdd}>
      <Plus className="h-3 w-3 mr-1" />
      Compare
    </Button>
  );
}
