'use client';

import { InventoryRiskItem } from "@/app/actions/analytics/types";
import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpoilageTickerProps {
    items?: InventoryRiskItem[];
    className?: string;
}

export function SpoilageTicker({ items, className }: SpoilageTickerProps) {
    if (!items || items.length === 0) return null;

    return (
        <div className={cn("w-full overflow-hidden bg-red-950/20 border-y border-red-900/30 relative h-10 flex items-center", className)}>

            {/* Label Badge */}
            <div className="absolute left-0 top-0 bottom-0 z-10 bg-red-950/80 backdrop-blur px-3 flex items-center gap-2 border-r border-red-900/50">
                <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-100 uppercase tracking-widest whitespace-nowrap">
                    Spoilage Risk
                </span>
            </div>

            {/* Gradient Masks */}
            <div className="absolute left-[120px] top-0 bottom-0 w-8 bg-gradient-to-r from-red-950/80 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-red-950/20 to-transparent z-10" />

            {/* Scrolling Content */}
            <div className="flex animate-marquee hover:pause whitespace-nowrap pl-[140px]">
                {[...items, ...items].map((item, i) => ( // Duplicate for seamless loop if needed, though simple animate-marquee usually needs distinct duplicate
                    <div key={`${item.id}-${i}`} className="inline-flex items-center gap-3 mx-6">
                        <span className={cn(
                            "text-xs font-mono font-bold",
                            item.riskLevel === 'critical' ? "text-red-400" : "text-amber-400"
                        )}>
                            [{item.sku}]
                        </span>
                        <span className="text-xs text-zinc-300 font-medium">
                            {item.name}
                        </span>
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1",
                            item.riskLevel === 'critical'
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        )}>
                            <Clock className="h-3 w-3" />
                            {item.daysRemaining < 0 ? `EXPIRED ${Math.abs(item.daysRemaining)}d ago` : `${item.daysRemaining}d left`}
                        </span>

                        {/* Separator */}
                        <span className="text-zinc-800 text-xs">///</span>
                    </div>
                ))}
            </div>

            {/* Inline Style for keyframes if not in Tailwind config */}
            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .hover\\:pause:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
