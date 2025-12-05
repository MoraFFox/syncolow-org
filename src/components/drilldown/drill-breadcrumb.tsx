"use client";

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useDrillDownStore, DrillHistoryItem } from '@/store/use-drilldown-store';
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

  const getLabel = (item: DrillHistoryItem) => {
    const p = item.payload as any;
    if (p.name) return p.name;
    if (p.title) return p.title;
    if (p.clientName) return p.clientName;
    if (p.value) return p.value; // for revenue
    if (p.id) return `${item.kind} #${String(p.id).slice(0, 6)}`;
    return item.kind;
  };

  if (history.length === 0) return null;

  // Show current path: up to 3 previous items + current
  const visibleHistory = history.slice(0, historyIndex + 1);
  const breadcrumbs = visibleHistory.slice(Math.max(0, visibleHistory.length - 4));

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <div className="flex items-center gap-1 mr-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          disabled={!canGoBack()}
          className="h-7 w-7"
          title="Go back (Alt+Left)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleForward}
          disabled={!canGoForward()}
          className="h-7 w-7"
          title="Go forward (Alt+Right)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap overflow-hidden mask-linear-fade">
        {historyIndex > 3 && <span className="mx-1">...</span>}
        {breadcrumbs.map((item, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return (
            <div key={item.timestamp} className="flex items-center">
              {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 opacity-50" />}
              <span 
                className={cn(
                  "max-w-[120px] truncate transition-colors",
                  isLast ? "font-medium text-foreground" : "hover:text-foreground cursor-pointer"
                )}
                onClick={() => {
                  if (!isLast) {
                    // Placeholder for future navigation logic
                    const realIndex = history.findIndex(h => h.timestamp === item.timestamp);
                    if (realIndex !== -1) {
                        // logic to be implemented
                    }
                  }
                }}
              >
                {getLabel(item)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
