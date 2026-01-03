'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopProduct } from "@/app/actions/analytics/types";
import { cn } from "@/lib/utils";
import { Trophy, ArrowUpRight } from "lucide-react";

interface TopProductsChartProps {
    data?: TopProduct[];
    className?: string;
    loading?: boolean;
}

export function TopProductsChart({ data, className, loading }: TopProductsChartProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[400px] flex items-center justify-center animate-pulse">
                    <Trophy className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    const maxRevenue = Math.max(...data.map(p => p.revenue));

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden flex flex-col", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" /> Top Revenue Drivers
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col gap-4 mt-2">
                    {data.slice(0, 8).map((product, index) => (
                        <div key={product.productId} className="group relative">
                            <div className="flex justify-between items-center mb-1 text-xs">
                                <span className="font-medium text-zinc-200 truncate max-w-[70%] group-hover:text-emerald-400 transition-colors">
                                    {index + 1}. {product.name}
                                </span>
                                <span className="font-mono text-emerald-500">
                                    ${product.revenue.toLocaleString()}
                                </span>
                            </div>
                            <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-0.5 text-[10px] text-zinc-600 font-mono">
                                <span>{product.quantity} units</span>
                                <span>{product.percentageOfTotal.toFixed(1)}% share</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            {/* Footer / CTA */}
            <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/30">
                <button className="w-full text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                    View Full Product Report <ArrowUpRight className="h-3 w-3" />
                </button>
            </div>
        </Card>
    );
}
