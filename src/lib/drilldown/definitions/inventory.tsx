import React from "react";
import { DrillConfig } from "../config-types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchDrillPreview } from "../api-helper";
import { fetchProductPreviewAction } from "@/app/actions/drilldown";
import { StockVelocity } from "@/components/drilldown/stock-velocity";
import {
  Package,
  Eye,
  Factory,
  Phone,
  BarChart3,
  Truck,
  TrendingUp,
  AlertTriangle,
  Layers,
  PieChart
} from "lucide-react";
import { simulateAction } from "../action-helper";
import { MiniTable } from "@/components/drilldown/mini-table";
import { MicroChart } from "@/components/drilldown/micro-chart";
import { MetricCard } from "@/components/drilldown/metric-card";
import { PreviewSection } from "@/components/drilldown/preview-section";
import { ProductPreviewData, ManufacturerPreviewData, CategoryPreviewData, InventoryPreviewData } from "../preview-data-types";
import { formatPercent } from "../preview-helpers";

const isValidUUID = (id: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const productConfig: DrillConfig<"product"> = {
  getRoute: (payload) =>
    payload.id ? `/drilldown/product/${payload.id}` : null,
  quickActions: (payload) => [
    {
      label: "Check Stock",
      icon: <Package className='h-3 w-3' />,
      onClick: () => {
        window.open(`/inventory?product=${payload.id}`, "_blank");
      },
    },
    {
      label: "View Orders",
      icon: <Eye className='h-3 w-3' />,
      onClick: () => {
        window.open(`/orders?product=${payload.id}`, "_blank");
      },
    },
    {
      label: "Restock",
      icon: <Truck className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Creating purchase order");
      },
    },
  ],
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div>
        <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
          Product
        </div>
        <div className='font-semibold text-base leading-tight'>
          {payload.name || payload.id}
        </div>
      </div>
      {payload.stock !== undefined && (
        <div className='flex justify-between items-center pt-2 border-t border-border/50'>
          <span className='text-xs text-muted-foreground font-medium'>
            Stock Level
          </span>
          <Badge
            variant={payload.stock > 0 ? "outline" : "destructive"}
            className='font-mono'
          >
            {payload.stock}
          </Badge>
        </div>
      )}
      {payload.price !== undefined && (
        <div className='flex justify-between items-center pt-2 border-t border-border/50'>
          <span className='text-xs text-muted-foreground font-medium'>
            Price
          </span>
          <span className='font-bold'>{formatCurrency(payload.price)}</span>
        </div>
      )}
    </div>
  ),
  fetchPreviewData: (payload) => fetchProductPreviewAction(payload),
  renderLoadingPreview: () => (
    <div className='flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground'>
      <div className='animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full' />
      <span>Checking inventory...</span>
    </div>
  ),
  renderAsyncPreview: (payload, data: ProductPreviewData) => (
    <div className="space-y-2">
      <div className="flex gap-3">
         {data.metadata?.image ? (
            <div className="h-12 w-12 rounded bg-muted shrink-0 overflow-hidden border border-border/50">
               <img src={data.metadata.image as string} alt="" className="h-full w-full object-cover" />
            </div>
         ) : (
            <div className="h-12 w-12 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
               <Package className="h-6 w-6" />
            </div>
         )}
         <div>
            <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>
              Product SKU: {data.sku || payload.id.slice(0,6)}
            </div>
            <div className='font-bold text-base leading-tight line-clamp-2'>
              {data.name || payload.name}
            </div>
         </div>
      </div>

      <div className="text-xs border-t border-b border-border/50 py-2">
         <div>
            <span className="text-muted-foreground block">Unit Price</span>
            <span className="font-bold text-base">{formatCurrency(data.price || payload.price || 0)}</span>
         </div>
      </div>

      {/* Sales Trend */}
      <PreviewSection title="Sales Trend (30d)" icon={<TrendingUp className="h-3 w-3" />} compact>
         <div className="h-10 w-full">
            <MicroChart 
               data={data.salesTrend || []} 
               type="bar" 
               height={40} 
               width={280}
               color="#3b82f6"
            />
         </div>
      </PreviewSection>

      {/* Stock Velocity Visualization */}
      <StockVelocity 
         stock={data.stockLevel || payload.stock || 0} 
         velocity={data.metrics?.turnoverRate || 0} 
      />
      
      {data.stockStatus === "low_stock" && (
         <div className="bg-amber-50 text-amber-700 text-xs px-2 py-1.5 rounded flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Low stock alert - Reorder soon</span>
         </div>
      )}
    </div>
  )
};

