"use client";

import { useState } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { clearAllData } from '@/ai/flows/clear-all-data';
import { Loader2, Trash2 } from 'lucide-react';

export function ClearData() {
  const { fetchInitialData } = useOrderStore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClearData = async () => {
    setIsLoading(true);
    try {
      const result = await clearAllData();
      if (result.success) {
        toast({
          title: 'Database Cleared',
          description: `Successfully deleted ${result.deletedDocumentsCount} documents.`,
        });
        await fetchInitialData(); // Reload mock data to reset the UI
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Clearing Data',
        description: (error as Error).message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsAlertOpen(false);
    }
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              data from your Firestore database, including companies, orders,
              products, and more.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            This section contains actions that can result in permanent data
            loss.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <h3 className="font-semibold">Clear All Database Data</h3>
              <p className="text-sm text-muted-foreground">
                Permanently deletes all data from all collections in Firestore.
              </p>
            </div>
            <Button
              variant="destructive"
              className="mt-2 sm:mt-0"
              onClick={() => setIsAlertOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
