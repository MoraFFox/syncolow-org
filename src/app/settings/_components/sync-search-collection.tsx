"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrderStore } from '@/store/use-order-store';
import { Database, Loader2 } from 'lucide-react';

export function SyncSearchCollection() {
  const { syncAllOrdersToSearch } = useOrderStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncAllOrdersToSearch();
    setIsSyncing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Index</CardTitle>
        <CardDescription>
          Sync orders to the search collection for faster text search performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Sync Search Collection
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Run this once after setup or if search results seem outdated.
        </p>
      </CardContent>
    </Card>
  );
}
