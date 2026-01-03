/**
 * Alerts Configuration
 *
 * Interface for managing alert rules and notification channels.
 */

'use client';

import { useState } from 'react';
import {
    Bell, Plus, Settings, Trash2, Edit2,
    Check, Mail, MessageSquare, AlertTriangle, Zap, OctagonAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { AlertSeverity } from '@/lib/alert-manager';

interface AlertRuleUI {
    id: string;
    name: string;
    condition: string;
    severity: AlertSeverity;
    enabled: boolean;
    channels: string[];
}

export default function AlertsPage() {
    const [rules, setRules] = useState<AlertRuleUI[]>([
        { id: '1', name: 'High Error Rate', condition: '> 5% errors in 5m', severity: 'critical', enabled: true, channels: ['Slack', 'Email'] },
        { id: '2', name: 'Slow API Response', condition: 'p95 > 2s', severity: 'warning', enabled: true, channels: ['Slack'] },
        { id: '3', name: 'Brute Force Detection', condition: '> 10 failed logins', severity: 'critical', enabled: true, channels: ['PagerDuty', 'Email'] },
    ]);

    const toggleRule = (id: string, checked: boolean) => {
        setRules(rules.map(r => r.id === id ? { ...r, enabled: checked } : r));
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Alert Rules
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Configure automated detection and notification policies.
                    </p>
                </div>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Alert Rule
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rules.map((rule) => (
                    <Card key={rule.id} className={rule.enabled ? 'border-zinc-200 dark:border-zinc-800' : 'opacity-70 border-zinc-100 dark:border-zinc-900'}>
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <AlertIcon severity={rule.severity} />
                                <CardTitle className="text-base font-medium">{rule.name}</CardTitle>
                            </div>
                            <Switch checked={rule.enabled} onCheckedChange={(c) => toggleRule(rule.id, c)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-mono bg-zinc-100 dark:bg-zinc-900 p-2 rounded mb-4 text-zinc-600 dark:text-zinc-400">
                                {rule.condition}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {rule.channels.map(channel => (
                                    <Badge key={channel} variant="secondary" className="text-xs">
                                        {channel === 'Slack' && <MessageSquare className="w-3 h-3 mr-1" />}
                                        {channel === 'Email' && <Mail className="w-3 h-3 mr-1" />}
                                        {channel === 'PagerDuty' && <Zap className="w-3 h-3 mr-1" />}
                                        {channel}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-0 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4 pt-4">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit2 className="w-4 h-4 text-zinc-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function AlertIcon({ severity }: { severity: AlertSeverity }) {
    if (severity === 'critical') return <OctagonAlert className="w-5 h-5 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <Bell className="w-5 h-5 text-blue-500" />;
}
