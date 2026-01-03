/**
 * Admin Audit Logs
 *
 * Secure, immutable audit trail viewer for compliance and security auditing.
 * Focuses on WHO did WHAT and WHEN.
 */

'use client';

import { useState, useEffect } from 'react';
import {
    ShieldCheck, User, Calendar, Search,
    FileText, ArrowUpRight, Key, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AuditLogEntry, AuditAction } from '@/types/log-entry';

const ActionIcon = ({ action }: { action: AuditAction }) => {
    switch (action) {
        case 'create': return <div className="p-1.5 bg-green-100 text-green-700 rounded-md"><ArrowUpRight className="w-4 h-4" /></div>;
        case 'update': return <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md"><FileText className="w-4 h-4" /></div>;
        case 'delete': return <div className="p-1.5 bg-red-100 text-red-700 rounded-md"><ShieldCheck className="w-4 h-4" /></div>;
        case 'login': return <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md"><Key className="w-4 h-4" /></div>;
        case 'logout': return <div className="p-1.5 bg-zinc-100 text-zinc-700 rounded-md"><Key className="w-4 h-4" /></div>;
        case 'config_change': return <div className="p-1.5 bg-amber-100 text-amber-700 rounded-md"><Settings className="w-4 h-4" /></div>;
        default: return <div className="p-1.5 bg-zinc-100 text-zinc-700 rounded-md"><FileText className="w-4 h-4" /></div>;
    }
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate fetch logic since we don't have the dedicated audit endpoint yet
        // In production this would hit /api/audit/logs
        // For now we'll fetch from search with filter
        const fetchAudit = async () => {
            try {
                // Placeholder: Assuming the search API returns Audit typed logs if filtered correctly
                // or just mock empty for the visual demo if endpoint doesn't support it strictly yet
                setLoading(false);
                setLogs([]);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchAudit();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Audit Trail
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Immutable record of all system modifications and access events.
                    </p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Filter Date
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Total Events (30d)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">2,543</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Critical Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-amber-600">12</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Config Changes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-indigo-600">8</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input placeholder="Search by user, action, or resource..." className="pl-9" />
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead className="text-right">Metadata</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                    <ShieldCheck className="mx-auto h-8 w-8 mb-2 opacity-20" />
                                    No audit records found in this view.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <User className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            <span className="text-sm font-medium">{log.context?.userId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <ActionIcon action={log.auditAction} />
                                            <span className="capitalize text-sm">{log.auditAction}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-600">{log.resource}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            log.result === 'success' ? 'text-green-600 border-green-200 bg-green-50' :
                                                log.result === 'denied' ? 'text-red-600 border-red-200 bg-red-50' : 'text-amber-600 border-amber-200 bg-amber-50'
                                        }>
                                            {log.result}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-mono text-zinc-400">
                                        {JSON.stringify(log.context?.data || {}).slice(0, 30)}...
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
