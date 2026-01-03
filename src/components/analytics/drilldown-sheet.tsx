'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { DrilldownState } from "@/hooks/use-analytics-drilldown";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DrilldownSheetProps {
    state: DrilldownState;
    onClose: () => void;
}

export function DrilldownSheet({ state, onClose }: DrilldownSheetProps) {
    const { isOpen, label, data, loading, type } = state;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] border-l-zinc-800 bg-black/95 backdrop-blur-xl">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl font-mono text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        SECTOR ANALYSIS
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400">
                        Detailed records for <span className="font-bold text-white max-w-[300px] truncate inline-block align-bottom">{label}</span>
                    </SheetDescription>
                </SheetHeader>

                <div className="relative h-[calc(100vh-120px)] overflow-auto rounded-md border border-zinc-800 bg-zinc-900/20">
                    <Table>
                        <TableHeader className="bg-zinc-900/50 sticky top-0 backdrop-blur-sm z-10">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead className="text-zinc-500 font-mono text-xs w-[80px]">ORDER ID</TableHead>
                                <TableHead className="text-zinc-500 font-mono text-xs">CLIENT</TableHead>
                                <TableHead className="text-zinc-500 font-mono text-xs text-right">VALUE</TableHead>
                                <TableHead className="text-zinc-500 font-mono text-xs text-right w-[90px]">STATUS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`} className="border-zinc-800/50">
                                        <TableCell><div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data && data.length > 0 ? (
                                data.map((record: any) => (
                                    <TableRow key={record.id} className="border-zinc-800/50 hover:bg-zinc-900/40 transition-colors cursor-pointer group">
                                        <TableCell className="font-mono text-xs text-zinc-400 group-hover:text-emerald-400 transition-colors">
                                            {record.id}
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-300">
                                            {record.customer}
                                            <div className="text-[10px] text-zinc-500">{record.items} items</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">
                                            ${record.total}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={cn(
                                                "font-mono text-[10px] uppercase border px-1.5 py-0 h-5",
                                                record.status === 'Completed' ? "border-emerald-900 text-emerald-500 bg-emerald-950/20" :
                                                    record.status === 'Processing' ? "border-amber-900 text-amber-500 bg-amber-950/20" :
                                                        "border-zinc-800 text-zinc-500"
                                            )}>
                                                {record.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-zinc-500 font-mono text-xs">
                                        NO RECORDS FOUND
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </SheetContent>
        </Sheet>
    );
}
