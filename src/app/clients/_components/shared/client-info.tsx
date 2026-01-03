"use client";

import { Building, GitBranch } from 'lucide-react';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { cn } from '@/lib/utils';
import type { ListItem } from '@/lib/types';

interface ClientInfoProps {
    item: ListItem;
    showIndustry?: boolean;
    className?: string;
}

export function ClientInfo({ item, showIndustry = true, className }: ClientInfoProps) {
    const isParent = !item.isBranch;

    return (
        <div className={cn("flex flex-col justify-center min-w-0", className)}>
            <div className="flex items-center gap-3">
                {item.isBranch && (
                    <div className="flex items-center self-stretch py-1">
                        <div className="w-3 h-3 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-sm" />
                    </div>
                )}
                <div className={cn(
                    "flex items-center gap-2 truncate",
                    !isParent && "text-muted-foreground text-sm"
                )}>
                    {!item.isBranch ? (
                        <div className="p-1 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                            <Building className="h-3.5 w-3.5" />
                        </div>
                    ) : (
                        <div className="p-1 rounded bg-muted/20 text-muted-foreground shrink-0">
                            <GitBranch className="h-3.5 w-3.5" />
                        </div>
                    )}
                    <DrillTarget kind="company" payload={{ id: item.id, name: item.name }} asChild>
                        <span className={cn(
                            "truncate cursor-pointer hover:text-primary transition-colors tracking-tight",
                            isParent ? "font-semibold text-base text-foreground" : "font-medium"
                        )}>
                            {item.name}
                        </span>
                    </DrillTarget>
                </div>
            </div>
            {item.industry && isParent && showIndustry && (
                <div className="flex items-center gap-2 mt-1 ml-7">
                    <span className="text-xs uppercase text-muted-foreground bg-muted/20 px-2 py-1 rounded-md font-mono tracking-wider border border-border/20">
                        {item.industry}
                    </span>
                </div>
            )}
        </div>
    );
}