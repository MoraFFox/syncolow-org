"use client";

import { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
  onView: () => void;
}

export function ToastNotification({ notification, onClose, onView }: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const Icon = () => {
    const LucideIcon = ((LucideIcons as any)[notification.icon] || Bell) as React.ElementType;
    return <LucideIcon className="h-5 w-5" />;
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/5';
      case 'info':
        return 'border-l-blue-500 bg-blue-500/5';
      default:
        return 'border-l-border';
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border-l-4 bg-background shadow-lg transition-all duration-300",
        getPriorityStyles(),
        isExiting ? "animate-out slide-out-to-right" : "animate-in slide-in-from-right"
      )}
      onClick={onView}
    >
      <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-full",
            notification.priority === 'critical' && "bg-destructive/10",
            notification.priority === 'warning' && "bg-yellow-500/10",
            notification.priority === 'info' && "bg-blue-500/10"
          )}>
            <Icon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm leading-tight">{notification.title}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary animate-toast-progress" />
      </div>
    </div>
  );
}

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
  onView: (notification: Notification) => void;
}

export function ToastContainer({ notifications, onClose, onView }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
          onView={() => onView(notification)}
        />
      ))}
    </div>
  );
}
