"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function GoogleCalendarIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/google-calendar/status');
      const data = await res.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Failed to check calendar status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/google-calendar/oauth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not initiate Google Calendar connection.",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = () => {
    // Clear the stored tokens by deleting the cookies
    document.cookie = 'google_calendar_access_token=; Max-Age=0; path=/';
    document.cookie = 'google_calendar_refresh_token=; Max-Age=0; path=/';
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Google Calendar has been disconnected.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your visits and appointments to Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {isLoading ? 'Checking status...' : isConnected ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'Your calendar is connected and ready to sync' 
                  : 'Connect your Google Calendar to automatically sync visits'}
              </p>
            </div>
          </div>
          
          {!isLoading && (
            <div>
              {isConnected ? (
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleConnect}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Connect Calendar
                </Button>
              )}
            </div>
          )}
        </div>

        {isConnected && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click "Add to Calendar" on any visit in the map or order details</li>
              <li>Events will be created in your Google Calendar automatically</li>
              <li>Each event includes the client name, address, and visit details</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
