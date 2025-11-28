import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DrillCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  onHeaderMouseDown?: React.MouseEventHandler;
  children: React.ReactNode;
}

export function DrillCard({ 
  title, 
  headerActions, 
  onHeaderMouseDown, 
  children, 
  className,
  ...props 
}: DrillCardProps) {
  return (
    <Card 
      className={cn(
        "w-72 shadow-xl border-primary/20 bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80",
        className
      )}
      {...props}
    >
      <CardHeader 
        className={cn(
          "p-3 pb-2 flex flex-row items-center justify-between space-y-0",
          onHeaderMouseDown && "cursor-move"
        )}
        onMouseDown={onHeaderMouseDown}
      >
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {title}
        </CardTitle>
        {headerActions && (
          <div className="flex items-center gap-1">
            {headerActions}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 overflow-hidden">
        <div className="overflow-hidden">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
