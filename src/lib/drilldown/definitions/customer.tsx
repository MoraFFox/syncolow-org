import React from "react";
import { DrillConfig } from "../config-types";
import { fetchDrillPreview } from "../api-helper";
import { MicroChart } from "@/components/drilldown/micro-chart";
import { MetricCard } from "@/components/drilldown/metric-card";
import { PreviewSection } from "@/components/drilldown/preview-section";
import { MiniTable } from "@/components/drilldown/mini-table";
import { Users, TrendingUp, UserPlus, UserMinus, PieChart } from "lucide-react";
import { CustomerPreviewData } from "../preview-data-types";
import { formatNumber, formatPercent } from "../preview-helpers";

export const customerConfig: DrillConfig<"customer"> = {
  getRoute: () => `/clients`,
  renderPreview: () => (
    <div className='text-sm text-muted-foreground italic text-center py-2'>
      Click to view customer details
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("customer", payload),
  renderAsyncPreview: (_payload, data: CustomerPreviewData) => (
    <div className="space-y-1">
      {/* Header Metrics */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <MetricCard
          label="Total Customers"
          value={formatNumber((data.metadata?.totalCustomers as number) || 0)}
          trend={data.growthTrend ? ((data.growthTrend[data.growthTrend.length - 1] - data.growthTrend[0]) / data.growthTrend[0]) * 100 : 0}
          icon={<Users className="h-3 w-3" />}
          size="sm"
        />
        <MetricCard
          label="Active Rate"
          value={formatPercent(data.metrics?.retentionRate || 0)}
          subtext="Retention"
          icon={<TrendingUp className="h-3 w-3" />}
          size="sm"
        />
      </div>

      {/* Growth Chart */}
      <PreviewSection title="Acquisition Trend" icon={<UserPlus className="h-3 w-3" />}>
        <div className="h-16 w-full">
          <MicroChart 
            data={data.growthTrend || []} 
            type="area" 
            height={60} 
            width={280}
            color="#2563eb"
            fill
          />
        </div>
      </PreviewSection>

      {/* Segmentation */}
      <PreviewSection title="Customer Segments" icon={<PieChart className="h-3 w-3" />}>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0">
            <MicroChart 
              data={data.segmentation?.map(s => s.value) || []} 
              type="donut" 
              height={80} 
              width={80}
            />
          </div>
          <div className="flex-1 space-y-1">
            {data.segmentation?.slice(0, 3).map((seg, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#2563eb", "#3b82f6", "#60a5fa"][i] }} />
                  {seg.label}
                </span>
                <span className="font-medium">{formatNumber(seg.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </PreviewSection>

      {/* Health Indicators */}
      <PreviewSection title="Health Check" icon={<UserMinus className="h-3 w-3" />} compact>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-500/10 rounded p-1.5 border border-red-500/20">
            <div className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase">At Risk</div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">
              {data.metrics?.churnRisk ? Math.round(data.metrics.churnRisk) : 0}
            </div>
          </div>
          <div className="bg-green-500/10 rounded p-1.5 border border-green-500/20">
            <div className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase">High Value</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">
              {formatNumber(data.metrics?.ltv || 0)}
            </div>
          </div>
        </div>
      </PreviewSection>

      {/* Top Customers */}
      {data.topCustomers && data.topCustomers.length > 0 && (
        <PreviewSection title="Top Customers" compact>
          <MiniTable
            columns={[
              { label: "Name", key: "name" },
              { label: "Value", key: "value", align: "right" }
            ]}
            data={data.topCustomers.map(c => ({
              name: c.name,
              value: c.value ?? 0
            }))}
          />
        </PreviewSection>
      )}
    </div>
  )
};
