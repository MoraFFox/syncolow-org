"use client";

import React from 'react';
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { MarqueeText } from "@/components/ui/marquee-text";

interface MetricCardProps {
    title: string;
    value: string | number;
    description?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
        label?: string;
        comparisonValue?: string | number;
    };
    drivers?: {
        label: string;
        value: string;
        trend: 'up' | 'down' | 'neutral';
    }[];
    sparklineData?: { value: number }[];
    icon?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    loading?: boolean;
    variant?: 'default' | 'compact' | 'hero';
}

function AnimatedNumber({ value }: { value: string | number }) {
    return (
        <motion.span
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="block w-full"
        >
            <MarqueeText delay={0.5} className="font-mono tracking-tighter">
                {value}
            </MarqueeText>
        </motion.span>
    );
}

export function MetricCard({
    title,
    value,
    description,
    trend,
    drivers,
    sparklineData,
    icon,
    className,
    onClick,
    loading = false,
    variant = 'default'
}: MetricCardProps) {
    const isPositive = trend?.direction === 'up';
    const isNeutral = trend?.direction === 'neutral';

    // Tactical colors
    const trendColor = isNeutral
        ? "text-zinc-500"
        : isPositive
            ? "text-emerald-400"
            : "text-rose-400";

    const chartColor = isNeutral
        ? "#71717a" // zinc-500
        : isPositive
            ? "#10b981" // emerald-500
            : "#fb7185"; // rose-400

    // Variant scaling
    const isHero = variant === 'hero';
    const isCompact = variant === 'compact';

    return (
        <Card
            onClick={onClick}
            className={cn(
                "relative overflow-hidden bg-black/40 border-zinc-800/60 transition-all duration-500 group cursor-pointer",
                "backdrop-blur-md",
                isHero ? "p-6" : isCompact ? "p-3" : "p-4",
                className
            )}
        >
            {/* Holographic Border Gradient */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Active Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        {isHero && <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />}
                        {title}
                    </CardTitle>
                    {icon && !isHero && (
                        <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    {loading ? (
                        <div className="h-8 w-24 bg-zinc-800/50 animate-pulse rounded-sm" />
                    ) : (
                        <div className={cn(
                            "font-bold font-mono tracking-tighter text-white tabular-nums leading-none",
                            isHero ? "text-5xl md:text-6xl py-2" : isCompact ? "text-2xl" : "text-3xl"
                        )}>
                            <AnimatedNumber value={value} />
                        </div>
                    )}

                    {/* Description / Subtext */}
                    {description && !loading && !isCompact && (
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                            {description}
                        </p>
                    )}

                    <div className={cn("flex items-end justify-between mt-2", isHero ? "h-16" : "h-8")}>
                        {/* Trend Indicator */}
                        {trend && !loading && (
                            <div className="flex flex-col justify-end">
                                <div className={cn("flex items-center text-xs font-mono", trendColor)}>
                                    {trend.direction === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> :
                                        trend.direction === 'down' ? <ArrowDown className="h-3 w-3 mr-1" /> :
                                            <Minus className="h-3 w-3 mr-1" />}
                                    <span className="font-bold">
                                        {isPositive ? "+" : ""}{trend.value.toFixed(1)}%
                                    </span>
                                </div>
                                {trend.comparisonValue && !isCompact && (
                                    <span className="text-[10px] text-zinc-600 mt-0.5 ml-0.5">
                                        PREV: {trend.comparisonValue}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Sparkline */}
                        {sparklineData && sparklineData.length > 0 && !loading && (
                            <div className={cn(
                                "relative opacity-60 group-hover:opacity-100 transition-all duration-500",
                                isHero ? "w-48 h-full" : "w-24 h-full"
                            )}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineData}>
                                        <defs>
                                            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={chartColor}
                                            fill={`url(#gradient-${title})`}
                                            strokeWidth={1.5}
                                            isAnimationActive={true}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Drivers (Hero Only) */}
                    {isHero && drivers && drivers.length > 0 && !loading && (
                        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex gap-4">
                            {drivers.map((d, i) => (
                                <div key={i} className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-zinc-500 uppercase">{d.label}</span>
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "text-xs font-mono font-bold",
                                            d.trend === 'up' ? "text-emerald-400" : d.trend === 'down' ? "text-rose-400" : "text-zinc-400"
                                        )}>
                                            {d.value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 border-t border-r border-zinc-500" />
            </div>
            <div className="absolute bottom-0 left-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 border-b border-l border-zinc-500" />
            </div>
        </Card >
    );
}

export const MemoizedMetricCard = React.memo(MetricCard);
