import React from "react";
import { DrillConfig, QuickAction } from "../config-types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchDrillPreview } from "../api-helper";
import { fetchCompanyPreviewAction } from "@/app/actions/drilldown";
import { useNotificationStore } from "@/store/use-notification-store";
import { addHours } from "date-fns";
import {
  Building2,
  FileText,
  Phone,
  Plus,
  Package,
  Eye,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  User,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { simulateAction } from "../action-helper";
import { OrderStepper, OrderStatus } from "@/components/drilldown/order-stepper";
import { MicroChart } from "@/components/drilldown/micro-chart";
import { MetricCard } from "@/components/drilldown/metric-card";
import { PreviewSection } from "@/components/drilldown/preview-section";
import { PaymentScoreIndicator } from "@/components/drilldown/payment-score-indicator";
import { MiniTable } from "@/components/drilldown/mini-table";
import { CompanyPreviewData, OrderPreviewData, FeedbackPreviewData, NotificationPreviewData } from "../preview-data-types";
import { formatTimelineDate, getRelativeTime } from "../preview-helpers";

const isValidUUID = (id: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const companyConfig: DrillConfig<"company"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/client/${payload.id}` : null,
  quickActions: (payload) => {
    const actions: QuickAction[] = [
      {
        label: "New Order",
        icon: <Plus className='h-3 w-3' />,
        onClick: () => {
          window.open(`/orders/new?company=${payload.id}`, "_blank");
        },
      },
      {
        label: "View History",
        icon: <FileText className='h-3 w-3' />,
        onClick: () => {
          window.open(`/clients/${payload.id}`, "_blank");
        },
      },
    ];

    if (payload.phoneNumber) {
      actions.push({
        label: "Call Client",
        icon: <Phone className='h-3 w-3' />,
        onClick: () => {
          window.open(`tel:${payload.phoneNumber}`, "_self");
        },
      });
    }

    return actions;
  },
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Client
          </div>
          <div className='font-semibold text-base leading-tight'>
            {payload.name || "Client Details"}
          </div>
        </div>
        {payload.status && (
          <Badge variant='secondary' className='text-[10px]'>
            {payload.status}
          </Badge>
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchCompanyPreviewAction(payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Loading client health...</span>
    </div>
  ),
  renderAsyncPreview: (_payload, data: CompanyPreviewData) => (
    <div className='space-y-1'>
      {/* Header with Payment Score */}
      <div className="flex justify-between items-start pb-2 border-b border-border/50">
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Client Profile
          </div>
          <div className='font-bold text-lg leading-tight mb-1'>
            {data.name}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] h-5">{data.metadata?.tier as string || "Silver"}</Badge>
            <Badge variant={(data.metadata?.status as string) === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
              {data.metadata?.status as string || "Active"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="py-3">
        <PaymentScoreIndicator
          score={data.paymentScore}
          daysToPay={data.daysToPayAvg}
          onTimePercentage={data.onTimePercentage}
          status={data.paymentStatus}
        />
      </div>

      {/* Revenue Trend */}
      <PreviewSection title="Revenue Trend (6m)" icon={<TrendingUp className="h-3 w-3" />}>
        <div className="h-12 w-full">
          <MicroChart
            data={data.revenueTrend || []}
            type="area"
            height={48}
            width={280}
            color="#16a34a"
            fill
          />
        </div>
      </PreviewSection>

      {/* Key Metrics Grid */}
      <div className='grid grid-cols-2 gap-3 py-2'>
        <MetricCard
          label="Lifetime Value"
          value={formatCurrency((data.metadata?.totalSpent as number) || 0)}
          trend={12}
          size="sm"
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(data.outstandingBalance || 0)}
          trend={data.outstandingBalance > 0 ? -5 : 0}
          trendDirection={data.outstandingBalance > 1000 ? "down" : "neutral"}
          size="sm"
          valueClassName={data.outstandingBalance > 0 ? "text-red-600" : "text-green-600"}
        />
      </div>

      {/* Recent Activity */}
      {data.recentOrders && data.recentOrders.length > 0 && (
        <PreviewSection title="Recent Orders" icon={<Clock className="h-3 w-3" />} compact>
          <MiniTable
            columns={[
              { label: "Order", key: "name" },
              { label: "Status", key: "status" },
              { label: "Value", key: "value", align: "right" }
            ]}
            data={data.recentOrders.map(o => ({
              name: o.name,
              status: <Badge variant="outline" className="text-[10px] h-4 px-1">{o.status}</Badge>,
              value: o.value
            }))}
          />
        </PreviewSection>
      )}

      {/* Contact Info */}
      <PreviewSection title="Contact" icon={<User className="h-3 w-3" />} compact collapsible={false}>
        <div className="flex items-center gap-3 text-xs">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{data.contactInfo?.email || "Jane Doe (Manager)"}</div>
            <div className="text-muted-foreground flex gap-2 mt-0.5">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Call</span>
            </div>
          </div>
        </div>
      </PreviewSection>
    </div>
  ),
  getRelatedEntities: async () => {
    return [];
  }
};

export const orderConfig: DrillConfig<"order"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/order/${payload.id}` : null,
  quickActions: (payload) => [
    {
      label: "Track",
      icon: <Package className='h-3 w-3' />,
      onClick: async () => {
        window.open(`/orders?search=${payload.id}`, "_blank");
      },
    },
    {
      label: "Invoice",
      icon: <FileText className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Generating Invoice PDF");
      },
    },
  ],
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-center'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Order
          </div>
          <div className='font-bold text-lg'>#{payload.id}</div>
        </div>
      </div>
      {payload.total !== undefined && (
        <div className='pt-2 border-t border-border/50'>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>
            Total Amount
          </div>
          <div className='font-bold text-lg'>
            {formatCurrency(payload.total)}
          </div>
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("order", payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Tracking order...</span>
    </div>
  ),
  renderAsyncPreview: (payload, data: OrderPreviewData) => (
    <div className='space-y-2'>
      <div className='flex justify-between items-start gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Order Status
          </div>
          <div className='font-bold text-lg leading-tight truncate'>
            #{payload.id}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.metadata?.createdAt ? formatDate(data.metadata.createdAt as string) : "Recently ordered"}
          </div>
        </div>
        <Badge
          className={
            data.status === "Delivered"
              ? "bg-green-500 hover:bg-green-600"
              : "shrink-0"
          }
        >
          {data.status}
        </Badge>
      </div>

      {/* Visual Progress Stepper */}
      <OrderStepper status={(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(data.status) ? data.status : "Pending") as OrderStatus} />

      {/* Order Timeline */}
      <PreviewSection title="Timeline" icon={<Clock className="h-3 w-3" />} compact>
        <div className="space-y-2 pl-2 border-l border-border/50 ml-1">
          {data.timeline?.slice(0, 3).map((event, i) => (
            <div key={i} className="relative pl-3 text-xs">
              <div className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${event.status === 'completed' ? 'bg-primary' : 'bg-muted'}`} />
              <div className="font-medium">{event.title}</div>
              <div className="text-[10px] text-muted-foreground">{formatTimelineDate(event.date)}</div>
            </div>
          ))}
        </div>
      </PreviewSection>

      {/* Order Items Summary */}
      {data.items && data.items.length > 0 && (
        <PreviewSection title="Items" icon={<Package className="h-3 w-3" />} compact>
          <div className="space-y-1">
            {data.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="truncate max-w-[180px]">{item.name}</span>
                <span className="text-muted-foreground">x{item.quantity}</span>
              </div>
            ))}
            {data.items.length > 3 && (
              <div className="text-[10px] text-muted-foreground italic pt-1">
                + {data.items.length - 3} more items
              </div>
            )}
          </div>
        </PreviewSection>
      )}

      <div className='space-y-2.5 pt-2 border-t border-border/50'>
        {(payload.total !== undefined || data.total !== undefined) && (
          <div className='flex justify-between items-center gap-2'>
            <span className='text-xs text-muted-foreground font-medium'>
              Amount
            </span>
            <span className='font-bold text-base'>
              {formatCurrency(data.total !== undefined ? data.total : (payload.total || 0))}
            </span>
          </div>
        )}

        <div className='flex justify-between items-center gap-2'>
          <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold'>
            Payment
          </span>
          <Badge
            variant={data.payment?.status === 'Paid' ? 'outline' : 'destructive'}
            className={data.payment?.status === 'Paid' ? 'text-green-600 border-green-200 bg-green-50' : ''}
          >
            {data.payment?.status || "Pending"}
          </Badge>
        </div>

        {/* Logistics Info */}
        <div className="bg-muted/30 p-2 rounded text-xs flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1">
            <Truck className="h-3 w-3" /> {data.delivery?.trackingNumber ? "FedEx" : "Pending"}
          </span>
          <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
            {data.delivery?.estimatedDate ? `Est: ${formatDate(data.delivery.estimatedDate)}` : "Track"}
          </span>
        </div>
      </div>
    </div>
  ),
  getRelatedEntities: async () => {
    return [];
  }
};

export const feedbackConfig: DrillConfig<"feedback"> = {
  getRoute: (payload) =>
    payload.id && isValidUUID(payload.id)
      ? `/drilldown/feedback/${payload.id}`
      : null,
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Feedback
          </div>
          <div className='font-semibold text-base leading-tight'>
            {payload.clientName || "Client Feedback"}
          </div>
        </div>
        {payload.sentiment && (
          <Badge
            variant={
              payload.sentiment === "positive"
                ? "default"
                : payload.sentiment === "negative"
                  ? "destructive"
                  : "secondary"
            }
            className='text-[10px] gap-1'
          >
            {payload.sentiment === "positive" ? (
              <ThumbsUp className='h-3 w-3' />
            ) : payload.sentiment === "negative" ? (
              <ThumbsDown className='h-3 w-3' />
            ) : (
              <MessageSquare className='h-3 w-3' />
            )}
            {payload.sentiment}
          </Badge>
        )}
      </div>
      {payload.message && (
        <div className="text-xs text-muted-foreground italic line-clamp-2">
          "{payload.message}"
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("feedback", payload),
  renderAsyncPreview: (payload, data: FeedbackPreviewData, options) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Feedback
          </div>
          <div className='font-semibold text-base leading-tight'>
            {data.client?.name || payload.clientName}
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
          <span className='font-bold'>{data.rating}/5</span>
        </div>
      </div>

      <div className='bg-muted/30 p-2 rounded border border-border/50'>
        <div className='flex items-center gap-2 mb-1'>
          {data.sentiment === "positive" ? (
            <ThumbsUp className='h-3 w-3 text-green-600' />
          ) : data.sentiment === "negative" ? (
            <ThumbsDown className='h-3 w-3 text-red-600' />
          ) : (
            <MessageSquare className='h-3 w-3 text-muted-foreground' />
          )}
          <span
            className={`text-xs font-medium capitalize ${data.sentiment === "positive"
              ? "text-green-600"
              : data.sentiment === "negative"
                ? "text-red-600"
                : "text-muted-foreground"
              }`}
          >
            {data.sentiment} Sentiment
          </span>
        </div>
        <div className={`text-xs italic text-muted-foreground ${options?.isMobile ? 'line-clamp-2' : ''}`}>
          "{data.metadata?.message as string || data.message}"
        </div>
        <div className='text-[10px] text-muted-foreground text-right mt-1'>
          {formatDate(data.date || data.feedbackDate)}
        </div>
      </div>

      {/* Sentiment Trend */}
      <PreviewSection title="Sentiment History" icon={<TrendingUp className="h-3 w-3" />} compact>
        <div className="h-8 w-full">
          <MicroChart
            data={data.sentimentTrend || [3, 4, 5, 4, 5]}
            type="bar"
            height={32}
            width={280}
            color={data.sentiment === 'positive' ? '#16a34a' : data.sentiment === 'negative' ? '#dc2626' : '#94a3b8'}
          />
        </div>
      </PreviewSection>

      {/* Response Time */}
      {data.responseTime && (
        <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2">
          <span className="text-muted-foreground">Response Time</span>
          <span className="font-medium">{data.responseTime}h avg</span>
        </div>
      )}
    </div>
  ),
  quickActions: (payload) => [
    {
      label: "Reply",
      icon: <MessageSquare className='h-3 w-3' />,
      onClick: () => {
        if (payload.id && isValidUUID(payload.id)) {
          window.location.href = `/drilldown/feedback/${payload.id}`;
        }
      },
    },
    {
      label: "Share Link",
      icon: <Share2 className='h-3 w-3' />,
      onClick: () => {
        if (payload.id) {
          const url = `${window.location.origin}/drilldown/feedback/${payload.id}`;
          navigator.clipboard.writeText(url);
        }
      },
    },
    {
      label: "View Client",
      icon: <Building2 className='h-3 w-3' />,
      onClick: () => {
        if (payload.clientId) {
          window.open(`/clients/${payload.clientId}`, "_blank");
        }
      },
    },
  ],
  getRelatedEntities: async () => {
    return [];
  },
};

export const notificationConfig: DrillConfig<"notification"> = {
  getRoute: (payload) =>
    isValidUUID(payload.id) ? `/drilldown/notification/${payload.id}` : null,
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div>
        <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
          Notification
        </div>
        <div className='flex items-center gap-2 mb-1'>
          {payload.priority && (
            <Badge
              variant={
                payload.priority === "critical"
                  ? "destructive"
                  : payload.priority === "warning"
                    ? "secondary"
                    : "outline"
              }
              className='h-5 px-1.5 text-[10px] uppercase'
            >
              {payload.priority}
            </Badge>
          )}
          <span className='text-xs text-muted-foreground flex items-center gap-1'>
            <Clock className='h-3 w-3' />
            {payload.createdAt ? getRelativeTime(payload.createdAt) : "Just now"}
          </span>
        </div>
        <div className='font-semibold text-sm leading-snug'>
          {payload.title || "Notification"}
        </div>
      </div>
      {payload.message && (
        <div className='text-xs text-muted-foreground line-clamp-2'>
          {payload.message}
        </div>
      )}
      <div className='flex items-center gap-2 pt-2 border-t border-border/50'>
        {payload.read ? (
          <Badge variant='outline' className='text-xs bg-muted/50'>
            Read
          </Badge>
        ) : (
          <Badge className='text-xs bg-blue-500 hover:bg-blue-600'>New</Badge>
        )}
        {payload.snoozedUntil && (
          <Badge
            variant='outline'
            className='text-xs text-yellow-600 border-yellow-200 bg-yellow-50'
          >
            Snoozed
          </Badge>
        )}
        {payload.source && (
          <span className='text-xs text-muted-foreground ml-auto capitalize'>
            {payload.source}
          </span>
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("notification", payload),
  renderAsyncPreview: (_payload, data: NotificationPreviewData) => (
    <div className='space-y-3'>
      <div>
        <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
          Notification Details
        </div>
        <div className='flex items-center gap-2 mb-2'>
          <Badge
            variant={
              data.priority === "critical"
                ? "destructive"
                : data.priority === "warning"
                  ? "secondary"
                  : "outline"
            }
          >
            {data.priority}
          </Badge>
          <span className='text-xs text-muted-foreground'>
            {formatDate(data.created)}
          </span>
        </div>
        <div className='font-bold text-base mb-1'>{data.title}</div>
        <div className='text-sm text-muted-foreground'>{data.message}</div>
      </div>

      {data.relatedEntity && (
        <div className='bg-muted/30 p-2 rounded border border-border/50 text-xs'>
          <span className='font-semibold uppercase text-[10px] block mb-1 text-muted-foreground'>
            Related {data.relatedEntity.type}
          </span>
          <div className="flex items-center gap-2">
            <div className="font-medium">{data.relatedEntity.name}</div>
            {data.relatedEntity.status && <Badge variant="outline" className="text-[10px] h-4 px-1">{data.relatedEntity.status}</Badge>}
          </div>
        </div>
      )}

      {/* Similar Notifications */}
      {data.similarCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-500/5 p-1.5 rounded">
          <AlertTriangle className="h-3 w-3" />
          <span>{data.similarCount} similar notifications this week</span>
        </div>
      )}
    </div>
  ),
  quickActions: (payload) => {
    const actions: QuickAction[] = [];

    if (!payload.read) {
      actions.push({
        label: "Mark as Read",
        icon: <CheckCircle className='h-3 w-3' />,
        onClick: async () => {
          await simulateAction("Marking as read");
          useNotificationStore.getState().markAsRead(payload.id);
        },
      });
    }

    actions.push({
      label: "Snooze 1h",
      icon: <Clock className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Snoozing notification");
        useNotificationStore
          .getState()
          .snoozeNotification(payload.id, addHours(new Date(), 1));
      },
    });

    if (payload.snoozedUntil) {
      actions.push({
        label: "Clear Snooze",
        icon: <XCircle className='h-3 w-3' />,
        onClick: async () => {
          await simulateAction("Clearing snooze");
          useNotificationStore.getState().clearSnooze(payload.id);
        },
      });
    }

    if (payload.link) {
      actions.push({
        label: "View Related",
        icon: <Eye className='h-3 w-3' />,
        onClick: () => {
          window.location.href = payload.link!;
        },
      });
    }

    return actions;
  },
  getRelatedEntities: async () => {
    return [];
  },
};

import { TrendingUp } from "lucide-react";
