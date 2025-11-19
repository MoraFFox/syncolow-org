
"use client";

import { useState } from 'react';
import { Building, Package, ShoppingCart, Wrench, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface SpeedDialFabProps {
    onClientClick: () => void;
    onOrderClick: () => void;
    onProductClick: () => void;
    onMaintenanceClick: () => void;
}

export function SpeedDialFab({ onClientClick, onOrderClick, onProductClick, onMaintenanceClick }: SpeedDialFabProps) {
    const [open, setOpen] = useState(false);
    const actions = [
        { icon: Wrench, label: 'Maintenance', onClick: onMaintenanceClick },
        { icon: Package, label: 'Product', onClick: onProductClick },
        { icon: ShoppingCart, label: 'Order', onClick: onOrderClick },
        { icon: Building, label: 'Company', onClick: onClientClick },
    ];

    return (
        <div className={cn("fixed bottom-20 right-4 z-20", !open && "pointer-events-none")}>
            <div className="relative flex flex-col items-center gap-3">
                 {actions.map((action, index) => (
                    <div
                        key={action.label}
                        className={cn(
                            "transition-all duration-300 ease-in-out flex items-center justify-end w-full",
                            open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
                        )}
                        style={{ transitionDelay: open ? `${(actions.length - 1 - index) * 50}ms` : `${index * 50}ms` }}
                    >
                         <span className="text-popover-foreground text-sm font-semibold mr-3 whitespace-nowrap bg-muted px-2 py-1 rounded-md shadow-md">
                            {action.label}
                        </span>
                        <Button
                            className="rounded-full w-12 h-12"
                            variant="secondary"
                            size="icon"
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                        >
                            <action.icon className="h-5 w-5" />
                        </Button>
                    </div>
                ))}

                <Button
                    className="rounded-full w-14 h-14 shadow-lg self-end pointer-events-auto"
                    size="icon"
                    onClick={() => setOpen(!open)}
                    variant="default"
                >
                    <Plus className={cn("absolute h-7 w-7 transition-all duration-300", open ? "rotate-45 scale-0" : "rotate-0 scale-100")} />
                    <X className={cn("absolute h-7 w-7 transition-all duration-300", open ? "rotate-0 scale-100" : "-rotate-45 scale-0")} />
                </Button>
            </div>
        </div>
    )
}
