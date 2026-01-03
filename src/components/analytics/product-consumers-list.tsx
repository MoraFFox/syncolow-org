'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    DollarSign,
    Package,
    BarChart3
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Compatible interface with TopClient from server types
interface Consumer {
    id: string;
    name: string;
    quantity: number;
    percentage: number;
    totalSpent: number;
    lastActive: string;
    avgMonthlyConsumption?: number;
    projectedGrowth?: number;
}

interface ProductConsumersListProps {
    productId: string;
    initialConsumers: Consumer[];
}

export function ProductConsumersList({ productId, initialConsumers }: ProductConsumersListProps) {
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Safety check
    const safelyConsumers = Array.isArray(initialConsumers) ? initialConsumers : [];
    const displayedConsumers = safelyConsumers.slice(0, page * ITEMS_PER_PAGE);
    const hasMore = safelyConsumers.length > displayedConsumers.length;

    // Helper to format growth
    const formatGrowth = (growth?: number) => {
        if (growth === undefined) return { label: 'N/A', color: 'text-zinc-500', icon: Minus, bg: 'bg-zinc-500/10' };
        if (growth > 5) return { label: `+${growth.toFixed(1)}%`, color: 'text-emerald-400', icon: TrendingUp, bg: 'bg-emerald-500/10' };
        if (growth < -5) return { label: `${growth.toFixed(1)}%`, color: 'text-rose-400', icon: TrendingDown, bg: 'bg-rose-500/10' };
        return { label: `${growth.toFixed(1)}%`, color: 'text-zinc-400', icon: Minus, bg: 'bg-zinc-500/10' };
    };

    if (safelyConsumers.length === 0) {
        return (
            <Card className="bg-zinc-950/50 border-zinc-900 shadow-xl backdrop-blur-sm">
                <CardHeader className="border-b border-zinc-800/50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300 uppercase tracking-widest">
                        <Users className="w-4 h-4 text-violet-400" /> Top Consumers
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                    <Users className="w-12 h-12 opacity-20" />
                    <p className="text-xs font-mono">No consumer data available for this period.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-950/50 border-zinc-900 shadow-xl backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300 uppercase tracking-widest">
                        <Users className="w-4 h-4 text-violet-400" /> Top Consumers
                        <Badge variant="outline" className="ml-2 bg-zinc-900 border-zinc-700 text-zinc-400 text-[10px]">
                            {safelyConsumers.length} LISTED
                        </Badge>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800/50 text-[10px] uppercase font-mono text-zinc-500 tracking-wider bg-zinc-900/20">
                                <th className="p-4 font-medium">Client</th>
                                <th className="p-4 font-medium text-right">Volume</th>
                                <th className="p-4 font-medium text-right">Avg / Month</th>
                                <th className="p-4 font-medium text-right">Proj. Growth</th>
                                <th className="p-4 font-medium text-right">Value (LTV)</th>
                                <th className="p-4 font-medium text-right">Last Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/30">
                            {displayedConsumers.map((consumer, i) => {
                                const growth = formatGrowth(consumer.projectedGrowth);
                                const avgConsumption = consumer.avgMonthlyConsumption || 0;

                                return (
                                    <tr
                                        key={consumer.id}
                                        className="group hover:bg-zinc-900/30 transition-colors duration-200"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-zinc-700">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                                                        {consumer.name}
                                                    </div>
                                                    <div className="h-0.5 w-12 bg-zinc-800 mt-1 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-violet-500/50"
                                                            style={{ width: `${consumer.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-zinc-300 font-mono">
                                                    {consumer.quantity.toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-zinc-600">units</span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="p-1 rounded bg-zinc-900/50 border border-zinc-800">
                                                    <BarChart3 className="w-3 h-3 text-blue-400" />
                                                </div>
                                                <span className="text-sm font-mono text-zinc-300">
                                                    {avgConsumption.toFixed(1)}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border border-transparent ${growth.bg}`}>
                                                <growth.icon className={`w-3 h-3 ${growth.color}`} />
                                                <span className={`text-xs font-bold font-mono ${growth.color}`}>
                                                    {growth.label}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 text-emerald-400/90 font-mono text-xs font-bold bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30 w-fit ml-auto">
                                                <DollarSign className="w-3 h-3" />
                                                {consumer.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="text-xs text-zinc-400 font-mono flex items-center justify-end gap-1">
                                                <Calendar className="w-3 h-3 text-zinc-600" />
                                                {format(parseISO(consumer.lastActive), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {hasMore && (
                    <div className="p-4 border-t border-zinc-800/50 flex justify-center bg-zinc-900/10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            className="text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                        >
                            Load More Consumers
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
