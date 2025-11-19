/** @format */

"use client";

import { useMemo, useState } from "react";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { useNotificationStore } from "@/store/use-notification-store";
import { useAuth } from "@/hooks/use-auth";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCheck, ShoppingCart, Wrench, Clock, X } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, addHours, addDays } from "date-fns";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Product, NotificationActionType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ScheduleVisitForm } from "@/app/maintenance/_components/schedule-visit-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { useSwipe } from "@/hooks/use-swipe";
import { CheckCircle2, Clock as ClockIcon } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function NotificationCenter() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    loading,
  } = useNotificationStore();
  const { user } = useAuth();
  const { addMaintenanceVisit } = useMaintenanceStore();
  const router = useRouter();
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedNotificationIndex, setSelectedNotificationIndex] = useState(0);

  const unreadNotifications = useMemo(() => {
    const now = new Date();
    return notifications.filter(
      (n) => !n.read && (!n.snoozedUntil || new Date(n.snoozedUntil) <= now)
    );
  }, [notifications]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof unreadNotifications> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    unreadNotifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      if (isToday(date)) {
        groups.today.push(notification);
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification);
      } else if (isThisWeek(date, { weekStartsOn: 0 })) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [unreadNotifications]);

  const flatNotifications = useMemo(() => {
    return Object.values(groupedNotifications).flat();
  }, [groupedNotifications]);

  useKeyboardShortcuts({
    r: () => {
      if (flatNotifications[selectedNotificationIndex]) {
        markAsRead(flatNotifications[selectedNotificationIndex].id);
      }
    },
    s: () => {
      if (flatNotifications[selectedNotificationIndex]) {
        handleSnooze(
          new MouseEvent('click') as any,
          flatNotifications[selectedNotificationIndex].id,
          'hour'
        );
      }
    },
    d: () => {
      if (flatNotifications[selectedNotificationIndex]) {
        markAsRead(flatNotifications[selectedNotificationIndex].id);
      }
    },
  }, popoverOpen);

  const { priorityColor, hasCritical } = useMemo(() => {
    const hasCritical = unreadNotifications.some(
      (n) => n.priority === "critical"
    );
    const hasWarning = unreadNotifications.some(
      (n) => n.priority === "warning"
    );

    let color = null;
    if (hasCritical) color = "bg-destructive";
    else if (hasWarning) color = "bg-yellow-500";
    else if (unreadNotifications.length > 0) color = "bg-blue-500";

    return { priorityColor: color, hasCritical };
  }, [unreadNotifications]);

  const Icon = ({ name }: { name: string }) => {
    const LucideIcon = ((LucideIcons as any)[name] ||
      Bell) as React.ElementType;
    return <LucideIcon className='h-5 w-5' />;
  };

  const getPriorityStyles = (priority: "critical" | "warning" | "info") => {
    switch (priority) {
      case "critical":
        return "bg-destructive";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleActionClick = (
    e: React.MouseEvent,
    notification: {
      id: string;
      actionType?: NotificationActionType;
      link?: string;
      data?: any;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(notification.id);

    switch (notification.actionType) {
      case "SCHEDULE_FOLLOW_UP":
        setIsScheduleVisitOpen(true);
        break;
      case "VIEW_ORDER":
      case "VIEW_CLIENT":
        if (notification.link) router.push(notification.link);
        break;
      default:
        if (notification.link) router.push(notification.link);
        break;
    }
    setPopoverOpen(false); // Close popover after action
  };

  const handleSnooze = async (
    e: React.MouseEvent,
    notificationId: string,
    duration: "hour" | "day"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const snoozeUntil =
      duration === "hour" ? addHours(new Date(), 1) : addDays(new Date(), 1);
    await snoozeNotification(notificationId, snoozeUntil);
  };

  const ActionButton = ({
    item,
  }: {
    item: {
      actionType?: NotificationActionType;
      link?: string;
      data?: any;
      id: string;
    };
  }) => {
    const commonProps = {
      size: "sm" as const,
      className: "h-8 px-2 text-xs ml-2 focus-visible:ring-2 focus-visible:ring-ring focus:outline-none",
      onClick: (e: React.MouseEvent) => handleActionClick(e, item),
    };

    switch (item.actionType) {
      case "SCHEDULE_FOLLOW_UP":
        return (
          <Button {...commonProps} aria-label="Schedule follow-up">
            <Wrench className='h-3 w-3 mr-1' /> Schedule
          </Button>
        );
      default:
        return (
          <Button {...commonProps} variant='outline' aria-label="View details">
            View
          </Button>
        );
    }
  };


  return (
    <>
      <ScheduleVisitForm
        isOpen={isScheduleVisitOpen}
        onOpenChange={setIsScheduleVisitOpen}
        onFormSubmit={addMaintenanceVisit}
      />
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className={cn("relative", hasCritical && "animate-shake")}
          >
            <Bell
              className={cn(
                "h-5 w-5 transition-all",
                unreadNotifications.length > 0 && "animate-bell-ring"
              )}
            />
            {unreadNotifications.length > 0 && (
              <span className='absolute -top-1 -right-1 flex items-center justify-center'>
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-75",
                    priorityColor
                  )}
                ></span>
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white",
                    priorityColor
                  )}
                >
                  {unreadNotifications.length > 99
                    ? "99+"
                    : unreadNotifications.length}
                </span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='end'
          className='p-0 flex flex-col max-h-[80vh] w-screen max-w-sm sm:max-w-md'
        >
          <div className='p-4 border-b shrink-0 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-lg'>Notifications</h3>
                <p className='text-xs text-muted-foreground'>
                  {unreadNotifications.length} unread of {notifications.length}{" "}
                  total
                </p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => markAllAsRead(user?.id || "")}
                disabled={unreadNotifications.length === 0}
              >
                <CheckCheck className='mr-2 h-4 w-4' />
                Mark all
              </Button>
            </div>
            {unreadNotifications.length > 0 && (
              <div className='flex gap-2 flex-wrap'>
                {unreadNotifications.some((n) => n.priority === "critical") && (
                  <div className='flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive'>
                    <div className='h-2 w-2 rounded-full bg-destructive' />
                    {
                      unreadNotifications.filter(
                        (n) => n.priority === "critical"
                      ).length
                    }{" "}
                    Critical
                  </div>
                )}
                {unreadNotifications.some((n) => n.priority === "warning") && (
                  <div className='flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'>
                    <div className='h-2 w-2 rounded-full bg-yellow-500' />
                    {
                      unreadNotifications.filter(
                        (n) => n.priority === "warning"
                      ).length
                    }{" "}
                    Warning
                  </div>
                )}
                {unreadNotifications.some((n) => n.priority === "info") && (
                  <div className='flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-500'>
                    <div className='h-2 w-2 rounded-full bg-blue-500' />
                    {
                      unreadNotifications.filter((n) => n.priority === "info")
                        .length
                    }{" "}
                    Info
                  </div>
                )}
              </div>
            )}
          </div>
          <ScrollArea className='flex-1'>
            {loading ? (
              <div className='p-4 space-y-4'>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='flex gap-3 p-3'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-4 w-3/4' />
                      <Skeleton className='h-3 w-1/2' />
                    </div>
                  </div>
                ))}
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className='p-12 text-center flex items-center justify-center h-full'>
                <div className='flex flex-col items-center space-y-3'>
                  <div className='relative'>
                    <Bell className='h-16 w-16 text-muted-foreground/40' />
                    <div className='absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background' />
                  </div>
                  <div className='space-y-1'>
                    <p className='font-semibold text-foreground'>
                      All caught up!
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      No new notifications
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='p-2 space-y-4'>
                {Object.entries(groupedNotifications).map(
                  ([groupKey, groupNotifications]) => {
                    if (groupNotifications.length === 0) return null;

                    const groupLabels: Record<string, string> = {
                      today: "Today",
                      yesterday: "Yesterday",
                      thisWeek: "This Week",
                      older: "Older",
                    };

                    return (
                      <div key={groupKey} className='space-y-2'>
                        <div className='flex items-center justify-between px-2'>
                          <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                            {groupLabels[groupKey]}
                          </h4>
                          <span className='text-xs text-muted-foreground'>
                            {groupNotifications.length}
                          </span>
                        </div>
                        <Accordion type='multiple' className='space-y-2'>
                          {groupNotifications.map((notification) => {
                            const isSnoozed =
                              notification.snoozedUntil &&
                              new Date(notification.snoozedUntil) > new Date();
                            if (isSnoozed) return null;

                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "p-3 rounded-lg transition-all duration-200 cursor-pointer border-l-4 relative overflow-hidden animate-in fade-in-0 slide-in-from-top-1",
                                  notification.read
                                    ? "bg-muted/30 opacity-70"
                                    : "bg-background hover:bg-muted/50 hover:shadow-md",
                                  notification.priority === "critical" &&
                                    "border-destructive",
                                  notification.priority === "warning" &&
                                    "border-yellow-500",
                                  notification.priority === "info" &&
                                    "border-blue-500"
                                )}
                                role='article'
                                aria-label={notification.title}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') markAsRead(notification.id); }}
                                onClick={() => !notification.isGroup && markAsRead(notification.id)}
                                onTouchStart={(e) => { (e.currentTarget as any).dataset.sx = e.targetTouches[0].clientX.toString(); }}
                                onTouchEnd={(e) => { const sx = Number((e.currentTarget as any).dataset.sx || 0); const ex = e.changedTouches[0].clientX; const d = sx - ex; if (d > 50) handleSnooze(new MouseEvent('click') as any, notification.id, 'hour'); if (d < -50) markAsRead(notification.id); }}
                              >
                                <div className='flex items-start gap-3 relative'>
                                  <div
                                    className={cn(
                                      "relative mt-1 p-2 rounded-full",
                                      notification.priority === "critical" &&
                                        "bg-destructive/10",
                                      notification.priority === "warning" &&
                                        "bg-yellow-500/10",
                                      notification.priority === "info" &&
                                        "bg-blue-500/10"
                                    )}
                                  >
                                    <Icon name={notification.icon} />
                                    {!notification.read && (
                                      <span
                                        className={cn(
                                          "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full animate-pulse",
                                          getPriorityStyles(
                                            notification.priority
                                          )
                                        )}
                                      />
                                    )}
                                  </div>
                                  <div className='flex-1 overflow-hidden'>
                                    {notification.isGroup &&
                                    notification.items ? (
                                      <AccordionItem
                                        value={notification.id}
                                        className='border-b-0'
                                      >
                                        <AccordionTrigger className='p-0 hover:no-underline text-left'>
                                          <p className='font-semibold text-sm'>
                                            {notification.title}
                                          </p>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <ScrollArea className='max-h-60'>
                                            <div className='mt-2 space-y-1 pr-4'>
                                              {notification.items.map(
                                                (item) => (
                                                  <div
                                                    key={item.id}
                                                    className='flex items-center justify-between p-1.5 rounded-md hover:bg-background'
                                                  >
                                                    <div className='min-w-0 flex-1'>
                                                      <Link
                                                        href={item.link}
                                                        onClick={(e) =>
                                                          handleActionClick(e, {
                                                            ...item,
                                                            id: notification.id,
                                                          })
                                                        }
                                                        className='text-xs hover:underline truncate block'
                                                      >
                                                        {item.title}
                                                      </Link>
                                                    </div>
                                                    <ActionButton
                                                      item={{
                                                        ...item,
                                                        id: notification.id,
                                                      }}
                                                    />
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </ScrollArea>
                                        </AccordionContent>
                                      </AccordionItem>
                                    ) : (
                                      <div
                                        onClick={(e) =>
                                          handleActionClick(e, notification)
                                        }
                                        className='cursor-pointer'
                                      >
                                        <p className='font-semibold text-sm'>
                                          {notification.title}
                                        </p>
                                        <p className='text-sm text-muted-foreground'>
                                          {notification.message}
                                        </p>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between mt-2 pt-2 border-t'>
                                      <p className='text-xs text-muted-foreground flex items-center gap-1'>
                                        <Clock className='h-3 w-3' />
                                        {formatDistanceToNow(
                                          new Date(notification.createdAt),
                                          { addSuffix: true }
                                        )}
                                      </p>
                                      <div className='flex items-center gap-1'>
                                        {!notification.read && (
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus:outline-none'
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markAsRead(notification.id);
                                            }}
                                            aria-label='Mark read'
                                          >
                                            Mark read
                                          </Button>
                                        )}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant='ghost'
                                              size='icon'
                                              className='h-8 w-8'
                                              aria-label='Snooze'
                                            >
                                              <Clock className='h-3 w-3' />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align='end'>
                                            <DropdownMenuItem
                                              onClick={(e) =>
                                                handleSnooze(
                                                  e,
                                                  notification.id,
                                                  "hour"
                                                )
                                              }
                                            >
                                              <Clock className='h-3 w-3 mr-2' />
                                              1 hour
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) =>
                                                handleSnooze(
                                                  e,
                                                  notification.id,
                                                  "day"
                                                )
                                              }
                                            >
                                              <Clock className='h-3 w-3 mr-2' />
                                              Tomorrow
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </Accordion>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </ScrollArea>
          <div className='p-2 border-t flex-shrink-0'>
            <Button variant='link' asChild className='w-full'>
              <Link href='/notifications'>View All Notifications</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

