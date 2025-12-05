import React from "react";
import { DrillConfig } from "../config-types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchDrillPreview } from "../api-helper";
import {
  DollarSign,
  Receipt,
  Building2,
  TrendingUp,
  PieChart,
  FileText,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { simulateAction } from "../action-helper";
import { MicroChart } from "@/components/drilldown/micro-chart";
import { MetricCard } from "@/components/drilldown/metric-card";
import { PreviewSection } from "@/components/drilldown/preview-section";
import { MiniTable } from "@/components/drilldown/mini-table";
import { PaymentScoreIndicator } from "@/components/drilldown/payment-score-indicator";
import { RevenuePreviewData, PaymentPreviewData } from "../preview-data-types";
import { formatPercent } from "../preview-helpers";

export const revenueConfig: DrillConfig<"revenue"> = {
  getRoute: (payload) => {
    const granularity = payload.granularity || "monthly";
    const value = payload.value || new Date().toISOString().slice(0, 7);
    return `/drilldown/revenue/${value}?granularity=${granularity}`;
  },
  renderPreview: (payload, options) => (
    <div className='space-y-3'>
      <div className='text-center pb-2 border-b'>
        <div className='text-xs text-muted-foreground uppercase tracking-wider mb-1'>
          Period
        </div>
        <div className={options?.isMobile ? 'font-bold text-base' : 'font-bold text-lg'}>{payload.value}</div>
      </div>
      {payload.amount !== undefined && (
        <div className='text-center'>
          <div className='text-xs text-muted-foreground uppercase tracking-wider mb-1'>
            Revenue
          </div>
          <div className='text-xl font-bold text-green-600'>
            {formatCurrency(payload.amount)}
          </div>
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("revenue", payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Analyzing revenue...</span>
    </div>
  ),
  renderAsyncPreview: (payload, data: RevenuePreviewData) => (
    <div className='space-y-1'>
      <div className="flex justify-between items-start pb-2 border-b border-border/50">
         <div>
            <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>
               Revenue Analysis
            </div>
            <div className='text-2xl font-bold text-green-600 tracking-tight leading-none'>
               {formatCurrency(data.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
               {payload.value} • {payload.granularity || 'Month'}
            </div>
         </div>
         <div className="flex flex-col items-end">
            <Badge variant={data.growth?.mom >= 0 ? "default" : "destructive"} className={`text-[10px] h-5 ${data.growth?.mom >= 0 ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
               {data.growth?.mom >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
               {Math.abs(data.growth?.mom || 0)}%
            </Badge>
            <span className="text-[10px] text-muted-foreground mt-0.5">vs last period</span>
         </div>
      </div>

      {/* Revenue Breakdown Chart */}
      <PreviewSection title="Category Breakdown" icon={<PieChart className="h-3 w-3" />}>
         <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0">
               <MicroChart 
                  data={data.breakdown?.map(b => b.value) || [40, 30, 20, 10]} 
                  type="donut" 
                  height={80} 
                  width={80}
               />
            </div>
            <div className="flex-1 space-y-1">
               {data.breakdown?.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                     <span className="text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"][i] }} />
                        {item.label}
                     </span>
                     <span className="font-medium">{formatPercent(item.value / data.totalRevenue * 100)}</span>
                  </div>
               ))}
            </div>
         </div>
      </PreviewSection>

      {/* Top Drivers */}
      {data.topDrivers && data.topDrivers.length > 0 && (
         <PreviewSection title="Top Drivers" icon={<TrendingUp className="h-3 w-3" />} compact>
            <MiniTable 
               columns={[
                  { label: "Product", key: "name" },
                  { label: "Revenue", key: "value", align: "right" }
               ]}
               data={data.topDrivers.map(d => ({
                  name: d.name,
                  value: formatCurrency(d.value)
               }))}
            />
         </PreviewSection>
      )}

      {/* Profitability Metrics */}
      <div className='grid grid-cols-2 gap-2 pt-2'>
        <MetricCard
           label="Gross Margin"
           value={formatPercent(data.profitability?.grossMargin || 0)}
           size="sm"
        />
        <MetricCard
           label="Net Margin"
           value={formatPercent(data.profitability?.netMargin || 0)}
           size="sm"
        />
      </div>
    </div>
  ),
  quickActions: () => [
    {
      label: "Export CSV",
      icon: <FileText className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Exporting revenue data");
      },
    },
  ],
};

export const paymentConfig: DrillConfig<"payment"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/payment/${payload.id}` : null,
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='text-center pb-2 border-b'>
        <div className='text-xs text-muted-foreground uppercase tracking-wider mb-1'>
          Payment
        </div>
        <div className='font-bold text-lg text-green-600'>
          {payload.amount !== undefined
            ? formatCurrency(payload.amount)
            : "N/A"}
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <div>
          <span className='text-muted-foreground block'>Company</span>
          <span className='font-medium truncate block'>
            {payload.companyName || "Unknown"}
          </span>
        </div>
        <div>
          <span className='text-muted-foreground block'>Paid Date</span>
          <span className='font-medium block'>
            {payload.paidDate ? formatDate(payload.paidDate) : "N/A"}
          </span>
        </div>
      </div>
      {payload.paymentMethod && (
        <div className='flex justify-center pt-1'>
          <Badge variant='outline' className='text-[10px] h-5'>
            {payload.paymentMethod}
          </Badge>
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("payment", payload),
  renderAsyncPreview: (payload, data: PaymentPreviewData) => (
    <div className='space-y-2'>
      <div className="flex justify-between items-start">
         <div>
            <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
               Payment Receipt
            </div>
            <div className='text-2xl font-bold text-green-600 tracking-tight leading-none'>
               {formatCurrency(data.amount || payload.amount || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium truncate max-w-[180px]">
               {data.company?.name || payload.companyName}
            </div>
         </div>
         <div className="text-right">
             <Badge variant={data.status === "Paid" ? "default" : "outline"} className={`mb-1 text-[10px] h-5 ${data.status === "Paid" ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : ""}`}>
                {data.status || "Paid"}
             </Badge>
             <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                <CreditCard className="h-3 w-3" />
                {data.method || payload.paymentMethod || "N/A"}
             </div>
         </div>
      </div>

      {/* Payment Timeline */}
      <PreviewSection title="Timeline" icon={<Calendar className="h-3 w-3" />} compact>
         <div className="flex justify-between text-xs px-2">
            <div className="text-center">
               <div className="text-[10px] text-muted-foreground uppercase">Ordered</div>
               <div className="font-medium">{formatDate(data.timeline?.[0]?.date || new Date().toISOString())}</div>
            </div>
            <div className="text-center border-l border-r border-border/50 px-4">
               <div className="text-[10px] text-muted-foreground uppercase">Due</div>
               <div className="font-medium">{data.relatedInvoice?.dueDate ? formatDate(data.relatedInvoice.dueDate) : "N/A"}</div>
            </div>
            <div className="text-center">
               <div className="text-[10px] text-muted-foreground uppercase">Paid</div>
               <div className="font-medium text-green-600">{formatDate(data.date || payload.paidDate || new Date().toISOString())}</div>
            </div>
         </div>
      </PreviewSection>

      {/* Company Payment Score */}
      {data.company && (
         <PreviewSection title="Payer Reliability" icon={<Building2 className="h-3 w-3" />} compact>
            <PaymentScoreIndicator 
               score={data.company.paymentScore} 
               size="sm"
               status={data.company.paymentScore >= 80 ? "excellent" : data.company.paymentScore >= 60 ? "good" : "fair"}
            />
         </PreviewSection>
      )}

      {/* Related Invoice Info */}
      <div className='grid grid-cols-2 gap-3 pt-2 border-t border-border/50'>
        <div className="space-y-0.5">
           <span className="text-[10px] uppercase text-muted-foreground">Invoice Balance</span>
           <div className={`font-bold text-sm ${data.relatedInvoice?.balance && data.relatedInvoice.balance > 0 ? "text-red-500" : "text-green-600"}`}>
              {formatCurrency(data.relatedInvoice?.balance || 0)}
           </div>
        </div>
        <div className="space-y-0.5 text-right">
            <span className="text-[10px] uppercase text-muted-foreground">Reference</span>
            <div className="font-mono text-xs text-foreground truncate">
               {data.reference || payload.paymentReference || "N/A"}
            </div>
        </div>
      </div>
    </div>
  ),
  quickActions: (payload) => [
    {
      label: "View Order",
      icon: <Receipt className='h-3 w-3' />,
      onClick: () => {
        window.open(`/orders?id=${payload.orderId}`, "_blank");
      },
    },
    {
      label: "View Company",
      icon: <Building2 className='h-3 w-3' />,
      onClick: () => {
        if (payload.companyId)
          window.open(`/clients/${payload.companyId}`, "_blank");
      },
    },
    {
      label: "Payment History",
      icon: <DollarSign className='h-3 w-3' />,
      onClick: () => {
        if (payload.companyId)
          window.open(
            `/payments/history?company=${payload.companyId}`,
            "_blank"
          );
      },
    },
    {
      label: "Send Receipt",
      icon: <FileText className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Sending receipt email");
      },
    },
  ],
  getRelatedEntities: async () => {
    return [];
  },
};