export const manufacturerConfig: DrillConfig<"manufacturer"> = {
  getRoute: (payload) =>
    payload.id && isValidUUID(payload.id)
      ? `/drilldown/manufacturer/${payload.id}`
      : null,
  quickActions: (payload) => {
    const actions = [];
    if (payload.phoneNumber) {
      actions.push({
        label: "Call",
        icon: <Phone className='h-3 w-3' />,
        onClick: () => {
          window.open(`tel:${payload.phoneNumber}`, "_self");
        },
      });
    }
    
    actions.push({
      label: "Catalog",
      icon: <BarChart3 className='h-3 w-3' />,
      onClick: async () => {
        await simulateAction("Downloading catalog");
      },
    });

    return actions;
  },
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Manufacturer
          </div>
          <div className='font-semibold text-base leading-tight flex items-center gap-2'>
            {payload.icon ? (
              <img
                src={payload.icon}
                alt=''
                className='w-4 h-4 object-contain'
              />
            ) : (
              <Factory className='h-4 w-4' />
            )}
            {payload.name || "Unknown Manufacturer"}
          </div>
        </div>
        {payload.productCount !== undefined && (
          <Badge variant='secondary' className='text-[10px]'>
            {payload.productCount} Products
          </Badge>
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("manufacturer", payload),
  renderAsyncPreview: (_payload, data: ManufacturerPreviewData) => (
    <div className='space-y-2'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Manufacturer
          </div>
          <div className='font-semibold text-base leading-tight flex items-center gap-2'>
            {data.metadata?.icon ? (
              <img
                src={data.metadata.icon as string}
                alt=''
                className='w-5 h-5 object-contain'
              />
            ) : (
              <Factory className='h-4 w-4' />
            )}
            {data.name}
          </div>
        </div>
        <div className="text-right">
           <div className='font-bold text-green-600'>{formatCurrency(data.revenueTrend?.[data.revenueTrend.length - 1] || 0)}</div>
           <div className="text-[10px] text-muted-foreground">30d Revenue</div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <MetricCard
           label="Total Products"
           value={data.totalProducts}
           size="sm"
        />
        <MetricCard
           label="On-Time Delivery"
           value={formatPercent(data.performance?.onTimeDelivery || 0)}
           size="sm"
           valueClassName={data.performance?.onTimeDelivery >= 90 ? "text-green-600" : "text-amber-600"}
        />
      </div>

      {/* Revenue Trend */}
      <PreviewSection title="Revenue Trend" icon={<TrendingUp className="h-3 w-3" />} compact>
         <div className="h-10 w-full">
            <MicroChart 
               data={data.revenueTrend || []} 
               type="line" 
               height={40} 
               width={280}
               color="#16a34a"
               fill
            />
         </div>
      </PreviewSection>

      {data.topProducts && data.topProducts.length > 0 && (
        <PreviewSection title="Top Sellers" icon={<Package className="h-3 w-3" />} compact>
          <MiniTable 
             data={data.topProducts.map(p => ({
                name: p.name,
                sold: p.value || "N/A"
             }))} 
             columns={[
                { label: "Product", key: "name" },
                { label: "Sold", key: "sold", align: "right" }
             ]}
          />
        </PreviewSection>
      )}
    </div>
  ),
};

export const categoryConfig: DrillConfig<"category"> = {
  getRoute: () => `/products/categories`,
  renderPreview: (payload) => (
    <div className='space-y-3'>
      <div className='flex justify-between items-start gap-2'>
        <div>
          <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1'>
            Category
          </div>
          <div className='font-semibold text-base leading-tight'>
            {payload.name || "Category"}
          </div>
        </div>
        {payload.productCount !== undefined && (
          <Badge variant='secondary' className='text-[10px]'>
            {payload.productCount} Products
          </Badge>
        )}
      </div>
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("category", payload),
  renderAsyncPreview: (_payload, data: CategoryPreviewData) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <div>
               <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>Category</div>
               <div className='font-bold text-lg leading-tight'>{data.name}</div>
            </div>
            <div className="text-right">
                <div className='font-bold text-green-600'>{formatCurrency(data.totalRevenue)}</div>
                <div className='text-[10px] text-muted-foreground'>Total Revenue</div>
            </div>
        </div>

        {/* Performance Chart */}
        <PreviewSection title="Performance" icon={<TrendingUp className="h-3 w-3" />} compact>
           <div className="h-10 w-full">
              <MicroChart 
                 data={data.performanceTrend || []} 
                 type="area" 
                 height={40} 
                 width={280}
                 color="#8b5cf6"
                 fill
              />
           </div>
        </PreviewSection>

        {/* Top Performing Products in Category */}
        <PreviewSection title="Top Performers" icon={<Package className="h-3 w-3" />} compact>
            <MiniTable 
                data={data.topProducts?.map(p => ({
                   name: p.name,
                   revenue: formatCurrency(Number(p.value) || 0),
                   trend: <span className="text-green-600 text-[10px]">+5%</span>
                })) || []} 
                columns={[
                    { label: "Product", key: "name" },
                    { label: "Rev", key: "revenue", align: "right" },
                    { label: "Trend", key: "trend", align: "right" }
                ]}
            />
        </PreviewSection>
    </div>
  )
};

export const inventoryConfig: DrillConfig<"inventory"> = {
  getRoute: () => `/inventory`,
  renderPreview: () => (
    <div className='text-sm text-muted-foreground italic text-center py-2'>
      Click to view inventory details
    </div>
  ),
  fetchPreviewData: (payload) => fetchDrillPreview("inventory", payload),
  renderAsyncPreview: (_payload, data: InventoryPreviewData) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
               <div className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5'>Inventory Snapshot</div>
               <div className='font-bold text-base leading-tight'>Global Stock</div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 p-2 rounded border border-red-100">
               <div className="text-[10px] text-red-600 uppercase font-bold">Low Stock</div>
               <div className="text-xl font-bold text-red-700">{data.stockDistribution?.low || 0}</div>
               <div className="text-[10px] text-red-600/80">Items below threshold</div>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-100">
               <div className="text-[10px] text-blue-600 uppercase font-bold">Overstock</div>
               <div className="text-xl font-bold text-blue-700">{data.stockDistribution?.overstock || 0}</div>
               <div className="text-[10px] text-blue-600/80">Items above max</div>
            </div>
        </div>

        {/* Valuation Breakdown */}
        <PreviewSection title="Valuation by Category" icon={<PieChart className="h-3 w-3" />} compact>
           <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0">
                 <MicroChart 
                    data={data.valuationBreakdown?.map(v => v.value) || []} 
                    type="donut" 
                    height={64} 
                    width={64}
                 />
              </div>
              <div className="flex-1 space-y-1">
                 <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Valuation</span>
                    <span className="font-mono font-medium">{formatCurrency(data.totalValue || 0)}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Active SKUs</span>
                    <span className="font-mono font-medium">{data.totalItems || 0}</span>
                 </div>
              </div>
           </div>
        </PreviewSection>
    </div>
  )
};
