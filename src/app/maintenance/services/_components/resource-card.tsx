
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Box, Wrench, AlertTriangle, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UsageStats } from '../_hooks/use-catalog-usage-stats';
import type { CatalogItem } from './service-part-form-dialog';

interface ResourceCardProps {
    type: 'service' | 'part' | 'problem';
    data: any; // Allow any resource item for now and handle internal mapping
    stats?: UsageStats;
    onEdit: (type: 'service' | 'part' | 'problem', item: any) => void;
    onDelete: (type: 'service' | 'part' | 'problem', item: any) => void;
    className?: string;
}

export function ResourceCard({ type, data, stats, onEdit, onDelete, className }: ResourceCardProps) {
    const isProblem = type === 'problem';
    const Icon = isProblem ? AlertTriangle : type === 'service' ? Wrench : Box;
    // Map fields based on actual structure of the database items
    const name = isProblem ? (data.problem || data.name) : data.name;
    const category = data.category;

    // Formatting
    const costValue = type === 'part' ? (data.defaultPrice || data.price) : (data.defaultCost || data.cost);
    const hasCost = !isProblem && typeof costValue === 'number';

    return (
        <div className={cn(
            "group relative flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md animate-in fade-in zoom-in-95 duration-300",
            className
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50",
                        isProblem ? "text-red-500 bg-red-500/10 border-red-200" :
                            type === 'service' ? "text-blue-500 bg-blue-500/10 border-blue-200" :
                                "text-amber-500 bg-amber-500/10 border-amber-200"
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold leading-none tracking-tight">{name}</h3>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                {category}
                            </Badge>
                        </div>
                        {hasCost && (
                            <div className="mt-1.5 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                <span>{(costValue as number).toLocaleString()} EGP</span>
                            </div>
                        )}
                        {isProblem && (
                            <p className="mt-1 text-xs text-muted-foreground">Standardized Issue</p>
                        )}
                    </div>
                </div>

                {/* Actions (visible on hover or focus) */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(type, data)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(type, data)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Times Used
                    </span>
                    <span className="text-lg font-bold">{stats?.count || 0}</span>
                </div>
                {!isProblem && (
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Total Generated
                        </span>
                        <span className="text-lg font-bold">{(stats?.totalSpend || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">EGP</span></span>
                    </div>
                )}
            </div>

            {!isProblem && stats?.lastUsed && (
                <div className="absolute top-5 right-5 hidden sm:block">
                    {/* Could put something here, or just stick to footer */}
                </div>
            )}

            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                {stats?.lastUsed ? (
                    <>
                        <Calendar className="h-3 w-3" />
                        Last used {formatDistanceToNow(stats.lastUsed)} ago
                    </>
                ) : (
                    <span className="opacity-50">Never used</span>
                )}
            </div>
        </div>
    );
}
