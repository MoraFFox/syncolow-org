
"use client";

import { useSettingsStore, NotificationSettings as TNotificationSettings } from '@/store/use-settings-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function NotificationSettings() {
  const { notificationSettings, toggleNotificationType } = useSettingsStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Enable or disable specific types of notifications across the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(notificationSettings).map(([key, setting]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor={`notif-${key}`} className="text-base cursor-pointer">
                {setting.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {setting.description}
              </p>
            </div>
            <Switch
              id={`notif-${key}`}
              checked={setting.enabled}
              onCheckedChange={() => toggleNotificationType(key as keyof TNotificationSettings)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
