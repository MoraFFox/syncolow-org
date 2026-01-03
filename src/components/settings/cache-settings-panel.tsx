"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    RefreshCw,
    Trash2,
    Activity,
    HardDrive,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Settings
} from 'lucide-react';
import { cacheAnalytics } from '@/lib/cache/analytics';
import { quotaManager } from '@/lib/cache/quota-manager';
import { idbStorage } from '@/lib/cache/indexed-db';
import { warmingScheduler } from '@/lib/cache/warming-scheduler';
import { invalidationScheduler } from '@/lib/cache/invalidation-scheduler';
import { toast } from '@/hooks/use-toast';

/**
 * CacheSettingsPanel Component
 * 
 * Provides a comprehensive cache management interface:
 * - Real-time analytics dashboard
 * - Storage quota visualization
 * - Cache control actions (clear, prune)
 * - Feature toggles (warming, prefetching)
 */
export function CacheSettingsPanel() {
    const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof cacheAnalytics.getAnalytics>> | null>(null);
    const [quotaStatus, setQuotaStatus] = useState<Awaited<ReturnType<typeof quotaManager.checkQuota>> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [warmingEnabled, setWarmingEnabled] = useState(false);
    const [schedulerEnabled, setSchedulerEnabled] = useState(false);

    // Load analytics
    const loadAnalytics = useCallback(async () => {
        const [analyticsData, quota] = await Promise.all([
            cacheAnalytics.getAnalytics(),
            quotaManager.checkQuota(),
        ]);
        setAnalytics(analyticsData);
        setQuotaStatus(quota);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadAnalytics();
        const interval = setInterval(loadAnalytics, 5000);
        return () => clearInterval(interval);
    }, [loadAnalytics]);

    // Clear all cache
    const handleClearCache = async () => {
        try {
            await idbStorage.clear();
            cacheAnalytics.reset();
            toast({ title: 'Cache Cleared', description: 'All cached data has been removed.' });
            loadAnalytics();
        } catch (_err) {
            toast({ title: 'Error', description: 'Failed to clear cache.', variant: 'destructive' });
        }
    };

    // Prune old entries
    const handlePrune = async () => {
        try {
            const pruned = await idbStorage.prune();
            toast({ title: 'Cache Pruned', description: `Removed ${pruned} old entries.` });
            loadAnalytics();
        } catch (_err) {
            toast({ title: 'Error', description: 'Failed to prune cache.', variant: 'destructive' });
        }
    };

    // Toggle warming scheduler
    const handleWarmingToggle = (enabled: boolean) => {
        setWarmingEnabled(enabled);
        if (enabled) {
            warmingScheduler.start();
        } else {
            warmingScheduler.stop();
        }
    };

    // Toggle invalidation scheduler
    const handleSchedulerToggle = (enabled: boolean) => {
        setSchedulerEnabled(enabled);
        if (enabled) {
            invalidationScheduler.start();
        } else {
            invalidationScheduler.stop();
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const healthColor = (analytics?.healthScore ?? 0) >= 80
        ? 'text-green-500'
        : (analytics?.healthScore ?? 0) >= 50
            ? 'text-yellow-500'
            : 'text-red-500';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Cache Management</h2>
                    <p className="text-muted-foreground">Monitor and control application cache</p>
                </div>
                <Button variant="outline" size="icon" onClick={loadAnalytics}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="storage">Storage</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Health Score */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-3xl font-bold ${healthColor}`}>
                                    {analytics?.healthScore ?? 0}%
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    {(analytics?.healthScore ?? 0) >= 80 ? (
                                        <><CheckCircle2 className="h-3 w-3 text-green-500" /> Good</>
                                    ) : (analytics?.healthScore ?? 0) >= 50 ? (
                                        <><AlertTriangle className="h-3 w-3 text-yellow-500" /> Fair</>
                                    ) : (
                                        <><AlertTriangle className="h-3 w-3 text-red-500" /> Poor</>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{analytics?.hitRate.toFixed(1) ?? 0}%</div>
                                <Progress value={analytics?.hitRate ?? 0} className="mt-2 h-1" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{analytics?.totalQueries ?? 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {analytics?.cacheHits ?? 0} hits / {analytics?.cacheMisses ?? 0} misses
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Entries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{analytics?.entryCount ?? 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {analytics?.staleEntries ?? 0} stale
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recommendations */}
                    {analytics?.recommendations && analytics.recommendations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analytics.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="storage" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5" />
                                Storage Usage
                            </CardTitle>
                            <CardDescription>
                                IndexedDB storage quota and usage
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Used: {formatBytes(quotaStatus?.totalUsage ?? 0)}</span>
                                    <span>Available: {formatBytes(quotaStatus?.quotaAvailable ?? 0)}</span>
                                </div>
                                <Progress
                                    value={(quotaStatus?.usagePercent ?? 0) * 100}
                                    className={`h-2 ${quotaStatus?.isCritical ? 'bg-red-200' : quotaStatus?.isWarning ? 'bg-yellow-200' : ''}`}
                                />
                            </div>

                            <div className="flex gap-2">
                                {quotaStatus?.isWarning && (
                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Warning
                                    </Badge>
                                )}
                                {quotaStatus?.isCritical && (
                                    <Badge variant="destructive">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Critical
                                    </Badge>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={handlePrune}>
                                    <Activity className="h-4 w-4 mr-2" />
                                    Prune Old Entries
                                </Button>
                                <Button variant="destructive" onClick={handleClearCache}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All Cache
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Cache Features
                            </CardTitle>
                            <CardDescription>
                                Enable or disable cache optimization features
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="warming">Cache Warming</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Preload frequently accessed data during idle time
                                    </p>
                                </div>
                                <Switch
                                    id="warming"
                                    checked={warmingEnabled}
                                    onCheckedChange={handleWarmingToggle}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="scheduler">Background Refresh</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Periodically refresh stale data in the background
                                    </p>
                                </div>
                                <Switch
                                    id="scheduler"
                                    checked={schedulerEnabled}
                                    onCheckedChange={handleSchedulerToggle}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
