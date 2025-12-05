'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, Building2 } from 'lucide-react';
import { useOrderStore } from '@/store/use-order-store';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { formatCurrency } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { supabase } from '@/lib/supabase';
import { Product, Order } from '@/lib/types';
import { DrillBreadcrumb } from '@/components/drilldown/drill-breadcrumb';

interface ProductWithStats extends Product {
  salesLast30Days?: number;
  revenueTotal?: number;
  topBuyingCompanies?: { id: string; name: string; totalOrdered: number }[];
}

export default function ProductDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const { orders } = useOrderStore();
  const { manufacturers, fetchManufacturersAndProducts } = useManufacturerStore();
  
  const productId = params.id as string;
  const [product, setProduct] = React.useState<ProductWithStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [productOrders, setProductOrders] = React.useState<Order[]>([]);

  // Fetch product data from Supabase
  React.useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          setError('Product not found');
          return;
        }

        // Calculate stats from orders
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const recentOrders = orders?.filter(order => {
          const orderDate = new Date(order.orderDate);
          return orderDate >= thirtyDaysAgo && 
                 order.items?.some(item => item.productId === productId);
        }) || [];

        // Calculate sales in last 30 days
        let salesLast30Days = 0;
        let revenueTotal = 0;
        const companySales: Record<string, { name: string; totalOrdered: number }> = {};

        recentOrders.forEach(order => {
          const productItems = order.items?.filter(item => item.productId === productId) || [];
          productItems.forEach(item => {
            salesLast30Days += item.quantity;
            revenueTotal += item.quantity * item.price;
          });
          
          // Track company purchases
          if (order.companyId && order.companyName) {
            if (!companySales[order.companyId]) {
              companySales[order.companyId] = { name: order.companyName, totalOrdered: 0 };
            }
            const quantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
            companySales[order.companyId].totalOrdered += quantity;
          }
        });

        const topBuyingCompanies = Object.entries(companySales)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.totalOrdered - a.totalOrdered)
          .slice(0, 5);

        setProduct({
          ...data,
          salesLast30Days,
          revenueTotal,
          topBuyingCompanies
        });

        // Store recent orders for this product
        setProductOrders(recentOrders.slice(0, 10));

      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId, orders]);

  // Fetch manufacturers if not loaded
  React.useEffect(() => {
    if (manufacturers.length === 0) {
      fetchManufacturersAndProducts();
    }
  }, [manufacturers, fetchManufacturersAndProducts]);

  // Get manufacturer for this product
  const manufacturer = React.useMemo(() => {
    if (!product?.manufacturerId) return null;
    return manufacturers.find(m => m.id === product.manufacturerId);
  }, [product?.manufacturerId, manufacturers]);

  // Calculate stock status
  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: 'Out of Stock', variant: 'destructive' as const, icon: AlertTriangle };
    if (stock < 10) return { label: 'Low Stock', variant: 'destructive' as const, icon: AlertTriangle };
    if (stock < 50) return { label: 'Moderate', variant: 'secondary' as const, icon: Package };
    return { label: 'Healthy', variant: 'default' as const, icon: Package };
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Product Not Found</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">{error || 'Product could not be loaded'}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock);
  const salesTrend = (product.salesLast30Days || 0) > (product.totalSold || 0) / 12 ? 'up' : 'down';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              {product.isVariant && product.variantName && (
                <Badge variant="outline">{product.variantName}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Product Analysis & Performance</span>
              {product.sku && <span className="text-xs">• SKU: {product.sku}</span>}
            </div>
          </div>
        </div>
        <DrillBreadcrumb />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <stockStatus.icon className={`h-4 w-4 ${stockStatus.label === 'Out of Stock' || stockStatus.label === 'Low Stock' ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.stock} units</div>
            <Badge variant={stockStatus.variant} className="mt-1">
              {stockStatus.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Selling price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales (30 days)</CardTitle>
            {salesTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${salesTrend === 'up' ? 'text-green-600' : ''}`}>
              {product.salesLast30Days || 0} units
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(product.revenueTotal || 0)} revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.totalSold || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturer & Category */}
      {(manufacturer || product.category) && (
        <div className="grid gap-4 md:grid-cols-2">
          {manufacturer && (
            <DrillTarget
              kind="manufacturer"
              payload={{ id: manufacturer.id, name: manufacturer.name }}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Manufacturer
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  {manufacturer.icon && (
                    <img src={manufacturer.icon} alt={manufacturer.name} className="h-10 w-10 rounded object-cover" />
                  )}
                  <div>
                    <div className="font-medium">{manufacturer.name}</div>
                    <p className="text-xs text-muted-foreground">Click to view manufacturer details</p>
                  </div>
                </CardContent>
              </Card>
            </DrillTarget>
          )}
          
          {product.category && (
            <DrillTarget
              kind="category"
              payload={{ id: product.category, name: product.category }}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-medium">{product.category}</div>
                  <p className="text-xs text-muted-foreground">Click to view category details</p>
                </CardContent>
              </Card>
            </DrillTarget>
          )}
        </div>
      )}

      {/* Top Buying Companies */}
      {product.topBuyingCompanies && product.topBuyingCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Buying Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {product.topBuyingCompanies.map((company) => (
                <DrillTarget
                  key={company.id}
                  kind="company"
                  payload={{ id: company.id, name: company.name }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium truncate">{company.name}</span>
                  <Badge variant="secondary">{company.totalOrdered} units</Badge>
                </DrillTarget>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders Containing This Product</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
            View All Orders
          </Button>
        </CardHeader>
        <CardContent>
          {productOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent orders for this product</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productOrders.map((order) => {
                const productItem = order.items?.find(item => item.productId === productId);
                return (
                  <DrillTarget
                    key={order.id}
                    kind="order"
                    payload={{ id: order.id, total: order.grandTotal }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">Order #{order.id.slice(0, 8)}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{order.companyName || 'Unknown Company'}</span>
                        <span>•</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {productItem && (
                        <Badge variant="outline">
                          {productItem.quantity} × {formatCurrency(productItem.price)}
                        </Badge>
                      )}
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </DrillTarget>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Image */}
      {product.imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="max-w-sm rounded-lg border"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
