'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { CategoryAnalytics } from './_components/category-analytics';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { subMonths } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

export default function CategoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { 
    categories, 
    products, 
    analyticsOrders, 
    returns,
    fetchOrdersByDateRange, 
    analyticsLoading,
    fetchInitialData
  } = useOrderStore();

  const [isAnalyticsLoaded, setIsAnalyticsLoaded] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const category = useMemo(() => 
    categories.find(c => c.id === id), 
  [categories, id]);

  const categoryProducts = useMemo(() => 
    products.filter(p => p.category === category?.name),
  [products, category]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (id && !isAnalyticsLoaded && !analyticsLoading) {
        const end = new Date();
        const start = subMonths(end, 6);
        await fetchOrdersByDateRange(start.toISOString(), end.toISOString());
        setIsAnalyticsLoaded(true);
      }
    };
    loadAnalytics();
  }, [id, isAnalyticsLoaded, analyticsLoading, fetchOrdersByDateRange]);

  if (!category) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Category Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <DrillTarget kind="category" payload={{ id: category.id, name: category.name }} asChild>
              <h1 className="text-3xl font-bold cursor-pointer hover:underline">{category.name}</h1>
            </DrillTarget>
            <p className="text-muted-foreground">Category Analytics & Products</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setIsAnalyticsLoaded(false);
          }}
          disabled={analyticsLoading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", analyticsLoading && "animate-spin")} />
          Refresh Analytics
        </Button>
      </div>

      <CategoryAnalytics 
        category={category} 
        products={categoryProducts} 
        orders={analyticsOrders}
        returns={returns}
      />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Products in {category.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {categoryProducts.map((product) => (
            <Card key={product.id} className={cn(product.isVariant && "bg-muted/50")}>
              <CardContent className='p-4 flex gap-4'>
                <Image
                  src={product.imageUrl || "https://placehold.co/100x100.png"}
                  alt={product.name}
                  width={80}
                  height={80}
                  className='rounded-md object-cover'
                />
                <div className='flex-1 flex flex-col justify-between'>
                  <div>
                    <DrillTarget kind="product" payload={{ id: product.id, name: product.name, price: product.price, stock: product.stock }} asChild>
                      <p className='font-semibold cursor-pointer hover:underline'>
                        {product.name}{" "}
                        {product.variantName && `- ${product.variantName}`}
                      </p>
                    </DrillTarget>
                    <p className='text-sm text-muted-foreground'>
                      ${typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {product.stock} in stock
                    </p>
                  </div>
                  <div className='mt-2 flex justify-end'>
                    <Button variant='outline' size='sm' asChild>
                      <Link href={`/products/${product.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {categoryProducts.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No products found in this category.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}