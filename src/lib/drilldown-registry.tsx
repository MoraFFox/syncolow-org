import React from 'react';
import { DrillKind, DrillPayload } from './drilldown-types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, ShoppingCart, FileText, Plus, Eye } from 'lucide-react';
import { TrendBadge } from '@/components/ui/trend-badge';
import { Sparkline } from '@/components/ui/sparkline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
}

export interface RelatedEntity {
  kind: DrillKind;
  payload: DrillPayload;
  label: string;
  relationship: string;
}

export interface DrillConfig<K extends DrillKind> {
  getRoute: (payload: DrillPayload<K>) => string | null;
  renderPreview: (payload: DrillPayload<K>) => React.ReactNode;
  
  // Optional async preview data fetching
  fetchPreviewData?: (payload: DrillPayload<K>) => Promise<any>;
  renderLoadingPreview?: () => React.ReactNode;
  renderAsyncPreview?: (payload: DrillPayload<K>, data: any) => React.ReactNode;
  
  // Quick actions in preview
  quickActions?: (payload: DrillPayload<K>) => QuickAction[];
  
  // Related entities
  getRelatedEntities?: (payload: DrillPayload<K>) => Promise<RelatedEntity[]>;
}

export const DRILL_REGISTRY: { [K in DrillKind]: DrillConfig<K> } = {
  revenue: {
    getRoute: (payload) => {
      const granularity = payload.granularity || 'monthly';
      const value = payload.value || new Date().toISOString().slice(0, 7);
      return `/drilldown/revenue/${value}?granularity=${granularity}`;
    },
    renderPreview: (payload) => (
      <div className="space-y-3">
        <div className="text-center pb-2 border-b">
           <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Period</div>
           <div className="font-bold text-lg">{payload.value}</div>
        </div>
        {payload.amount !== undefined && (
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Revenue</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(payload.amount)}</div>
          </div>
        )}
      </div>
    ),
    // Async preview: fetch period revenue metrics
    fetchPreviewData: async (payload) => {
      if (!payload.value) return null;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Current period
        const { data: orders, error } = await supabase
          .from('orders')
          .select('grandTotal, orderDate')
          .like('orderDate', `${payload.value}%`);
        
        if (error) {
          console.error('Failed to fetch revenue preview:', error);
          return null;
        }
        
        const totalRevenue = orders?.reduce((sum, order) => sum + (order.grandTotal || 0), 0) || 0;
        const orderCount = orders?.length || 0;
        
        // Previous period for trend
        const date = new Date(payload.value + '-01');
        date.setMonth(date.getMonth() - 1);
        const prevPeriod = date.toISOString().slice(0, 7);
        
        const { data: prevOrders } = await supabase
          .from('orders')
          .select('grandTotal')
          .like('orderDate', `${prevPeriod}%`);
        
        const prevRevenue = prevOrders?.reduce((sum, order) => sum + (order.grandTotal || 0), 0) || 0;
        const trend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        
        // Last 7 days for sparkline
        const sparklineData = Array.from({ length: 7 }, (_, i) => {
          const dayOrders = orders?.filter(o => {
            const orderDay = new Date(o.orderDate).getDate();
            return orderDay >= (i * 4) && orderDay < ((i + 1) * 4);
          }) || [];
          return dayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        });
        
        return {
          totalRevenue,
          orderCount,
          averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
          trend,
          sparklineData
        };
      } catch (err) {
        console.error('Error fetching revenue preview:', err);
        return null;
      }
    },
    renderLoadingPreview: () => (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>Analyzing revenue...</span>
      </div>
    ),
    renderAsyncPreview: (payload, data) => (
      <div className="space-y-3">
        <div className="text-center pb-3 border-b border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Revenue</div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-2xl font-bold text-green-500 tracking-tight">{formatCurrency(data.totalRevenue)}</div>
            {data.trend !== undefined && <TrendBadge value={data.trend} />}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">{payload.value}</div>
        </div>
        
        {data.sparklineData && data.sparklineData.length > 0 && (
          <div className="pb-2">
            <Sparkline data={data.sparklineData} />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/40 p-2.5 rounded-md text-center border border-border/50">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Orders</div>
              <div className="font-semibold text-foreground">{data.orderCount}</div>
          </div>
          <div className="bg-muted/40 p-2.5 rounded-md text-center border border-border/50">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Avg Value</div>
              <div className="font-semibold text-foreground">{formatCurrency(data.averageOrderValue)}</div>
          </div>
        </div>
      </div>
    )
  },
  product: {
    getRoute: (payload) => payload.id ? `/drilldown/product/${payload.id}` : null,
    quickActions: (payload) => [
      {
        label: 'Check Stock',
        icon: <Package className="h-3 w-3" />,
        onClick: () => {
          // Navigate to inventory page filtered by this product
          window.open(`/inventory?product=${payload.id}`, '_blank');
        }
      },
      {
        label: 'View Orders',
        icon: <Eye className="h-3 w-3" />,
        onClick: () => {
          // Navigate to orders page filtered by this product
          window.open(`/orders?product=${payload.id}`, '_blank');
        }
      }
    ],
    renderPreview: (payload) => (
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Product</div>
          <div className="font-semibold text-base leading-tight">{payload.name || payload.id}</div>
        </div>
        {payload.stock !== undefined && (
           <div className="flex justify-between items-center pt-2 border-t border-border/50">
             <span className="text-xs text-muted-foreground font-medium">Stock Level</span>
             <Badge variant={payload.stock > 0 ? "outline" : "destructive"} className="font-mono">
               {payload.stock}
             </Badge>
           </div>
        )}
        {payload.price !== undefined && (
           <div className="flex justify-between items-center pt-2 border-t border-border/50">
             <span className="text-xs text-muted-foreground font-medium">Price</span>
             <span className="font-bold">{formatCurrency(payload.price)}</span>
           </div>
        )}
      </div>
    )
  },
  company: {
    getRoute: (payload) => payload.id ? `/drilldown/client/${payload.id}` : null,
    quickActions: (payload) => [
      {
        label: 'New Order',
        icon: <Plus className="h-3 w-3" />,
        onClick: () => {
          // Navigate to new order page with company pre-selected
          window.open(`/orders/new?company=${payload.id}`, '_blank');
        }
      },
      {
        label: 'View History',
        icon: <FileText className="h-3 w-3" />,
        onClick: () => {
          // Navigate to company detail page
          window.open(`/clients/${payload.id}`, '_blank');
        }
      }
    ],
    getRelatedEntities: async (payload) => {
      if (!payload.id) return [];
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: orders } = await supabase.from('orders').select('id').eq('companyId', payload.id).limit(3);
        return (orders || []).map((o, i) => ({ kind: 'order' as DrillKind, payload: { id: o.id }, label: `Order #${o.id}`, relationship: 'placed order' }));
      } catch { return []; }
    },
    renderPreview: (payload) => (
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Client</div>
              <div className="font-semibold text-base leading-tight">{payload.name || 'Client Details'}</div>
          </div>
          {payload.status && (
            <Badge variant="secondary" className="text-[10px]">{payload.status}</Badge>
          )}
        </div>
      </div>
    ),
    // Async preview: fetch company metrics
    fetchPreviewData: async (payload) => {
      if (!payload.id) return null;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch company data and order count
        const [companyResult, ordersResult] = await Promise.all([
          supabase
            .from('companies')
            .select('name')
            .eq('id', payload.id)
            .single(),
          supabase
            .from('orders')
            .select('total', { count: 'exact' })
            .eq('companyId', payload.id)
        ]);
        
        if (companyResult.error) {
          console.error('Failed to fetch company preview:', companyResult.error);
          return null;
        }
        
        const totalSpent = ordersResult.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
        
        return {
          name: companyResult.data.name,
          orderCount: ordersResult.count || 0,
          totalSpent
        };
      } catch (err) {
        console.error('Error fetching company preview:', err);
        return null;
      }
    },
    renderLoadingPreview: () => (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>Loading client profile...</span>
      </div>
    ),
    renderAsyncPreview: (payload, data) => (
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Client</div>
              <div className="font-semibold text-base leading-tight">{data.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Lifetime Value</div>
            <div className="font-bold text-green-500 text-base">{formatCurrency(data.totalSpent)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Total Orders</div>
            <div className="font-medium text-base">{data.orderCount}</div>
          </div>
        </div>
      </div>
    )
  },
  order: {
    getRoute: (payload) => payload.id ? `/drilldown/order/${payload.id}` : null,
    quickActions: (payload) => [
      {
        label: 'Track',
        icon: <Package className="h-3 w-3" />,
        onClick: async () => {
          // Open tracking in a new tab or show tracking dialog
          window.open(`/orders?search=${payload.id}`, '_blank');
        }
      },
      {
        label: 'Invoice',
        icon: <FileText className="h-3 w-3" />,
        onClick: async () => {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            
            // Fetch full order details
            const { data: order, error } = await supabase
              .from('orders')
              .select('*')
              .eq('id', payload.id)
              .single();
            
            if (error || !order) {
              throw new Error('Failed to fetch order');
            }
            
            // Fetch company details if available
            let company = undefined;
            if (order.companyId) {
              const { data: companyData } = await supabase
                .from('companies')
                .select('*')
                .eq('id', order.companyId)
                .single();
              company = companyData || undefined;
            }
            
            // Generate and download invoice
            const { downloadInvoice } = await import('@/lib/pdf-invoice');
            downloadInvoice(order, company);
          } catch (error) {
            console.error('Failed to generate invoice:', error);
            throw error;
          }
        }
      }
    ],
    getRelatedEntities: async (payload) => {
      if (!payload.id) return [];
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await supabase.from('orders').select('companyId, items').eq('id', payload.id).single();
        if (!data) return [];
        const related: RelatedEntity[] = [];
        if (data.companyId) {
          const { data: company } = await supabase.from('companies').select('name').eq('id', data.companyId).single();
          if (company) related.push({ kind: 'company', payload: { id: data.companyId }, label: company.name, relationship: 'customer' });
        }
        return related;
      } catch { return []; }
    },
    renderPreview: (payload) => (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
           <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Order</div>
              <div className="font-bold text-lg">#{payload.id}</div>
           </div>
        </div>
        {payload.total !== undefined && (
          <div className="pt-2 border-t border-border/50">
             <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Total Amount</div>
             <div className="font-bold text-lg">{formatCurrency(payload.total)}</div>
          </div>
        )}
      </div>
    ),
    // Async preview: fetch live order status from Supabase
    fetchPreviewData: async (payload) => {
      if (!payload.id) return null;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data, error } = await supabase
          .from('orders')
          .select('status, paymentStatus, deliveryDate')
          .eq('id', payload.id)
          .single();
        
        if (error) {
          console.error('Failed to fetch order preview:', error);
          return null;
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching order preview:', err);
        return null;
      }
    },
    renderLoadingPreview: () => (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>Tracking order...</span>
      </div>
    ),
    renderAsyncPreview: (payload, data) => (
      <div className="space-y-2.5">
        <div className="flex justify-between items-start gap-2">
           <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Order</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-bold text-base leading-tight truncate cursor-help">#{payload.id}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">#{payload.id}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
           <Badge className={data.status === 'Delivered' ? 'bg-green-500 hover:bg-green-600' : 'shrink-0'}>{data.status}</Badge>
        </div>

        <div className="space-y-2.5 pt-2.5 border-t border-border/50">
           {payload.total !== undefined && (
             <div className="flex justify-between items-center gap-2">
               <span className="text-xs text-muted-foreground font-medium">Amount</span>
               <span className="font-bold text-base">{formatCurrency(payload.total)}</span>
             </div>
           )}
           
           <div className="flex justify-between items-center gap-2">
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Payment</span>
             <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 whitespace-nowrap">{data.paymentStatus}</Badge>
           </div>
           
           {data.deliveryDate && (
             <div className="flex justify-between items-center gap-2">
               <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Delivery</span>
               <span className="text-xs font-medium">{formatDate(data.deliveryDate)}</span>
             </div>
           )}
        </div>
      </div>
    )
  },
  maintenance: {
    getRoute: () => null,
    renderPreview: () => <div className="text-sm text-muted-foreground italic text-center py-2">Click to view maintenance details</div>
  },
  inventory: {
    getRoute: () => null,
    renderPreview: () => <div className="text-sm text-muted-foreground italic text-center py-2">Click to view inventory details</div>
  },
  customer: {
    getRoute: () => null,
    renderPreview: () => <div className="text-sm text-muted-foreground italic text-center py-2">Click to view customer details</div>
  }
};
