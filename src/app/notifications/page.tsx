
"use client";

import { useMemo, useState, ForwardRefExoticComponent, RefAttributes, useEffect } from 'react';
import { isToday, isYesterday, isThisWeek, formatRelative, addHours, addDays } from 'date-fns';
import { useNotificationStore } from '@/store/use-notification-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck, Wrench, Clock, X, LucideProps, Filter, Search, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Notification } from '@/lib/types';
import { ScheduleVisitForm } from '../maintenance/_components/schedule-visit-form';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { generateNotificationSummary, suggestActions } from '@/lib/notification-priority-scorer';

import { Checkbox } from '@/components/ui/checkbox';
import { AIInsightsPanel } from '@/components/notifications/ai-insights-panel';
import { generateInsights } from '@/lib/notification-insights';
import { Skeleton } from '@/components/ui/skeleton';
import { DrillTarget } from '@/components/drilldown/drill-target';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, snoozeNotification, clearSnooze, loading } = useNotificationStore();
  const { addMaintenanceVisit } = useMaintenanceStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'all' | 'unread' | 'snoozed'>('all');
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [selectedNotificationActions, setSelectedNotificationActions] = useState<{ [key: string]: string[] }>({});
  const [showAIInsights, setShowAIInsights] = useState(true);

  const aiInsights = useMemo(() => {
    return generateInsights(notifications);
  }, [notifications]);

  const sources = useMemo(() => {
    return ['all', ...Array.from(new Set(notifications.map(n => n.source)))];
  }, [notifications]);

  const getFilteredNotifications = () => {
    const now = new Date();
    let filtered = notifications;

    // Filter by source
    if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.source === activeTab);
    }

    // Filter by view mode
    if (viewMode === 'unread') {
      filtered = filtered.filter(n => !n.read && (!n.snoozedUntil || new Date(n.snoozedUntil) <= now));
    } else if (viewMode === 'snoozed') {
      filtered = filtered.filter(n => n.snoozedUntil && new Date(n.snoozedUntil) > now);
    }

    // Filter by priority
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(n => priorityFilter.includes(n.priority));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const groupedNotifications = useMemo((): Record<string, Notification[]> => {
    const groups: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const filtered = getFilteredNotifications();
    
    filtered.forEach(notification => {
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
  }, [notifications, activeTab, viewMode, priorityFilter, searchQuery]);

  const filteredNotifications = useMemo((): Notification[] => {
    return Object.values(groupedNotifications).flat();
  }, [groupedNotifications]);

  const unreadCount = useMemo(() => {
    const now = new Date();
    return notifications.filter(n => !n.read && (!n.snoozedUntil || new Date(n.snoozedUntil) <= now)).length;
  }, [notifications]);

  const criticalCount = useMemo(() => {
    return filteredNotifications.filter(n => n.priority === 'critical').length;
  }, [filteredNotifications]);

  const warningCount = useMemo(() => {
    return filteredNotifications.filter(n => n.priority === 'warning').length;
  }, [filteredNotifications]);

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkAsRead = async () => {
    const promises = Array.from(selectedNotifications).map(id => markAsRead(id));
    await Promise.all(promises);
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkSnooze = async (duration: 'hour' | 'day') => {
    const snoozeUntil = duration === 'hour' ? addHours(new Date(), 1) : addDays(new Date(), 1);
    const promises = Array.from(selectedNotifications).map(id => snoozeNotification(id, snoozeUntil));
    await Promise.all(promises);
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const toggleNotificationSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  const snoozedCount = useMemo(() => {
    const now = new Date();
    return notifications.filter(n => n.snoozedUntil && new Date(n.snoozedUntil) > now).length;
  }, [notifications]);

  // Generate AI summary
  useEffect(() => {
    if (filteredNotifications.length > 0 && showAIInsights) {
      const summary = generateNotificationSummary(filteredNotifications);
      generateNotificationSummary(filteredNotifications);
    }
  }, [filteredNotifications, showAIInsights]);

  // Load suggested actions for notifications
  const loadSuggestedActions = (notificationId: string, notification: Notification) => {
    if (!selectedNotificationActions[notificationId]) {
      const actions = suggestActions(notification);
      setSelectedNotificationActions(prev => ({
        ...prev,
        [notificationId]: actions,
      }));
    }
  };

  const getPriorityStyles = (priority: 'critical' | 'warning' | 'info') => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-destructive';
      case 'warning':
        return 'border-l-4 border-yellow-500';
      case 'info':
        return 'border-l-4 border-blue-500';
      default:
        return '';
    }
  };

  const Icon = ({ name }: { name: string }) => {
    const LucideIcon = LucideIcons[name as keyof typeof LucideIcons] as LucideIcon || Bell;
    return <LucideIcon className="h-5 w-5" />;
  };

  const handleActionClick = (e: React.MouseEvent, notification: Notification | any) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(notification.id);

    switch (notification.actionType) {
      case 'SCHEDULE_FOLLOW_UP':
        // This is a simplified interaction. In a real app, you might pass the visit data.
        setIsScheduleVisitOpen(true);
        break;
      case 'VIEW_ORDER':
      case 'VIEW_CLIENT':
        if(notification.link) router.push(notification.link);
        break;
      default:
        if(notification.link) router.push(notification.link);
        break;
    }
  };
  
   const handleSnooze = async (e: React.MouseEvent, notificationId: string, duration: 'hour' | 'day') => {
    e.preventDefault();
    e.stopPropagation();
    const snoozeUntil = duration === 'hour' ? addHours(new Date(), 1) : addDays(new Date(), 1);
    await snoozeNotification(notificationId, snoozeUntil);
  }

  const ActionButton = ({ item }: { item: Notification | any }) => {
      const commonProps = {
          size: "sm" as const,
          className: "h-8 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus:outline-none",
          onClick: (e: React.MouseEvent) => handleActionClick(e, item)
      };

      switch(item.actionType) {
          case 'SCHEDULE_FOLLOW_UP':
              return <Button {...commonProps} aria-label="Schedule follow-up"><Wrench className="h-4 w-4 mr-1" /> Schedule</Button>
          case 'VIEW_ORDER':
          case 'VIEW_CLIENT':
              return <Button {...commonProps} variant="outline" aria-label="View details">View</Button>
          default:
              return <Button {...commonProps} variant="outline" asChild aria-label="View details"><Link href={item.link || '#'}>View</Link></Button>;
      }
  }


  return (
    <div className="flex flex-col gap-8">
       <ScheduleVisitForm 
          isOpen={isScheduleVisitOpen} 
          onOpenChange={setIsScheduleVisitOpen}
          onFormSubmit={addMaintenanceVisit}
      />
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
              <h1 className="text-3xl font-bold">Notification Center</h1>
              <p className="text-muted-foreground">
              Review and manage all system alerts and notifications.
              </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAIInsights(!showAIInsights)} 
              variant={showAIInsights ? 'default' : 'outline'}
            >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Insights
            </Button>
            <Button onClick={() => markAllAsRead('current-user')} disabled={unreadCount === 0} variant="outline">
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All as Read
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold">{criticalCount}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold">{warningCount}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap justify-between">
        <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('all')}
          >
            All <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
          </Button>
          <Button 
            variant={viewMode === 'unread' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('unread')}
          >
            Unread <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
          </Button>
          <Button 
            variant={viewMode === 'snoozed' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('snoozed')}
          >
            Snoozed <Badge variant="secondary" className="ml-2">{snoozedCount}</Badge>
          </Button>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notifications..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={priorityFilter.includes('critical')}
                onCheckedChange={(checked) => {
                  setPriorityFilter(prev => 
                    checked ? [...prev, 'critical'] : prev.filter(p => p !== 'critical')
                  );
                }}
              >
                Critical
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={priorityFilter.includes('warning')}
                onCheckedChange={(checked) => {
                  setPriorityFilter(prev => 
                    checked ? [...prev, 'warning'] : prev.filter(p => p !== 'warning')
                  );
                }}
              >
                Warning
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={priorityFilter.includes('info')}
                onCheckedChange={(checked) => {
                  setPriorityFilter(prev => 
                    checked ? [...prev, 'info'] : prev.filter(p => p !== 'info')
                  );
                }}
              >
                Info
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(priorityFilter.length > 0 || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setPriorityFilter([]);
                setSearchQuery('');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        {isSelectionMode && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkMarkAsRead}
              disabled={selectedNotifications.size === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark Read ({selectedNotifications.size})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedNotifications.size === 0}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze ({selectedNotifications.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkSnooze('hour')}>
                  1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSnooze('day')}>
                  Tomorrow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => {
              setIsSelectionMode(false);
              setSelectedNotifications(new Set());
            }}>
              Cancel
            </Button>
          </div>
        )}

        {!isSelectionMode && filteredNotifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
            Select Multiple
          </Button>
        )}
      </div>

      {priorityFilter.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {priorityFilter.map(filter => (
            <Badge key={filter} variant="secondary" className="gap-1">
              {filter}
              <button
                onClick={() => setPriorityFilter(prev => prev.filter(p => p !== filter))}
                className="ml-1 hover:bg-background rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {showAIInsights && aiInsights.length > 0 && (
        <AIInsightsPanel 
          insights={aiInsights}
          onActionClick={(insight) => {
            if (insight.action === 'Mark All Read') {
              markAllAsRead('current-user');
            }
          }}
        />
      )}

      <Card>
        <CardHeader>
           <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {sources.map(source => (
                        <TabsTrigger key={source} value={source} className="capitalize">{source}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative">
                            <Bell className="h-20 w-20 text-muted-foreground/30" />
                            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                              <CheckCheck className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-lg font-semibold">No notifications found</p>
                            <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later</p>
                          </div>
                        </div>
                    </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => {
                      if (groupNotifications.length === 0) return null;
                      
                      const groupLabels: Record<string, string> = {
                        today: 'Today',
                        yesterday: 'Yesterday',
                        thisWeek: 'This Week',
                        older: 'Older',
                      };

                      return (
                        <div key={groupKey} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              {groupLabels[groupKey]}
                            </h3>
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs text-muted-foreground">
                              {groupNotifications.length} {groupNotifications.length === 1 ? 'notification' : 'notifications'}
                            </span>
                          </div>
                          <Accordion type="multiple" className="space-y-3">
                            {groupNotifications.map((notification: Notification) => {
                        const isSnoozed = notification.snoozedUntil && new Date(notification.snoozedUntil) > new Date();
                        const isSelected = selectedNotifications.has(notification.id);
                        return (
                          <div
                            key={notification.id}
                            onTouchStart={(e) => { (e.currentTarget as any).dataset.sx = e.targetTouches[0].clientX.toString(); }}
                            onTouchEnd={(e) => { const sx = Number((e.currentTarget as any).dataset.sx || 0); const ex = e.changedTouches[0].clientX; const d = sx - ex; if (d > 50) handleSnooze(e as any, notification.id, 'hour'); if (d < -50) markAsRead(notification.id); }}
                            className={cn(
                                "flex items-start gap-4 rounded-lg p-4 transition-colors border relative overflow-hidden animate-in fade-in-0 slide-in-from-top-1",
                                getPriorityStyles(notification.priority),
                                (notification.read && !isSnoozed) && 'opacity-60 bg-background',
                                isSnoozed && 'bg-amber-500/10 border-amber-500/30',
                                isSelected && 'ring-2 ring-primary'
                            )}
                          >
                            {isSelectionMode && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleNotificationSelection(notification.id)}
                                className="mt-1"
                              />
                            )}
                            <div className="flex-shrink-0 mt-1">
                                <Icon name={notification.icon} />
                            </div>
                            <div className="flex-1 min-w-0">
                              {notification.isGroup && notification.items ? (
                                <AccordionItem value={notification.id} className="border-b-0">
                                  <AccordionTrigger className="p-0 hover:no-underline">
                                    <div className="text-left">
                                      {notification.metadata?.entityType === 'order' && notification.metadata?.entityId ? (
                                        <DrillTarget kind="order" payload={{ id: notification.metadata.entityId, total: 0 }} asChild>
                                          <p className="font-semibold cursor-pointer hover:underline">{notification.title}</p>
                                        </DrillTarget>
                                      ) : notification.metadata?.entityType === 'client' && notification.metadata?.entityId ? (
                                        <DrillTarget kind="company" payload={{ id: notification.metadata.entityId, name: notification.title }} asChild>
                                          <p className="font-semibold cursor-pointer hover:underline">{notification.title}</p>
                                        </DrillTarget>
                                      ) : (
                                        <p className="font-semibold">{notification.title}</p>
                                      )}
                                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="mt-2 space-y-2 pr-4">
                                      {notification.items.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background">
                                          <Link href={item.link} onClick={() => markAsRead(notification.id)} className="text-sm hover:underline flex-1 truncate">
                                            {item.title}
                                          </Link>
                                          <ActionButton item={item} />
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      {notification.metadata?.entityType === 'order' && notification.metadata?.entityId ? (
                                        <DrillTarget kind="order" payload={{ id: notification.metadata.entityId, total: 0 }} asChild>
                                          <p className="font-semibold cursor-pointer hover:underline">{notification.title}</p>
                                        </DrillTarget>
                                      ) : notification.metadata?.entityType === 'client' && notification.metadata?.entityId ? (
                                        <DrillTarget kind="company" payload={{ id: notification.metadata.entityId, name: notification.title }} asChild>
                                          <p className="font-semibold cursor-pointer hover:underline">{notification.title}</p>
                                        </DrillTarget>
                                      ) : (
                                        <p className="font-semibold">{notification.title}</p>
                                      )}
                                      <p className="text-sm text-muted-foreground truncate">{notification.message}</p>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                       <ActionButton item={notification} />
                                    </div>
                                  </div>
                                  {showAIInsights && (
                                    <div className="mt-3 pt-3 border-t">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => loadSuggestedActions(notification.id, notification)}
                                        className="text-xs"
                                      >
                                        <Lightbulb className="h-3 w-3 mr-1" />
                                        Suggested Actions
                                      </Button>
                                      {selectedNotificationActions[notification.id] && (
                                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                          {selectedNotificationActions[notification.id].map((action, idx) => (
                                            <li key={idx} className="flex items-start">
                                              <span className="mr-2">•</span>
                                              <span>{action}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                             <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4 whitespace-nowrap">
                                <p className="text-xs text-muted-foreground">
                                    {formatRelative(new Date(notification.createdAt), new Date())}
                                </p>
                                {isSnoozed ? (
                                    <div className="flex items-center gap-1 text-xs text-amber-600">
                                        <Clock className="h-3 w-3" />
                                        <span>Snoozed</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => clearSnooze(notification.id)}><X className="h-3 w-3"/></Button>
                                    </div>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><Clock className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => handleSnooze(e, notification.id, 'hour')}>Snooze for 1 hour</DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => handleSnooze(e, notification.id, 'day')}>Snooze until tomorrow</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                             </div>
                          </div>
                        )
                            })}
                          </Accordion>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

