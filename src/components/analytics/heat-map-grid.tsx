"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HeatMapItem {
    id: string;
    label: string;
    value: number; // 0 to 1 scale relative to max
    displayValue: string;
    trend?: 'up' | 'down' | 'neutral';
}

interface HeatMapGridProps {
    title: string;
    items: HeatMapItem[];
    className?: string;
}

export function HeatMapGrid({ title, items, className }: HeatMapGridProps) {
    // Sort by value desc to have the "hot" items first (optional, but looks better usually)
    // or just keep original order. Let's keep original order but map to grid.

    return (
        <div className={cn(
            "flex flex-col h-full bg-zinc-900/20 border border-zinc-800/50 rounded-xl overflow-hidden backdrop-blur-sm",
            className
        )}>
            <div className="px-4 py-3 border-b border-zinc-800/50 flex justify-between items-center bg-black/40">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">{title}</h3>
                <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-sm bg-emerald-500/20" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-500/50" />
                    <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                </div>
            </div>

            <div className="flex-1 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto">
                {items.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="group relative flex flex-col justify-between p-3 rounded-md border border-zinc-800/30 overflow-hidden cursor-crosshair min-h-[80px]"
                    >
                        {/* Background Intensity */}
                        <div
                            className="absolute inset-0 bg-emerald-500 transition-opacity duration-500"
                            style={{ opacity: 0.05 + (item.value * 0.25) }}
                        />

                        {/* Hover Highlight */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative z-10 flex justify-between items-start">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase truncate max-w-[80%]">
                                {item.label}
                            </span>
                            {item.trend === 'up' && <span className="text-[9px] text-emerald-400">▲</span>}
                            {item.trend === 'down' && <span className="text-[9px] text-rose-400">▼</span>}
                        </div>

                        <div className="relative z-10 mt-auto">
                            <span className="text-sm font-bold text-zinc-200 tracking-tight block">
                                {item.displayValue}
                            </span>
                            {/* Bar Visual */}
                            <div className="w-full h-0.5 bg-zinc-800 mt-1.5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value * 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {items.length === 0 && (
                    <div className="col-span-full flex items-center justify-center h-24 text-zinc-600 text-xs italic">
                        NO SIGNAL
                    </div>
                )}
            </div>
        </div>
    );
}
