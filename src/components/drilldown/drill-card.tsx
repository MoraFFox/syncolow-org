import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind } from '@/lib/drilldown-types';

interface DrillCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  kind?: DrillKind | string | null;
  headerActions?: React.ReactNode;
  onHeaderMouseDown?: React.MouseEventHandler;
  children: React.ReactNode;
  isMobile?: boolean;
}

const getThemeStyles = (kind?: DrillKind | string | null, theme?: string) => {
  // Glass theme: More transparency, stronger blur
  if (theme === 'glass') {
    if (!kind) return "border-white/20 dark:border-white/10";
    switch (kind) {
      case 'company': case 'customer': case 'feedback': case 'notification':
        return "border-blue-400/20 shadow-blue-500/20";
      case 'order': case 'maintenance': case 'barista': case 'branch':
        return "border-amber-400/20 shadow-amber-500/20";
      case 'revenue': case 'payment':
        return "border-emerald-400/20 shadow-emerald-500/20";
      case 'product': case 'manufacturer': case 'inventory': case 'category':
        return "border-slate-400/20 shadow-slate-500/20";
      default:
        return "border-white/20 dark:border-white/10";
    }
  }
  
  // Solid theme: Opaque backgrounds, no blur
  if (theme === 'solid') {
    if (!kind) return "border-border bg-background";
    switch (kind) {
      case 'company': case 'customer': case 'feedback': case 'notification':
        return "border-blue-500/50 bg-blue-50 dark:bg-blue-950";
      case 'order': case 'maintenance': case 'barista': case 'branch':
        return "border-amber-500/50 bg-amber-50 dark:bg-amber-950";
      case 'revenue': case 'payment':
        return "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950";
      case 'product': case 'manufacturer': case 'inventory': case 'category':
        return "border-slate-500/50 bg-slate-50 dark:bg-slate-950";
      default:
        return "border-border bg-background";
    }
  }
  
  // Default theme
  if (!kind) return "border-primary/20";
  switch (kind) {
    case 'company': case 'customer': case 'feedback': case 'notification':
      return "border-blue-500/30 shadow-blue-500/10 bg-blue-50/5 dark:bg-blue-950/10";
    case 'order': case 'maintenance': case 'barista': case 'branch':
      return "border-amber-500/30 shadow-amber-500/10 bg-amber-50/5 dark:bg-amber-950/10";
    case 'revenue': case 'payment':
      return "border-emerald-500/30 shadow-emerald-500/10 bg-emerald-50/5 dark:bg-emerald-950/10";
    case 'product': case 'manufacturer': case 'inventory': case 'category':
      return "border-slate-500/30 shadow-slate-500/10 bg-slate-50/5 dark:bg-slate-950/10";
    default:
      return "border-primary/20";
  }
};

const getHeaderGradient = (kind?: DrillKind | string | null) => {
  if (!kind) return "";
  
  switch (kind) {
    case 'company': case 'customer': case 'feedback': case 'notification':
      return "bg-gradient-to-r from-blue-500/10 to-transparent text-blue-700 dark:text-blue-300";
    case 'order': case 'maintenance': case 'barista': case 'branch':
      return "bg-gradient-to-r from-amber-500/10 to-transparent text-amber-700 dark:text-amber-300";
    case 'revenue': case 'payment':
      return "bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-700 dark:text-emerald-300";
    case 'product': case 'manufacturer': case 'inventory': case 'category':
      return "bg-gradient-to-r from-slate-500/10 to-transparent text-slate-700 dark:text-slate-300";
    default:
      return "";
  }
};

const getBaseStyles = (theme?: string) => {
  if (theme === 'glass') {
    return "shadow-2xl bg-popover/60 backdrop-blur-xl supports-[backdrop-filter]:bg-popover/40";
  }
  if (theme === 'solid') {
    return "shadow-lg";
  }
  return "shadow-xl bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80";
};

export function DrillCard({ 
  title, 
  kind,
  headerActions, 
  onHeaderMouseDown, 
  children, 
  className,
  isMobile: propIsMobile,
  ...props 
}: DrillCardProps) {
  const isMobileHook = useIsMobile();
  const { settings } = useDrillDownStore();
  const isMobile = propIsMobile ?? isMobileHook;
  const themeStyles = getThemeStyles(kind, settings.previewTheme);
  const headerGradient = getHeaderGradient(kind);
  const baseStyles = getBaseStyles(settings.previewTheme);

  return (
    <Card 
      className={cn(
        baseStyles,
        themeStyles,
        isMobile ? "w-full shadow-lg border-x-0 rounded-none sm:rounded-xl sm:border-x" : "w-80",
        className
      )}
      {...props}
    >
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          isMobile ? "p-3 pb-2" : "p-3 pb-2",
          onHeaderMouseDown && "cursor-move",
          headerGradient
        )}
        onMouseDown={onHeaderMouseDown}
      >
        <CardTitle className="text-xs uppercase tracking-wider font-bold opacity-90">
          {title}
        </CardTitle>
        {headerActions && (
          <div className="flex items-center gap-1">
            {headerActions}
          </div>
        )}
      </CardHeader>
      <CardContent className={cn(
        "overflow-hidden",
        isMobile ? "p-3 pt-0 max-h-[calc(75vh-4rem)] overflow-y-auto" : "p-3 pt-0"
      )}>
        <div className="overflow-hidden">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
