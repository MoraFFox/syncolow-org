'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Product, Manufacturer, Order, Return } from '@/lib/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface ManufacturerAnalyticsProps {
  manufacturer: Manufacturer;
  products: Product[];
  orders?: Order[];
  returns?: Return[];
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const ManufacturerAnalytics: React.FC<ManufacturerAnalyticsProps> = ({ manufacturer, products, orders = [], returns = [] }) => {
  // Calculate analytics data
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  
  // Fix: Calculate average price correctly - sum of all prices divided by product count
  const avgPrice = totalProducts > 0 
    ? products.reduce((sum, product) => sum + (product.price || 0), 0) / totalProducts 
    : 0;

  // Filter orders that contain products from this manufacturer
  const manufacturerOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const productIds = new Set(products.map(p => p.id));
    return orders.filter(order => 
      order.items.some(item => productIds.has(item.productId))
    );
  }, [orders, products]);

  // Calculate Sales & Revenue from Orders
  const { totalRevenue, totalUnitsSold, productSales } = useMemo(() => {
    let revenue = 0;
    let unitsSold = 0;
    const salesMap = new Map<string, { sold: number, revenue: number }>();

    // Initialize map for all products to ensure they appear even with 0 sales
    products.forEach(p => {
      salesMap.set(p.id, { sold: 0, revenue: 0 });
    });

    const productIds = new Set(products.map(p => p.id));

    manufacturerOrders.forEach(order => {
      order.items.forEach(item => {
        if (productIds.has(item.productId)) {
          const itemRevenue = item.price * item.quantity;
          revenue += itemRevenue;
          unitsSold += item.quantity;

          const current = salesMap.get(item.productId) || { sold: 0, revenue: 0 };
          salesMap.set(item.productId, {
            sold: current.sold + item.quantity,
            revenue: current.revenue + itemRevenue
          });
        }
      });
    });

    return { totalRevenue: revenue, totalUnitsSold: unitsSold, productSales: salesMap };
  }, [manufacturerOrders, products]);

  // Inventory Turnover Rate (Simplified: Units Sold / Average Inventory)
  const inventoryTurnover = useMemo(() => {
    if (totalStock === 0) return 0;
    return totalUnitsSold / totalStock;
  }, [totalUnitsSold, totalStock]);

  // Return Rate
  const returnRate = useMemo(() => {
    if (manufacturerOrders.length === 0) return 0;
    const manufacturerOrderIds = new Set(manufacturerOrders.map(o => o.id));
    const returnedOrdersCount = returns.filter(r => manufacturerOrderIds.has(r.orderId)).length;
    return (returnedOrdersCount / manufacturerOrders.length) * 100;
  }, [manufacturerOrders, returns]);

  // Sales Growth (MoM) - Last 6 Months
  const salesGrowthData = useMemo(() => {
    // If we have no orders, return empty data with correct months
    const today = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(today, 5 - i);
      return {
        name: format(date, 'MMM yyyy'),
        month: format(date, 'MMM yyyy'),
        dateObj: date,
        revenue: 0,
        orderCount: 0
      };
    });

    if (manufacturerOrders.length === 0) {
        return last6Months.map(m => ({ name: m.name, revenue: 0, orders: 0 }));
    }
    
    const productIds = new Set(products.map(p => p.id));

    manufacturerOrders.forEach(order => {
      const orderDate = parseISO(order.orderDate);
      const monthData = last6Months.find(m => 
        isWithinInterval(orderDate, { start: startOfMonth(m.dateObj), end: endOfMonth(m.dateObj) })
      );

      if (monthData) {
        const orderRevenue = order.items
          .filter(item => productIds.has(item.productId))
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        monthData.revenue += orderRevenue;
        monthData.orderCount += 1;
      }
    });

    return last6Months.map(m => ({ name: m.name, revenue: m.revenue, orders: m.orderCount }));
  }, [manufacturerOrders, products]);

  // Prepare data for top-selling products chart
  const topSellingProducts = useMemo(() => {
    return [...products]
      .map(product => {
        const stats = productSales.get(product.id) || { sold: 0, revenue: 0 };
        return {
          name: product.name,
          sold: stats.sold,
          revenue: stats.revenue,
        };
      })
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [products, productSales]);

  // Prepare data for stock level chart
  const stockLevelData = products.map(product => ({
    name: product.name,
    stock: product.stock || 0,
    price: product.price || 0,
  }));

  // Prepare data for category distribution pie chart
  const categoryDistribution = products.reduce((acc: Record<string, number>, product) => {
    const category = product.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  
  const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Top Customers
  const topCustomers = useMemo(() => {
    if (manufacturerOrders.length === 0) return [];
    
    const customerRevenue: Record<string, number> = {};
    const productIds = new Set(products.map(p => p.id));

    manufacturerOrders.forEach(order => {
      const customerName = order.companyName || 'Unknown Client';
      const orderRevenue = order.items
        .filter(item => productIds.has(item.productId))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      customerRevenue[customerName] = (customerRevenue[customerName] || 0) + orderRevenue;
    });

    return Object.entries(customerRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [manufacturerOrders, products]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-2xl">{totalProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Products under this manufacturer
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">${totalRevenue.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Generated by this manufacturer
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock</CardDescription>
            <CardTitle className="text-2xl">{totalStock}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Units currently in stock
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Price</CardDescription>
            <CardTitle className="text-2xl">${avgPrice.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Average price per product
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory Turnover</CardDescription>
            <CardTitle className="text-2xl">{inventoryTurnover.toFixed(1)}x</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Return Rate</CardDescription>
            <CardTitle className="text-2xl">{returnRate.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock Value</CardDescription>
            <CardTitle className="text-2xl">${totalStockValue.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Value of current stock
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sales Growth Chart */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Sales Growth (Last 6 Months)</h3>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesGrowthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" activeDot={{ r: 8 }} name="Revenue" />
                <Line type="monotone" dataKey="orders" stroke="#10b981" activeDot={{ r: 8 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Top Selling Products */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Top Selling Products</h3>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSellingProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => 
                    name === 'sold' ? [value, 'Units Sold'] : [`$${value}`, 'Revenue']
                  }
                />
                <Legend />
                <Bar dataKey="sold" name="Units Sold" fill="#3b82f6" />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Stock Levels */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Product Stock Levels</h3>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stockLevelData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock" name="Stock Level" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Category Distribution */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Category Distribution</h3>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Top Customers */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Top Customers</h3>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManufacturerAnalytics;