import React from "react";
import { DrillConfig, QuickAction } from "../config-types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchDrillPreview } from "../api-helper";
import { fetchBranchPreviewAction } from "@/app/actions/drilldown";
import { StarRating } from "@/components/drilldown/star-rating";
import { TimelineVertical } from "@/components/drilldown/timeline-vertical";
import {
  Building2,
  Wrench,
  FileText,
  Phone,
  ClipboardList,
  MapPin,
  Plus,
  Calendar,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Users
} from "lucide-react";
import { simulateAction } from "../action-helper";
import { MicroChart } from "@/components/drilldown/micro-chart";
import { MetricCard } from "@/components/drilldown/metric-card";
import { PreviewSection } from "@/components/drilldown/preview-section";

import { MaintenancePreviewData, BaristaPreviewData, BranchPreviewData } from "../preview-data-types";
import { formatTimelineDate } from "../preview-helpers";

export const maintenanceConfig: DrillConfig<"maintenance"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/maintenance/${payload.id}` : null,
  quickActions: (payload) => [
    {
      label: "View Branch",
      icon: <Building2 className='h-3 w-3' />,
      onClick: () => {
        if (payload.branchId) {
          window.open(`/drilldown/branch/${payload.branchId}`, "_blank");
        }
      },
    },
    {
      label: "Download Report",
      icon: <FileText className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Downloading report");
      },
    },
  ],
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Maintenance
          </div>
          <div className='font-semibold text-base leading-tight'>
            {formatDate(payload.date || new Date().toISOString())}
          </div>
        </div>
        {payload.status && (
          <Badge
            variant={payload.status === "Completed" ? "default" : "outline"}
            className='text-[10px]'
          >
            {payload.status}
          </Badge>
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("maintenance", payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Loading maintenance details...</span>
    </div>
  ),
  renderAsyncPreview: (payload, data: MaintenancePreviewData) => {
    return (
        <div className='space-y-2'>
          <div className='flex justify-between items-start pb-2 border-b border-border/50'>
            <div>
              <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
                Maintenance Visit
              </div>
              <div className='font-bold text-base leading-tight'>
                {formatDate(data.date)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                 <Wrench className="h-3 w-3" />
                 {data.technician?.name || "Unassigned"}
              </div>
            </div>
            <Badge
              className={
                data.status === "Completed" ? "bg-green-500" : "bg-blue-500"
              }
            >
              {data.status}
            </Badge>
          </div>
    
          {/* Visit Timeline */}
          <PreviewSection title="Service Timeline" icon={<Calendar className="h-3 w-3" />} compact>
             <div className="bg-muted/20 p-2 rounded-lg border border-border/30">
                <TimelineVertical items={data.timeline?.map(t => ({
                   title: t.title,
                   time: formatTimelineDate(t.date),
                   status: t.status
                })) || []} />
             </div>
          </PreviewSection>
    
          {/* Cost & Location Footer */}
          <div className="grid grid-cols-2 gap-3 pt-1">
             <div>
                <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>
                   Location
                </div>
                <div className="text-xs font-medium truncate flex items-center gap-1">
                   <Building2 className="h-3 w-3 text-muted-foreground" />
                   {data.metadata?.branchName as string || "Unknown Branch"}
                </div>
             </div>
             {data.cost?.total && (
                 <div>
                    <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>
                       Total Cost
                    </div>
                    <div className="text-xs font-bold font-mono">
                       {formatCurrency(data.cost.total)}
                    </div>
                 </div>
             )}
          </div>
        </div>
      );
  },
  getRelatedEntities: async () => {
    return [];
  }
};

export const baristaConfig: DrillConfig<"barista"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/barista/${payload.id}` : null,
  quickActions: (payload) => {
    const actions: QuickAction[] = [
      {
        label: "View Branch",
        icon: <Building2 className='h-3 w-3' />,
        onClick: () => {
          if (payload.branchId) {
            window.open(`/drilldown/branch/${payload.branchId}`, "_blank");
          }
        },
      },
      {
        label: "View Visits",
        icon: <ClipboardList className='h-3 w-3' />,
        onClick: () => {
          window.open(`/maintenance?barista=${payload.id}`, "_blank");
        },
      },
    ];

    if (payload.phoneNumber) {
      actions.push({
        label: "Call",
        icon: <Phone className='h-3 w-3' />,
        onClick: () => {
          window.open(`tel:${payload.phoneNumber}`, "_self");
        },
      });
      actions.push({
        label: "Message",
        icon: <FileText className='h-3 w-3' />,
        onClick: async () => {
          await simulateAction("Sending message");
        },
      });
    }

    return actions;
  },
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className="flex items-start justify-between">
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Barista
          </div>
          <div className='font-semibold text-base leading-tight'>
            {payload.name || "Barista Details"}
          </div>
        </div>
        {payload.rating !== undefined && (
           <StarRating rating={payload.rating} size="sm" />
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("barista", payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Loading barista profile...</span>
    </div>
  ),
  renderAsyncPreview: (_payload, data: BaristaPreviewData) => (
    <div className='space-y-2'>
      {/* Header */}
      <div className='flex justify-between items-start border-b border-border/50 pb-3'>
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <UserCheck className="h-5 w-5" />
           </div>
           <div>
              <div className='font-bold text-base leading-tight'>
                {data.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                 <Building2 className="h-3 w-3" />
                 {data.branch?.name || "Unassigned"}
              </div>
           </div>
        </div>
        <div className='flex flex-col items-end'>
          <StarRating rating={data.rating || 0} size="sm" />
          <span className='text-[10px] text-muted-foreground mt-0.5'>Overall Rating</span>
        </div>
      </div>

      {/* Performance Grid */}
      <div className='grid grid-cols-2 gap-2'>
        <MetricCard
           label="Visits Done"
           value={data.metrics?.visitsPerDay || 0}
           subtext="Per Day"
           size="sm"
        />
        <MetricCard
           label="Next Shift"
           value={data.schedule?.nextShift ? formatDate(data.schedule.nextShift).split(',')[0] : "Mon"}
           subtext={data.schedule?.nextShift ? formatDate(data.schedule.nextShift).split(',')[1] : "9:00 AM"}
           size="sm"
           icon={<Calendar className="h-3 w-3" />}
        />
      </div>

      {/* Performance Trend */}
      <PreviewSection title="Rating Trend" icon={<TrendingUp className="h-3 w-3" />} compact>
         <div className="h-8 w-full">
            <MicroChart 
               data={data.performanceTrend || []} 
               type="line" 
               height={32} 
               width={280}
               color="#d97706"
            />
         </div>
      </PreviewSection>
      
      {/* Skill Tags */}
      <div className="flex flex-wrap gap-1.5 pt-1">
         {data.skills?.map(skill => (
            <Badge key={skill.name} variant="secondary" className="text-[10px] h-5 font-normal text-muted-foreground bg-muted border-0">
               {skill.name}
            </Badge>
         ))}
      </div>
    </div>
  ),
};

export const branchConfig: DrillConfig<"branch"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/branch/${payload.id}` : null,
  quickActions: (payload) => {
    const actions: QuickAction[] = [
      {
        label: "View Company",
        icon: <Building2 className='h-3 w-3' />,
        onClick: () => {
          if (payload.companyId) {
            window.open(`/clients/${payload.companyId}`, "_blank");
          }
        },
      },
      {
        label: "New Order",
        icon: <Plus className='h-3 w-3' />,
        onClick: () => {
          window.open(`/orders/new?branch=${payload.id}`, "_blank");
        },
      },
      {
        label: "Schedule Maint.",
        icon: <Wrench className='h-3 w-3' />,
        onClick: () => {
          window.open(`/maintenance?branch=${payload.id}`, "_blank");
        },
      },
    ];

    if (payload.phoneNumber) {
      actions.push({
        label: "Call Branch",
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
      <div>
        <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
          Branch
        </div>
        <div className='font-semibold text-base leading-tight'>
          {payload.name || "Branch Details"}
        </div>
      </div>
      {payload.location && (
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <MapPin className='h-3 w-3' />
          <span className='truncate'>{payload.location}</span>
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchBranchPreviewAction(payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Loading branch details...</span>
    </div>
  ),
  renderAsyncPreview: (payload, data: BranchPreviewData) => (
    <div className='space-y-2'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Branch
          </div>
          <div className='font-semibold text-base leading-tight'>
            {data.name}
          </div>
          {!!data.metadata?.parentCompanyName && (
            <div className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1'>
               <Building2 className="h-3 w-3" />
               {data.metadata?.parentCompanyName as string}
            </div>
          )}
        </div>
        {data.metadata?.machineOwned !== undefined && (
          <Badge
            variant={data.metadata.machineOwned ? "default" : "outline"}
            className='text-[10px]'
          >
            {data.metadata.machineOwned ? "Owned" : "Leased"}
          </Badge>
        )}
      </div>

      {/* Health Score */}
      {data.healthScore !== undefined && (
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] text-muted-foreground uppercase font-semibold'>
                Performance Score
            </span>
            <span className="font-bold text-xs">{Number(data.healthScore).toFixed(1)}/10</span>
          </div>
          <div className='h-2 w-full bg-muted rounded-full overflow-hidden'>
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                data.healthScore >= 8
                  ? "bg-green-500"
                  : data.healthScore >= 5
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${data.healthScore * 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Revenue Trend */}
      <PreviewSection title="Revenue Trend" icon={<TrendingUp className="h-3 w-3" />} compact>
         <div className="h-8 w-full">
            <MicroChart 
               data={data.revenueTrend || []} 
               type="area" 
               height={32} 
               width={280}
               color="#f59e0b"
               fill
            />
         </div>
      </PreviewSection>

      {/* Staff & Alerts */}
      <div className="grid grid-cols-2 gap-2">
         <MetricCard
            label="Staff"
            value={data.staff?.count || 0}
            subtext={`Avg Rating: ${data.staff?.avgRating || 0}`}
            size="sm"
            icon={<Users className="h-3 w-3" />}
         />
         {data.alerts && data.alerts.length > 0 ? (
            <div className="bg-red-50 p-2 rounded border border-red-100">
               <div className="text-[10px] text-red-600 uppercase font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Alerts
               </div>
               <div className="text-xs font-medium text-red-700 mt-0.5 truncate">
                  {data.alerts[0].message}
               </div>
            </div>
         ) : (
            <div className="bg-green-50 p-2 rounded border border-green-100 flex items-center justify-center">
               <span className="text-xs font-medium text-green-700">All Systems Normal</span>
            </div>
         )}
      </div>
    </div>
  ),
};
