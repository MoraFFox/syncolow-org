"use client";

import { useState } from 'react';
import { Conflict, conflictResolver } from '@/lib/conflict-resolver';
import { useConflictStore } from '@/store/use-conflict-store';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConflictResolutionDialogProps {
  conflict: Conflict | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConflictResolutionDialog({ conflict, isOpen, onOpenChange }: ConflictResolutionDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, 'local' | 'server'>>({});
  const { markResolved, removeConflict } = useConflictStore();

  if (!conflict) return null;

  const handleResolve = async (strategy: 'server' | 'client' | 'manual') => {
    setIsResolving(true);
    try {
      let manualData;
      
      if (strategy === 'manual') {
        manualData = { ...conflict.serverData };
        for (const field of conflict.conflictingFields) {
          const choice = selectedFields[field] || 'server';
          manualData[field] = choice === 'local' ? conflict.localData[field] : conflict.serverData[field];
        }
      }

      await conflictResolver.resolveConflict(conflict, strategy, manualData);
      markResolved(conflict.id, strategy, manualData);
      
      toast({
        title: 'Conflict Resolved',
        description: `Changes applied using ${strategy} version.`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Resolution Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleDiscard = () => {
    removeConflict(conflict.id);
    toast({
      title: 'Conflict Discarded',
      description: 'Local changes have been discarded.',
    });
    onOpenChange(false);
  };

  const toggleFieldSelection = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: prev[field] === 'local' ? 'server' : 'local',
    }));
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The {conflict.collection} document was modified on the server while you were offline.
            Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            {conflict.conflictingFields.length} field(s) have conflicting changes
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="diff" className="flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diff">Field-by-Field</TabsTrigger>
            <TabsTrigger value="full">Full Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="diff" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {conflict.conflictingFields.map((field) => {
                  const diff = conflictResolver.getFieldDiff(conflict, field);
                  const selected = selectedFields[field] || 'server';

                  return (
                    <div key={field} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{field}</h4>
                        <Badge variant="outline">{selected === 'local' ? 'Your Version' : 'Server Version'}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                            selected === 'local'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleFieldSelection(field)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Your Version</span>
                            {selected === 'local' && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {renderValue(diff.local)}
                          </pre>
                        </div>

                        <div
                          className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                            selected === 'server'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleFieldSelection(field)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Server Version</span>
                            {selected === 'server' && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {renderValue(diff.server)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="full" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Your Version</h4>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                    {JSON.stringify(conflict.localData, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Server Version</h4>
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                    {JSON.stringify(conflict.serverData, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isResolving}
          >
            <X className="h-4 w-4 mr-2" />
            Discard My Changes
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleResolve('server')}
              disabled={isResolving}
            >
              Use Server Version
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleResolve('client')}
              disabled={isResolving}
            >
              Use My Version
            </Button>
            <Button
              onClick={() => handleResolve('manual')}
              disabled={isResolving}
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Selected Fields
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
