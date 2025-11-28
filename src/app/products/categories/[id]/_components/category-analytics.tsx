'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

import { Separator } from '@/components/ui/separator';
import { Product, Category, Order, Return } from '@/lib/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface CategoryAnalyticsProps {
  category: Category;
  products: Product[];
  orders: Order[];
  returns: Return[];
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export const CategoryAnalytics: React.FC<CategoryAnalyticsProps> = ({ category, products, orders, returns }) => {
  // 1. Basic Metrics from Products
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  
  // Calculate Revenue from Product.totalSold (Lifetime revenue estimate)
  const lifetimeRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.totalSold || 0)), 0);
  const avgPrice = totalProducts > 0 ? products.reduce((sum, p) => sum + (p.price || 0), 0) / totalProducts : 0;
  const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  // 2. Advanced Metrics from Orders (if available)
  // Filter orders that contain products from this category
  const categoryOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const productIds = new Set(products.map(p => p.id));
    return orders.filter(order =>
      order.items.some(item => productIds.has(item.productId))
    );
  }, [orders, products]);

  // Average Order Value (AOV) for this category
  // We calculate the portion of the order value that belongs to this category
  const aov = useMemo(() => {
    if (categoryOrders.length === 0) return 0;
    const productIds = new Set(products.map(p => p.id));
    
    const totalCategoryRevenueInOrders = categoryOrders.reduce((sum, order) => {
      const categoryItemsValue = order.items
        .filter(item => productIds.has(item.productId))
        .reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      return sum + categoryItemsValue;
    }, 0);

    return totalCategoryRevenueInOrders / categoryOrders.length;
  }, [categoryOrders, products]);

  // Inventory Turnover Rate (Simplified: Units Sold / Average Inventory)
  // Using current stock as proxy for average inventory if history not available
  const inventoryTurnover = useMemo(() => {
    const totalUnitsSold = products.reduce((sum, p) => sum + (p.totalSold || 0), 0);
    if (totalStock === 0) return 0;
    return totalUnitsSold / totalStock; // This is a lifetime turnover, might need time-bound if orders available
  }, [products, totalStock]);

  // Return Rate
  const returnRate = useMemo(() => {
    if (categoryOrders.length === 0) return 0;
    const categoryOrderIds = new Set(categoryOrders.map(o => o.id));
    const returnedOrdersCount = returns.filter(r => categoryOrderIds.has(r.orderId)).length;
    return (returnedOrdersCount / categoryOrders.length) * 100;
  }, [categoryOrders, returns]);

  // Sales Growth (MoM) - Last 6 Months
  const salesGrowthData = useMemo(() => {
    if (categoryOrders.length === 0) return [];
    
    const productIds = new Set(products.map(p => p.id));
    const today = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(today, 5 - i);
      return {
        month: format(date, 'MMM yyyy'),
        dateObj: date,
        revenue: 0,
        orderCount: 0
      };
    });

    categoryOrders.forEach(order => {
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

    return last6Months.map(m => ({ name: m.month, revenue: m.revenue, orders: m.orderCount }));
  }, [categoryOrders, products]);

  // 3. Top Selling Products
  const topSellingProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0))
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        sold: p.totalSold || 0,
        revenue: (p.price || 0) * (p.totalSold || 0)
      }));
  }, [products]);

  // 4. Manufacturer Distribution
  const manufacturerData = useMemo(() => {
    const dist = products.reduce((acc, p) => {
      const manufId = p.manufacturerId || 'Unassigned';
      acc[manufId] = (acc[manufId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [products]);

  // 5. Top Customers
  const topCustomers = useMemo(() => {
    if (categoryOrders.length === 0) return [];
    
    const customerRevenue: Record<string, number> = {};
    const productIds = new Set(products.map(p => p.id));

    categoryOrders.forEach(order => {
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
  }, [categoryOrders, products]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-2xl">{totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lifetime Revenue</CardDescription>
            <CardTitle className="text-2xl">${lifetimeRevenue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Order Value</CardDescription>
            <CardTitle className="text-2xl">${aov.toFixed(2)}</CardTitle>
          </CardHeader>
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
            <CardDescription>Avg Product Price</CardDescription>
            <CardTitle className="text-2xl">${avgPrice.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock Value</CardDescription>
            <CardTitle className="text-2xl">${totalStockValue.toFixed(2)}</CardTitle>
          </CardHeader>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Top Selling Products</h3>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sold" name="Units Sold" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Manufacturer Distribution */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Manufacturer Distribution</h3>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={manufacturerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {manufacturerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
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