"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/use-settings-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Bell, Mail, Clock, Smartphone, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/lib/notification-push-service';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { useUserSettings } from '@/hooks/use-user-settings';

export function NotificationPreferences() {
  const { notificationSettings, toggleNotificationType } = useSettingsStore();
  const { user } = useAuth();
  const { permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications(user?.id);
  const { settings, isLoading: settingsLoading, saveSettings } = useUserSettings();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [isSaving, setIsSaving] = useState(false);

  // Disable inputs during initial load or save
  const isDisabled = settingsLoading || isSaving;

  // Load settings from Supabase on mount
  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.email_enabled ?? false);
      setEmailAddress(settings.email_address ?? '');
      setDigestFrequency(settings.digest_frequency ?? 'daily');
      setQuietHoursStart(settings.quiet_hours_start ?? '22:00');
      setQuietHoursEnd(settings.quiet_hours_end ?? '07:00');
    }
  }, [settings]);

  const handleSaveEmailSettings = async () => {
    setIsSaving(true);
    try {
      // Convert notificationSettings from store to Record<string, boolean>
      const notificationTypesMap: Record<string, boolean> = {};
      Object.entries(notificationSettings).forEach(([key, value]) => {
        notificationTypesMap[key] = value.enabled;
      });

      await saveSettings({
        email_enabled: emailEnabled,
        email_address: emailAddress,
        digest_frequency: digestFrequency as 'disabled' | 'daily' | 'weekly',
        notification_types: notificationTypesMap
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuietHours = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd
      });
    } finally {
      setIsSaving(false);
    }
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

              <Button onClick={handleSaveEmailSettings} disabled={isDisabled}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          <Button onClick={handleSaveQuietHours} disabled={isDisabled} variant="outline">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Quiet Hours
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
