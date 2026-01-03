"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Maximize2 } from "lucide-react";
import { ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface SmartChartProps {
    children: React.ReactElement;
    title?: string;
    description?: string;
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    height?: number | string;
    className?: string;
    headerAction?: React.ReactNode;
}

export function SmartChart({
    children,
    title,
    description,
    loading = false,
    error = null,
    empty = false,
    height = 350,
    className,
    headerAction,
}: SmartChartProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => setIsLoaded(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsLoaded(false);
        }
    }, [loading]);

    return (
        <div className={cn(
            "relative flex flex-col w-full bg-black/40 border border-zinc-800/60 rounded-xl overflow-hidden backdrop-blur-sm group",
            className
        )}>
            {/* Header */}
            {(title || headerAction) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 relative z-20 bg-black/20">
                    <div>
                        {title && (
                            <h3 className="text-sm font-bold font-mono text-zinc-200 tracking-widest uppercase flex items-center gap-2">
                                <span className={cn(
                                    "w-1 h-3 rounded-sm transition-colors duration-500",
                                    isLoaded ? "bg-emerald-500" : "bg-zinc-700"
                                )} />
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wide pl-3">
                                {description}
                            </p>
                        )}
                    </div>
                    {headerAction && (
                        <div className="flex items-center gap-2">
                            {headerAction}
                        </div>
                    )}

                    {/* Decorative Corner */}
                    <Maximize2 className="absolute top-4 right-4 h-3 w-3 text-zinc-800 group-hover:text-zinc-600 transition-colors" />
                </div>
            )}

            {/* Chart Body */}
            <div className="flex-1 w-full p-4 relative" style={{ height }}>
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                                <span className="text-[10px] font-mono text-emerald-500/80 animate-pulse">DECODING STREAM...</span>
                            </div>
                        </motion.div>
                    ) : error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-500 z-10 p-4 text-center">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-80" />
                            <p className="text-sm font-medium">SIGNAL LOST</p>
                            <p className="text-xs text-zinc-500 mt-1 max-w-[200px] font-mono">{error}</p>
                        </div>
                    ) : empty ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-10">
                            <p className="text-sm font-mono uppercase tracking-widest opacity-60">NO DATA SEGMENTS FOUND</p>
                        </div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.4 }}
                            className="w-full h-full"
                        >
                            {/* Decorative Grid Lines - Background Layer */}
                            <div className="absolute inset-0 pointer-events-none opacity-20"
                                style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                            />

                            <ResponsiveContainer width="100%" height="100%">
                                {React.cloneElement(children, {
                                    // Inject common chart props if needed, mostly handled by parent
                                })}
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export const MemoizedSmartChart = React.memo(SmartChart);
