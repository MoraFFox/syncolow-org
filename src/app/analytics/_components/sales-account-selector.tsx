"use client";

import { useSalesAccountStore } from "@/store/use-sales-account-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Globe, Building2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SalesAccountSelectorProps {
    selectedAccountId: string;
    onSelectAccount: (id: string) => void;
    className?: string;
}

export function SalesAccountSelector({
    selectedAccountId,
    onSelectAccount,
    className,
}: SalesAccountSelectorProps) {
    const { accounts } = useSalesAccountStore();

    const selectedAccount = selectedAccountId === 'all'
        ? { name: 'Global Command', codes: ['ALL'] }
        : accounts.find(a => a.id === selectedAccountId);

    return (
        <div className={cn("relative z-20", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-12 border-zinc-800 bg-zinc-950/50 backdrop-blur-xl text-zinc-100 min-w-[280px] justify-between relative overflow-hidden group hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <div className={cn(
                                "h-6 w-6 rounded-md flex items-center justify-center border",
                                selectedAccountId === 'all'
                                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"
                                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            )}>
                                {selectedAccountId === 'all' ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span className="text-xs uppercase font-mono text-zinc-500 tracking-wider">Target Sector</span>
                                <span className="font-bold tracking-tight text-sm uppercase">
                                    {selectedAccount?.name || 'Unknown Sector'}
                                </span>
                            </div>
                        </div>

                        <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-[280px] bg-zinc-950 border-zinc-800 text-zinc-300 shadow-2xl p-2"
                    align="start"
                >
                    <div className="px-2 py-1.5 text-xs font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900 mb-2 flex justify-between">
                        <span>Available Nodes</span>
                        <span>{accounts.length + 1} INT</span>
                    </div>

                    <DropdownMenuItem
                        onClick={() => onSelectAccount('all')}
                        className="flex items-center gap-3 p-3 focus:bg-zinc-900 focus:text-white cursor-pointer rounded-md border border-transparent focus:border-indigo-500/30 mb-1"
                    >
                        <div className="h-8 w-8 rounded flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Globe className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="font-bold text-sm">Global Command</span>
                            <span className="text-xs text-zinc-500 font-mono">ALL DATA STREAMS</span>
                        </div>
                        {selectedAccountId === 'all' && <Check className="h-4 w-4 text-indigo-400" />}
                    </DropdownMenuItem>

                    {accounts.map((account) => (
                        <DropdownMenuItem
                            key={account.id}
                            onClick={() => onSelectAccount(account.id)}
                            className="flex items-center gap-3 p-3 focus:bg-zinc-900 focus:text-white cursor-pointer rounded-md border border-transparent focus:border-emerald-500/30 mb-1 group"
                        >
                            <div
                                className="h-8 w-8 rounded flex items-center justify-center border transition-colors"
                                style={{
                                    backgroundColor: `${account.color}20`,
                                    borderColor: `${account.color}40`,
                                    color: account.color
                                }}
                            >
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="font-bold text-sm group-hover:text-emerald-300 transition-colors">{account.name}</span>
                                <span className="text-xs text-zinc-500 font-mono">CODE: {account.codes[0]}</span>
                            </div>
                            {selectedAccountId === account.id && <Check className="h-4 w-4 text-emerald-400" />}
                            {/* Fake 'trend' indicator for vibe */}
                            <TrendingUp className="h-3 w-3 text-emerald-500/0 group-hover:text-emerald-500/100 transition-all opacity-0 group-hover:opacity-100" />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
