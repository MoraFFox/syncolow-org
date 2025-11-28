'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Product, Category, Manufacturer } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Package, DollarSign, Tags } from 'lucide-react';

interface ProductsOverviewProps {
  products: Product[];
  categories: Category[];
  manufacturers: Manufacturer[];
}

export const ProductsOverview: React.FC<ProductsOverviewProps> = ({ products, categories, manufacturers }) => {
  // 1. Key Metrics
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const lowStockThreshold = 10; // Example threshold
  const lowStockCount = products.filter(p => (p.stock || 0) <= lowStockThreshold).length;
  const totalCategories = categories.length;

  // 2. Top Performing Categories (by Revenue)
  const topCategories = useMemo(() => {
    const categoryRevenue: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      const revenue = (p.price || 0) * (p.totalSold || 0);
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + revenue;
    });

    return Object.entries(categoryRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [products]);

  // 3. Top Performing Manufacturers (by Revenue)
  const topManufacturers = useMemo(() => {
    const manufacturerRevenue: Record<string, number> = {};
    const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));

    products.forEach(p => {
      const manufName = p.manufacturerId ? manufacturerMap.get(p.manufacturerId) || 'Unassigned' : 'Unassigned';
      const revenue = (p.price || 0) * (p.totalSold || 0);
      manufacturerRevenue[manufName] = (manufacturerRevenue[manufName] || 0) + revenue;
    });

    return Object.entries(manufacturerRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [products, manufacturers]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on current stock and price
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active SKUs in catalog
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Products with stock &le; {lowStockThreshold}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Product categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Chart */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Top Categories by Revenue</h3>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCategories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Manufacturers Chart */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Top Manufacturers by Revenue</h3>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topManufacturers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};