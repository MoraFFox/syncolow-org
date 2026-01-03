"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogWrapperProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    className?: string;
}

const MAX_WIDTHS = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
};

export function FormDialogWrapper({
    isOpen,
    onOpenChange,
    title,
    description,
    children,
    footer,
    maxWidth = "lg",
    className,
}: FormDialogWrapperProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    MAX_WIDTHS[maxWidth],
                    "p-0 gap-0 overflow-hidden border-border/60 shadow-xl flex flex-col max-h-[90vh]", // Added flex col and max-h for proper layout
                    "data-[state=open]:slide-in-from-bottom-5 data-[state=closed]:slide-out-to-bottom-5",
                    "sm:rounded-xl", // Industrial aesthetic: rounded corners only on sm+
                    "h-full sm:h-auto", // Full height on mobile
                    className
                )}
                onInteractOutside={(e) => {
                    // Prevent closing when interacting with popovers/commands inside
                    if (e.target instanceof HTMLElement && e.target.closest('[cmdk-root], [role="dialog"]')) {
                        e.preventDefault();
                    }
                }}
            >
                <div className="bg-muted/10 border-b border-border/40 p-4 sm:p-6 pb-4 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight font-display">{title}</DialogTitle>
                        {description && (
                            <DialogDescription className="text-muted-foreground mt-1.5 font-mono text-xs">
                                {description}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="bg-muted/20 border-t border-border/40 p-4 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 shrink-0">
                        {footer}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
