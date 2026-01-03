import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Flame, ArrowUpRight, TrendingUp, TrendingDown, Minus, Users, ArrowRight, ChevronDown } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface ConsumptionItem {
    id: string;
    name: string;
    category: string;
    consumptionRate: number;
    totalUnits: number;
    trend: 'up' | 'down' | 'stable';
    topClients?: {
        id: string;
        name: string;
        quantity: number;
        percentage: number;
    }[];
}

interface ConsumptionRateListProps {
    data?: ConsumptionItem[];
    loading?: boolean;
    className?: string;
}

export function ConsumptionRateList({ data = [], loading = false, className }: ConsumptionRateListProps) {
    const router = useRouter();
    const [visibleCount, setVisibleCount] = useState(20);

    if (loading) {
        return (
            <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm h-full flex items-center justify-center", className)}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </Card>
        );
    }

    // Helper to render rows to avoid duplication
    const renderRow = (item: ConsumptionItem) => (
        <TableRow key={item.id} className="hover:bg-zinc-900/30 border-zinc-800/50 group">
            <TableCell className="py-2 text-xs font-medium text-zinc-300">
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div
                            className="flex flex-col cursor-pointer hover:bg-zinc-900/50 p-1 -m-1 rounded transition-colors"
                            onClick={() => router.push(`/products/${item.id}`)}
                        >
                            <span className="truncate max-w-[140px] text-zinc-300 group-hover:text-orange-400 transition-colors" title={item.name}>{item.name}</span>
                            <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                {item.category}
                                <ArrowRight className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                            </span>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-zinc-950 border-zinc-800 shadow-2xl p-0 overflow-hidden" align="start" sideOffset={8}>
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-orange-500" />
                                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Top Consumers</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">Based on selected period</span>
                        </div>
                        <div className="p-2 space-y-1">
                            {item.topClients && item.topClients.length > 0 ? (
                                item.topClients.map((client, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-zinc-900/50 group/client">
                                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                                            <span className="text-xs text-zinc-300 truncate" title={client.name}>{client.name}</span>
                                            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="bg-orange-500/50 h-full rounded-full"
                                                    style={{ width: `${Math.min(client.percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-mono font-medium text-zinc-200">{client.quantity.toLocaleString()}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono">{client.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-zinc-500">No client data available</div>
                            )}
                        </div>
                        <div className="p-2 border-t border-zinc-800 bg-zinc-900/20 text-center">
                            <span className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                                Click product to view full ledger <ArrowRight className="h-2 w-2" />
                            </span>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </TableCell>
            <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    <span className={cn(
                        "font-mono font-bold",
                        item.consumptionRate > 10 ? "text-orange-400" : "text-zinc-300"
                    )}>
                        {item.consumptionRate.toFixed(1)}
                    </span>
                    {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    {item.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {item.trend === 'stable' && <Minus className="h-3 w-3 text-zinc-600" />}
                </div>
            </TableCell>
            <TableCell className="py-2 text-xs font-mono text-zinc-400 text-right">
                {(item.totalUnits || 0).toLocaleString()}
            </TableCell>
        </TableRow>
    );

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden flex flex-col", className)}>
            <CardHeader className="pb-2 border-b border-zinc-800/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    High Velocity (Units/Day)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                    <TableHeader className="bg-zinc-900/50 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-zinc-800">
                            <TableHead className="text-[10px] h-8 text-zinc-500 font-mono text-left w-[40%]">Product</TableHead>
                            <TableHead className="text-[10px] h-8 text-zinc-500 font-mono text-right w-[30%]">Rate (U/Day)</TableHead>
                            <TableHead className="text-[10px] h-8 text-zinc-500 font-mono text-right w-[30%]">Monthly</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-xs text-zinc-600 font-mono">
                                    No velocity data available
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.slice(0, 6).map(renderRow)
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/30">
                <Sheet onOpenChange={(open) => { if (!open) setVisibleCount(20); }}>
                    <SheetTrigger asChild>
                        <button className="w-full text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                            View Full Consumption Report <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </SheetTrigger>
                    <SheetContent className="bg-zinc-950 border-l-zinc-800 w-[400px] sm:w-[540px] flex flex-col h-full p-0">
                        <div className="p-6 border-b border-zinc-800/50">
                            <SheetHeader>
                                <SheetTitle className="text-xl font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-orange-500" />
                                    Global Consumption Velocity
                                </SheetTitle>
                                <SheetDescription className="text-zinc-500 text-xs font-mono">
                                    Complete list of high-velocity stock items ranked by daily burn rate. Hover for client breakdown.
                                </SheetDescription>
                            </SheetHeader>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            <Table>
                                <TableHeader className="bg-zinc-900/80 backdrop-blur sticky top-0 z-20">
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead className="text-xs h-10 text-zinc-400 font-mono text-left w-[40%] pl-6">Product</TableHead>
                                        <TableHead className="text-xs h-10 text-zinc-400 font-mono text-right w-[25%]">Rate (U/Day)</TableHead>
                                        <TableHead className="text-xs h-10 text-zinc-400 font-mono text-right w-[25%] pr-6">Monthly Units</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.slice(0, visibleCount).map(renderRow)}
                                </TableBody>
                            </Table>
                            {visibleCount < data.length && (
                                <div className="p-4 flex justify-center border-t border-zinc-800/50 bg-zinc-900/20">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 20)}
                                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all font-mono uppercase tracking-wider"
                                    >
                                        Show More <ChevronDown className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </Card >
    );
}
