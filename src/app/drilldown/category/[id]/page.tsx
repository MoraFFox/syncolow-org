/** @format */

"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Tag,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useOrderStore } from "@/store/use-order-store";
import { formatCurrency } from "@/lib/utils";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { CategoryAnalytics } from "@/app/products/categories/[id]/_components/category-analytics";

export default function CategoryDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    categories,
    products: allProducts,
    orders: analyticsOrders,
    returns,
    fetchInitialData,
    loading: storeLoading,
  } = useOrderStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (categories.length === 0 || allProducts.length === 0) {
        await fetchInitialData();
      }
      setLoading(false);
    };
    loadData();
  }, [categories.length, allProducts.length, fetchInitialData]);

  const {
    category,
    products,
    metrics,
    recentOrders,
    relevantReturns,
    topProducts,
  } = useMemo(() => {
    const category = categories.find((c) => c.id === id);

    if (!category)
      return {
        category: null,
        products: [],
        metrics: null,
        recentOrders: [],
        relevantReturns: [],
        topProducts: [],
      };

    const products = allProducts.filter((p) => p.category === category.name);
    const productIds = new Set(products.map((p) => p.id));

    const relevantOrders = analyticsOrders
      .filter(
        (order) =>
          order.items &&
          order.items.some((item) => productIds.has(item.productId))
      )
      .sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      );

    const relevantReturns = returns
      ? returns.filter((r) => relevantOrders.some((o) => o.id === r.orderId))
      : [];

    const totalRevenue = relevantOrders.reduce((sum, order) => {
      const orderRevenue =
        order.items
          ?.filter((item) => productIds.has(item.productId))
          .reduce((itemSum, item) => itemSum + item.price * item.quantity, 0) ||
        0;
      return sum + orderRevenue;
    }, 0);

    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const avgPrice =
      products.length > 0
        ? products.reduce((sum, p) => sum + p.price, 0) / products.length
        : 0;

    const productSales: Record<string, number> = {};
    relevantOrders.forEach((order) => {
      order.items?.forEach((item) => {
        if (productIds.has(item.productId)) {
          productSales[item.productId] =
            (productSales[item.productId] || 0) + item.quantity;
        }
      });
    });

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        return product ? { ...product, sold: qty } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && "id" in p);

    return {
      category,
      products,
      metrics: {
        totalProducts: products.length,
        totalRevenue,
        avgPrice,
        totalStock,
      },
      topProducts,
      recentOrders: relevantOrders,
      relevantReturns,
    };
  }, [id, categories, allProducts, analyticsOrders, returns]);

  if (loading || storeLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' />
      </div>
    );
  }

  if (!category) {
    return (
      <div className='flex flex-col items-center justify-center h-screen gap-4'>
        <h2 className='text-xl font-semibold'>Category not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Tag className='h-6 w-6' />
            {category.name}
          </h1>
          <p className='text-muted-foreground'>
            Category Performance & Products
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Products
            </CardTitle>
            <Package className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics?.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Category Revenue
            </CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Average Price</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(metrics?.avgPrice || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Stock</CardTitle>
            <BarChart3 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics?.totalStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Component */}
      <Separator />
      <div className='space-y-4'>
        <CategoryAnalytics
          category={category}
          products={products}
          orders={recentOrders}
          returns={relevantReturns}
        />
      </div>

      {/* Top Products Section */}
      {topProducts && topProducts.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Top Selling Products</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {topProducts.map((product) => (
              <DrillTarget
                key={product.id}
                kind='product'
                payload={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                }}
              >
                <Card className='cursor-pointer hover:bg-accent/50 transition-colors'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base font-semibold line-clamp-1'>
                      {product.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='flex justify-between items-center'>
                      <div className='text-sm text-muted-foreground'>
                        {product.sold} units sold
                      </div>
                      <div className='font-bold text-green-600'>
                        {formatCurrency(product.price * product.sold)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DrillTarget>
            ))}
          </div>
        </div>
      )}

      {/* All Products Section */}
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>All Products</h2>
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              (window.location.href = `/products?category=${category.name}`)
            }
          >
            View All in Catalog
          </Button>
        </div>

        {products.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground bg-muted/20 rounded-lg'>
            No products found in this category.
            <div className='mt-4'>
              <Button
                onClick={() =>
                  (window.location.href = `/products/new?category=${category.name}`)
                }
              >
                Add Product
              </Button>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {products.slice(0, 8).map((product) => (
              <DrillTarget
                key={product.id}
                kind='product'
                payload={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                }}
              >
                <Card className='cursor-pointer hover:bg-accent/50 transition-colors h-full'>
                  <CardHeader className='pb-2'>
                    <div className='flex justify-between items-start gap-2'>
                      <CardTitle className='text-sm font-semibold line-clamp-2'>
                        {product.name}
                      </CardTitle>
                      <Badge
                        variant={
                          product.stock > 50
                            ? "default"
                            : product.stock > 10
                            ? "secondary"
                            : "destructive"
                        }
                        className='shrink-0 text-[10px]'
                      >
                        {product.stock}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='font-bold'>
                      {formatCurrency(product.price)}
                    </div>
                  </CardContent>
                </Card>
              </DrillTarget>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
