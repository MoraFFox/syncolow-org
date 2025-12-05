"use client";

import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { offlineQueueManager } from '@/lib/offline-queue-manager';
import { idbStorage } from '@/lib/cache/indexed-db';
import { queryClient } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SyncPage() {
  const { queue, isProcessing, loadQueue, clearQueue } = useOfflineQueueStore();
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleRetry = async (operationId: string) => {
    try {
      await offlineQueueManager.retryOperation(operationId);
    } catch (error: any) {
      toast({
        title: 'Retry Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleClearQueue = async () => {
    await clearQueue();
    toast({
      title: 'Queue Cleared',
      description: 'All pending operations have been removed.',
    });
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // Clear React Query cache (memory)
      queryClient.clear();
      // Clear IndexedDB cache (persistence)
      await idbStorage.clear();
      toast({
        title: 'Cache Cleared',
        description: 'All cached data has been removed. Data will be fetched fresh.',
      });
    } catch (error: any) {
      toast({
        title: 'Clear Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleRefreshCache = async () => {
    try {
      // Invalidate all queries to trigger refetch on next access
      await queryClient.invalidateQueries();
      toast({
        title: 'Cache Refreshed',
        description: 'All data will be refreshed from the server on next access.',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      default: return '❓';
    }
  };

  const getStatusBadge = (operation: any) => {
    if (operation.error && operation.retries >= 5) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (operation.error) {
      return <Badge variant="secondary">Retrying ({operation.retries}/5)</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sync & Cache</h1>
        <p className="text-muted-foreground">
          Manage offline operations, sync status, and cached data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Operations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queue.length}</div>
            <p className="text-xs text-muted-foreground">
              Waiting to sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Operations</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue.filter(op => op.error && op.retries >= 5).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Max retries reached
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isProcessing ? 'Syncing' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isProcessing ? 'Processing queue...' : 'All synced'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queue">Sync Queue</TabsTrigger>
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Operations</CardTitle>
                  <CardDescription>
                    Operations waiting to be synced with the server
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => offlineQueueManager.processQueue()}
                    disabled={isProcessing || queue.length === 0}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={queue.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Queue
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Queue?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all pending operations. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearQueue}>
                          Clear Queue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No pending operations</p>
                  <p className="text-sm">All changes have been synced</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.map((operation) => (
                    <div
                      key={operation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl">{getOperationIcon(operation.operation)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {operation.operation} {operation.collection}
                            </span>
                            {getStatusBadge(operation)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(operation.timestamp, { addSuffix: true })}
                          </p>
                          {operation.error && (
                            <p className="text-sm text-destructive mt-1">
                              Error: {operation.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(operation.id)}
                        disabled={isProcessing}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cache Management</CardTitle>
                  <CardDescription>
                    Manage locally cached data for offline access
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCache}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Cache
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isClearingCache}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Cache?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all cached data. Data will be fetched fresh from the server on next access.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearCache}>
                          Clear Cache
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Database className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-medium">Cached Collections</h4>
                    <p className="text-sm text-muted-foreground">
                      Orders, Companies, Products, Maintenance, and more
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Cache Strategy</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Fresh data served for 5 minutes</li>
                    <li>• Stale data served while revalidating</li>
                    <li>• Offline access to cached data</li>
                    <li>• Auto-cleanup after 24 hours</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
