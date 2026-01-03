"use client";

import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Terminal, Wifi, Cpu, ShieldCheck } from "lucide-react";

interface CommandConsoleProps {
    className?: string;
}

export function CommandConsole({ className }: CommandConsoleProps) {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div className={cn(
            "flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-2",
            "bg-black/80 border-t border-b border-zinc-800/50 backdrop-blur-md",
            "font-mono text-[10px] tracking-widest text-zinc-500 uppercase select-none",
            className
        )}>
            {/* Left Sector: System Identity */}
            <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 text-emerald-500/80">
                    <Terminal className="h-3 w-3" />
                    <span>SYS.ADMIN_ROOT</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-300">ONLINE</span>
                </div>
                <div className="h-3 w-[1px] bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                    <Wifi className="h-3 w-3" />
                    <span>LATENCY: 12ms</span>
                </div>
            </div>

            {/* Center Sector: Decorative Data Stream */}
            <div className="hidden md:flex items-center gap-1 opacity-40">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1 h-3 bg-zinc-600 rounded-[1px]"
                        style={{ opacity: Math.random() }}
                    />
                ))}
            </div>

            {/* Right Sector: Environment Stats */}
            <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-zinc-400" />
                    <span>SECURE</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-zinc-400" />
                    <span>MEM: 42%</span>
                </div>
                <div className="h-3 w-[1px] bg-zinc-800" />
                <div className="text-zinc-300 font-bold">
                    {currentTime}
                </div>
            </div>
        </div>
    );
}
