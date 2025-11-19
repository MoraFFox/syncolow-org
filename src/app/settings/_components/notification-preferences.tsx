"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/use-settings-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Bell, Mail, Clock, Smartphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/lib/notification-push-service';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

export function NotificationPreferences() {
  const { notificationSettings, toggleNotificationType } = useSettingsStore();
  const { user } = useAuth();
  const { permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications(user?.id);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  const handleSaveEmailSettings = () => {
    // TODO: Save to user preferences in Firestore
    console.log('Email settings saved:', { emailEnabled, emailAddress, digestFrequency });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(notificationSettings).map(([type, settings]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={type} className="text-base">
                  {settings.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings.description}
                </p>
              </div>
              <Switch
                id={type}
                checked={settings.enabled}
                onCheckedChange={() => toggleNotificationType(type as any)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email delivery for critical alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled" className="text-base">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive critical alerts via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {emailEnabled && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="your.email@company.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Daily Digest</Label>
                <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                  <SelectTrigger id="digest-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="daily">Daily at 9:00 AM</SelectItem>
                    <SelectItem value="weekly">Weekly on Monday</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Receive a summary of non-urgent notifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Immediate Email For</Label>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span>Critical priority notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span>Overdue payments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span>Failed deliveries</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveEmailSettings}>
                Save Email Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Browser Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                  {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
                </Badge>
              </p>
            </div>
            {permission === 'granted' ? (
              <Button variant="outline" onClick={unsubscribe} disabled={!isSubscribed}>
                Disable
              </Button>
            ) : permission === 'denied' ? (
              <p className="text-sm text-muted-foreground">Blocked by browser</p>
            ) : (
              <Button onClick={requestPermission}>
                Enable
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Push notifications work even when the app is closed. You'll receive critical alerts instantly.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Don't send notifications during these hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Critical notifications will still be delivered during quiet hours
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
