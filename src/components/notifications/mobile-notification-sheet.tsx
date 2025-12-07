"use client";

import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

interface MobileNotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  children: React.ReactNode;
}

export const MobileNotificationSheet = React.memo<MobileNotificationSheetProps>(function MobileNotificationSheet({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllRead,
  onRefresh,
  children,
}: MobileNotificationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {unreadCount} unread of {notifications.length} total
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="h-8"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all
              </Button>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            </div>
          )}
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            {children}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});
