/** @format */
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission, subscribeToPushNotifications } from '@/lib/service-worker-manager';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === 'granted') {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        const subscription = await subscribeToPushNotifications(vapidKey);
        if (subscription) {
          setIsSubscribed(true);
          toast({ title: 'Push notifications enabled' });
        }
      }
    } else {
      toast({ title: 'Permission denied', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
            </p>
          </div>
          <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
            {permission === 'granted' ? <Bell className="h-3 w-3 mr-1" /> : <BellOff className="h-3 w-3 mr-1" />}
            {permission}
          </Badge>
        </div>

        {permission !== 'granted' && (
          <Button onClick={handleEnableNotifications} className="w-full">
            Enable Push Notifications
          </Button>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-muted-foreground">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
