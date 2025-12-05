"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useNotificationStore } from "@/store/use-notification-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
} from "lucide-react";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { formatDate, formatCurrency } from "@/lib/utils";
import { addHours } from "date-fns";
import { DrillKind } from "@/lib/drilldown-types";

export default function NotificationDrilldownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { notifications, markAsRead, snoozeNotification, clearSnooze } =
    useNotificationStore();
  
  const notification = notifications.find((n) => n.id === id);
  
  if (!notification) {
     return (
        <div className="container mx-auto py-6 space-y-6">
             <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
             </Button>
             <div className="text-center py-10 text-muted-foreground">
                Notification not found
             </div>
        </div>
     );
  }

  const priorityColor =
    notification.priority === "critical"
      ? "destructive"
      : notification.priority === "warning"
      ? "secondary"
      : "outline";

  const getDrillKind = (type: string): DrillKind => {
      const map: Record<string, DrillKind> = {
          'client': 'company',
          'company': 'company',
          'order': 'order',
          'product': 'product',
          'maintenance': 'maintenance',
          'feedback': 'feedback'
      };
      return map[type] || 'order';
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {notification.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant={priorityColor} className="uppercase text-xs">
                    {notification.priority}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(notification.createdAt)}
                </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                {notification.read ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                    <Bell className="h-4 w-4 text-blue-500" />
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {notification.read ? "Read" : "Unread"}
                </div>
                <p className="text-xs text-muted-foreground">
                    {notification.read ? "Read" : "Unread"}
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Priority</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${notification.priority === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold capitalize">
                    {notification.priority}
                </div>
                 <p className="text-xs text-muted-foreground">
                        Level
                 </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Source</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold capitalize">
                    {notification.source || "System"}
                </div>
                 <p className="text-xs text-muted-foreground">
                        Origin
                 </p>
            </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
         <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg border">
                    {notification.message}
                </div>
                
                {notification.snoozedUntil && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>Snoozed until {formatDate(notification.snoozedUntil)}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100" onClick={() => clearSnooze(notification.id)}>
                            Clear Snooze
                        </Button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4">
                    {!notification.read && (
                        <Button onClick={() => markAsRead(notification.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Read
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => snoozeNotification(notification.id, addHours(new Date(), 1))}>
                        <Clock className="mr-2 h-4 w-4" /> Snooze 1h
                    </Button>
                     <Button variant="outline" onClick={() => snoozeNotification(notification.id, addHours(new Date(), 24))}>
                        <Clock className="mr-2 h-4 w-4" /> Snooze 1 Day
                    </Button>
                </div>
            </CardContent>
         </Card>

         <div className="space-y-6">
            {/* Related Entity */}
            {notification.metadata?.entityType && notification.metadata?.entityId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Related Entity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                             <div className="text-sm font-medium capitalize text-muted-foreground">
                                {notification.metadata.entityType}
                             </div>
                             <DrillTarget 
                                kind={getDrillKind(notification.metadata.entityType)} 
                                payload={{ id: notification.metadata.entityId }}
                                asChild
                             >
                                <Button variant="outline" className="w-full justify-start h-auto py-3">
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-bold">
                                            {notification.metadata.clientName || `View ${notification.metadata.entityType}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ID: {notification.metadata.entityId.slice(0, 8)}...
                                        </span>
                                    </div>
                                </Button>
                             </DrillTarget>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Metadata */}
            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            {Object.entries(notification.metadata).map(([key, value]) => {
                                if (key === 'entityType' || key === 'entityId') return null;
                                return (
                                    <div key={key} className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <span className="font-medium">
                                            {typeof value === 'number' && key.toLowerCase().includes('amount') 
                                                ? formatCurrency(value) 
                                                : String(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
         </div>
      </div>
    </div>
  );
}
