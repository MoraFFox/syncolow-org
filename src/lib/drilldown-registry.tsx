import React from 'react';
import { DrillKind, DrillPayload } from './drilldown-types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export interface DrillConfig<K extends DrillKind> {
  getRoute: (payload: DrillPayload<K>) => string | null;
  renderPreview: (payload: DrillPayload<K>) => React.ReactNode;
  
  // Optional async preview data fetching
  fetchPreviewData?: (payload: DrillPayload<K>) => Promise<any>;
  renderLoadingPreview?: () => React.ReactNode;
  renderAsyncPreview?: (payload: DrillPayload<K>, data: any) => React.ReactNode;
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
        
        // Filter orders for the specified period
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
        
        return {
          totalRevenue,
          orderCount,
          averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0
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
          <div className="text-2xl font-bold text-green-500 tracking-tight">{formatCurrency(data.totalRevenue)}</div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">{payload.value}</div>
        </div>
        
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
      </div>
    ),
    // Async preview: fetch live product data
    fetchPreviewData: async (payload) => {
      if (!payload.id) return null;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data, error } = await supabase
          .from('products')
          .select('stock, price, name')
          .eq('id', payload.id)
          .single();
        
        if (error) {
          console.error('Failed to fetch product preview:', error);
          return null;
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching product preview:', err);
        return null;
      }
    },
    renderLoadingPreview: () => (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>Checking stock...</span>
      </div>
    ),
    renderAsyncPreview: (payload, data) => (
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Product</div>
          <div className="font-semibold text-base leading-tight text-foreground">{data.name || payload.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Stock</span>
            <div>
               <Badge variant={data.stock > 0 ? "outline" : "destructive"} className={data.stock > 0 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""}>
                 {data.stock} units
               </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Price</span>
            <span className="font-bold text-lg tracking-tight">{formatCurrency(data.price)}</span>
          </div>
        </div>
      </div>
    )
  },
  company: {
    getRoute: (payload) => payload.id ? `/drilldown/client/${payload.id}` : null,
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
            .select('name, status')
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
          status: companyResult.data.status,
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
          {data.status && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{data.status}</Badge>}
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
      <div className="space-y-3">
        <div className="flex justify-between items-start">
           <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Order</div>
              <div className="font-bold text-lg leading-none">#{payload.id}</div>
           </div>
           <Badge className={data.status === 'Delivered' ? 'bg-green-500 hover:bg-green-600' : ''}>{data.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-border/50">
           {payload.total !== undefined && (
             <div className="col-span-2 flex justify-between items-center">
               <span className="text-xs text-muted-foreground font-medium">Amount</span>
               <span className="font-bold text-base">{formatCurrency(payload.total)}</span>
             </div>
           )}
           
           <div className="flex flex-col gap-1">
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Payment</span>
             <div><Badge variant="outline" className="text-[10px] h-5 px-1.5">{data.paymentStatus}</Badge></div>
           </div>
           
           {data.deliveryDate && (
             <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Delivery</span>
               <span className="text-sm font-medium">{data.deliveryDate}</span>
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
