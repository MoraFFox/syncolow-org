/**
 * Security Dashboard
 *
 * Real-time security overview showing active threats,
 * IP blocks, and critical alerts.
 */

'use client';

import {
    ShieldAlert, ShieldCheck, Lock, Globe,
    Activity, Users, AlertOctagon, Ban
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <ShieldAlert className="text-rose-500 w-8 h-8" />
                        Security Center
                    </h1>
                    <p className="text-zinc-400">
                        Real-time threat detection and access control monitoring.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-rose-900 bg-rose-950/30 text-rose-500 animate-pulse px-3 py-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
                        Live Monitoring Active
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Threat Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6" />
                            LOW
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">No active critical threats detected.</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Bans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <Ban className="w-6 h-6 text-zinc-500" />
                            3
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">IP addresses currently blocked.</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Failed Auth (1h)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500 flex items-center gap-2">
                            <Lock className="w-6 h-6" />
                            42
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Spike detected in last 15m.</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500 flex items-center gap-2">
                            <Users className="w-6 h-6" />
                            128
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Globally distributed.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Security Events</CardTitle>
                        <CardDescription>Latest security-relevant activities across the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { type: 'failed_login', ip: '192.168.1.45', region: 'US-East', time: '2m ago', level: 'medium' },
                                { type: 'port_scan', ip: '45.22.11.99', region: 'CN', time: '14m ago', level: 'high' },
                                { type: 'rate_limit', ip: '10.0.0.5', region: 'Internal', time: '1h ago', level: 'low' },
                            ].map((event, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            event.level === 'high' ? "bg-rose-500" :
                                                event.level === 'medium' ? "bg-amber-500" : "bg-blue-500"
                                        )} />
                                        <div>
                                            <div className="font-medium text-sm text-zinc-200 capitalize">{event.type.replace('_', ' ')}</div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> {event.ip} • {event.region}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">{event.time}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Blocked IPs</CardTitle>
                        <CardDescription>Currently enforced firewall rules.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {['203.0.113.1', '198.51.100.23', '45.33.22.11'].map((ip) => (
                                <div key={ip} className="flex items-center justify-between text-sm p-2 rounded bg-rose-950/10 border border-rose-900/30">
                                    <span className="font-mono text-zinc-300">{ip}</span>
                                    <Badge variant="destructive" className="bg-rose-950 text-rose-500 border-rose-900">Blocked</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Minimal utility for conditional classes if not available in scope
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
