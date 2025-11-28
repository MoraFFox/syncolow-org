"use client";

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function DrillBreadcrumb() {
  const router = useRouter();
  const { history, historyIndex, goBack, goForward, canGoBack, canGoForward } = useDrillDownStore();

  const handleBack = () => {
    const item = goBack();
    if (item) router.push(item.route);
  };

  const handleForward = () => {
    const item = goForward();
    if (item) router.push(item.route);
  };

  if (history.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        disabled={!canGoBack()}
        className="h-8 w-8"
        title="Go back (Alt+Left)"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleForward}
        disabled={!canGoForward()}
        className="h-8 w-8"
        title="Go forward (Alt+Right)"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {history.slice(Math.max(0, historyIndex - 2), historyIndex + 1).map((item, idx, arr) => (
          <span key={item.timestamp} className={cn(idx === arr.length - 1 && "font-medium text-foreground")}>
            {item.kind}
          </span>
        ))}
      </div>
    </div>
  );
}
