
"use client";

import { useState, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';

interface CalendarSyncButtonProps {
  order: Order;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  showConnectButton?: boolean; // If false, won't show the connect button
}

export function CalendarSyncButton({ 
  order, 
  variant = "outline", 
  size = "sm", 
  className = "",
  showConnectButton = true 
}: CalendarSyncButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const event = {
        summary: `Order #${order.id} - ${order.companyName || order.clientName || 'Client'}`,
        description: `Order Details:\nTotal: ${order.grandTotal || 'N/A'}\nStatus: ${order.status || 'Scheduled'}\n\nView in App: ${window.location.href}`,
        start: {
          dateTime: order.deliveryDate ? new Date(order.deliveryDate).toISOString() : new Date().toISOString(),
        },
        end: {
          dateTime: order.deliveryDate 
            ? new Date(new Date(order.deliveryDate).getTime() + 60 * 60 * 1000).toISOString() 
            : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
        },
        location: order.location || order.clientName || '',
      };

      const res = await fetch('/api/google-calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Synced to Calendar",
          description: "Event created successfully.",
        });
        if (data.link) {
            window.open(data.link, '_blank');
        }
      } else {
        throw new Error(data.error || 'Failed to create event');
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Could not create calendar event. Connect your calendar in Settings.",
        variant: "destructive"
      });
      checkStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (!isConnected) {
    // Only show connect button if explicitly requested
    if (!showConnectButton) {
      return null;
    }
    return (
      <Button variant={variant} size={size} onClick={handleConnect} className={className}>
        <Calendar className="mr-2 h-4 w-4" />
        Connect Calendar
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleSync} disabled={isSyncing} className={className}>
      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
      {isSyncing ? 'Syncing...' : 'Add to Calendar'}
    </Button>
  );
}
