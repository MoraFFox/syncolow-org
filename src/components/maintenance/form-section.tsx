"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronDown, Check, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    status?: 'pending' | 'complete' | 'error';
    collapsible?: boolean;
    defaultOpen?: boolean;
}

export function FormSection({
    title,
    description,
    icon: Icon,
    children,
    className,
    status = 'pending',
    collapsible = false,
    defaultOpen = true,
    ...props
}: FormSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    const statusStyles = {
        pending: "border-l-transparent",
        complete: "border-l-primary bg-primary/5",
        error: "border-l-destructive bg-destructive/5"
    };

    const StatusIcon = () => {
        if (status === 'complete') return <Check className="h-4 w-4 text-primary" />;
        if (status === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
        return null;
    };

    const Wrapper = collapsible ? Collapsible : 'div';
    const wrapperProps = collapsible ? { open: isOpen, onOpenChange: setIsOpen } : {};

    return (
        <Wrapper
            className={cn(
                "group relative overflow-hidden rounded-xl border border-border/50 bg-background/50",
                "transition-all duration-300 hover:border-border/80 hover:shadow-sm",
                "animate-in fade-in slide-in-from-bottom-2 duration-500",
                // Status indicator line
                "border-l-[3px]",
                statusStyles[status],
                className
            )}
            {...props}
            {...wrapperProps}
        >
            <div className={cn(
                "flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-3",
                collapsible && "cursor-pointer hover:bg-muted/30 transition-colors"
            )}>
                {/* Trigger if collapsible */}
                {collapsible ? (
                    <CollapsibleTrigger asChild>
                        <div className="flex flex-1 items-center gap-3 w-full">
                            {Icon && (
                                <div className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm border border-border/50 transition-colors",
                                    status === 'error' ? "bg-destructive/10 text-destructive" :
                                        status === 'complete' ? "bg-primary/10 text-primary border-primary/20" :
                                            "bg-background text-muted-foreground group-hover:text-primary"
                                )}>
                                    <Icon className="h-4.5 w-4.5" />
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold leading-none tracking-tight font-display text-[15px]">{title}</h3>
                                    <StatusIcon />
                                </div>
                                {description && (
                                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[90%]">{description}</p>
                                )}
                            </div>
                            <ChevronDown className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen ? "rotate-180" : ""
                            )} />
                        </div>
                    </CollapsibleTrigger>
                ) : (
                    <>
                        {Icon && (
                            <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm border border-border/50 transition-colors",
                                status === 'error' ? "bg-destructive/10 text-destructive" :
                                    status === 'complete' ? "bg-primary/10 text-primary border-primary/20" :
                                        "bg-background text-muted-foreground group-hover:text-primary"
                            )}>
                                <Icon className="h-4.5 w-4.5" />
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold leading-none tracking-tight font-display text-[15px]">{title}</h3>
                                <StatusIcon />
                            </div>
                            {description && (
                                <p className="text-xs text-muted-foreground font-mono">{description}</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {collapsible ? (
                <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                    <div className="p-4 sm:p-5 space-y-4">
                        {children}
                    </div>
                </CollapsibleContent>
            ) : (
                <div className="p-4 sm:p-5 space-y-4">
                    {children}
                </div>
            )}
        </Wrapper>
    );
}
