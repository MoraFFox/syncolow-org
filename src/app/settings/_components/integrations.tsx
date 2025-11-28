"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle, MapPin, Plug, RefreshCw, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTasksSync } from '@/hooks/use-tasks-sync';

export function Integrations() {
  const [isTasksConnected, setIsTasksConnected] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const { toast } = useToast();
  const { isSyncing, autoSyncEnabled, toggleAutoSync, triggerSync } = useTasksSync();

  useEffect(() => {
    checkTasksStatus();
  }, []);

  const checkTasksStatus = async () => {
    try {
      const res = await fetch('/api/google-tasks/status');
      const data = await res.json();
      setIsTasksConnected(data.connected);
    } catch (error) {
      console.error('Failed to check tasks status', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleConnectTasks = async () => {
    try {
      const res = await fetch('/api/google-tasks/auth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not initiate Google Tasks connection.",
        variant: "destructive"
      });
    }
  };

  const handleDisconnectTasks = async () => {
    try {
      await fetch('/api/google-tasks/disconnect', { method: 'POST' });
      setIsTasksConnected(false);
      toast({
        title: "Disconnected",
        description: "Google Tasks has been disconnected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect tasks.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect external services to enhance your workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Google Tasks Integration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Google Tasks</h3>
          </div>
          
          <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLoadingTasks ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : isTasksConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isLoadingTasks ? 'Checking status...' : isTasksConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isTasksConnected 
                      ? 'Visits are synced as tasks' 
                      : 'Connect to sync visits automatically'}
                  </p>
                </div>
              </div>
              
              {!isLoadingTasks && (
                <div>
                  {isTasksConnected ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnectTasks}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleConnectTasks}>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isTasksConnected && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="auto-sync" 
                      checked={autoSyncEnabled}
                      onCheckedChange={toggleAutoSync}
                    />
                    <Label htmlFor="auto-sync">Auto-sync & Check Completion</Label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={triggerSync} 
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync Now
                  </Button>
                </div>
              </>
            )}
          </div>

          {isTasksConnected && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Visits are added to "SynergyFlow Visits" list in Google Tasks</li>
                <li>Marking a task as completed in Google Tasks will mark the visit as completed here</li>
              </ul>
            </div>
          )}
        </div>

        <Separator />

        {/* Google Maps Integration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Google Maps</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">
                  Maps and geocoding powered by Google Maps
                </p>
              </div>
            </div>
            
            <Button variant="outline" size="sm" disabled>
              <MapPin className="mr-2 h-4 w-4" />
              Built-in
            </Button>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">Features:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Automatic address geocoding for visits and deliveries</li>
              <li>Interactive maps on dashboard and visit pages</li>
              <li>One-click navigation to Google Maps</li>
            </ul>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
