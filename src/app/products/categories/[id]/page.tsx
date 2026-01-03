'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { useCategoriesStore } from '@/store/use-categories-store';
import { CategoryAnalyticsDashboard } from '@/components/analytics/category-analytics-dashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Box, TrendingUp, Info, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/lib/types';

// --- Tactical Product Card Sub-component ---
function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      {/* Glow Effect Layer */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500" />

      <Card className="relative h-full overflow-hidden bg-zinc-950/40 border-zinc-900/50 backdrop-blur-xl border-t-zinc-800/50">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Visual Header */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <Image
                src={product.imageUrl || "https://placehold.co/400x250.png"}
                alt={product.name}
                fill
                className="object-cover transition-all duration-700 brightness-[0.85] group-hover:brightness-100"
              />
            </motion.div>

            {/* Status Overlays */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <div className="px-2 py-1 rounded bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 text-[10px] font-mono text-zinc-400 tracking-tighter uppercase">
                {product.sku || 'NO-SKU'}
              </div>
              {product.stock > 0 ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  In Stock
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase">
                  <Zap className="w-3 h-3" />
                  Out of Stock
                </div>
              )}
            </div>

            {/* Price Badge */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)] text-sm font-bold text-white font-mono">
              ${typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <DrillTarget kind="product" payload={{ id: product.id, name: product.name, price: product.price, stock: product.stock }} asChild>
                <h3 className="text-base font-bold text-zinc-100 leading-tight cursor-pointer hover:text-indigo-400 transition-colors group-hover:tracking-tight">
                  {product.name}
                  {product.variantName && (
                    <span className="block text-xs font-medium text-zinc-500 mt-1 uppercase tracking-widest">{product.variantName}</span>
                  )}
                </h3>
              </DrillTarget>
            </div>

            {/* Metrics Panel */}
            <div className="grid grid-cols-2 gap-2 border-t border-zinc-900 pt-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Box className="w-3 h-3" /> Stock
                </span>
                <span className="text-sm font-mono font-bold text-zinc-200">
                  {product.stock.toLocaleString()} <span className="text-[10px] text-zinc-600 ml-0.5">UNITS</span>
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> ID
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400 truncate w-full text-right">
                  {product.id.substring(0, 8)}...
                </span>
              </div>
            </div>

            {/* Action Group */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-1 bg-zinc-900/50 hover:bg-indigo-600 hover:text-white border border-zinc-800/50 transition-all duration-300 group/btn"
              >
                <Link href={`/products/${product.id}`} className="flex items-center justify-center gap-2">
                  <span>DEPLOY SPECS</span>
                  <Info className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CategoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    analyticsLoading,
    fetchInitialData
  } = useOrderStore();
  const { products, loadAllProducts } = useProductsStore();
  const { categories, fetchCategories, loading: categoriesLoading } = useCategoriesStore();

  useEffect(() => {
    fetchInitialData();
    loadAllProducts();
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [fetchInitialData, loadAllProducts, fetchCategories, categories.length]);

  const category = useMemo(() =>
    categories.find(c => c.id === id),
    [categories, id]);

  const categoryProducts = useMemo(() =>
    products.filter(p => p.category === id || (category?.name && p.category === category.name)),
    [products, id, category]);

  if (categoriesLoading || (categories.length === 0 && analyticsLoading)) {
    return (
      <div className="container mx-auto py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Establishing Comms Link...</p>
      </div>
    );
  }

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
    <div className="container mx-auto py-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="w-fit -ml-2 text-zinc-500 hover:text-zinc-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK TO FLEET
          </Button>
          <div>
            <DrillTarget kind="category" payload={{ id: category.id, name: category.name }} asChild>
              <h1 className="text-5xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors cursor-pointer uppercase italic">
                {category.name}
              </h1>
            </DrillTarget>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-px w-12 bg-indigo-500" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.2em]">Strategic Sector Intelligence</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400"
            onClick={() => {
              fetchInitialData();
              loadAllProducts();
            }}
            disabled={analyticsLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", analyticsLoading && "animate-spin")} />
            REFRESH COMMS
          </Button>
        </div>
      </header>

      <CategoryAnalyticsDashboard categoryId={category.id} />

      <section className="space-y-8 pt-12 border-t border-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-600" />
            ACTIVE INVENTORY
            <span className="text-zinc-600 font-mono text-lg ml-2">[{categoryProducts.length}]</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </AnimatePresence>

          {categoryProducts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-zinc-500 col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl"
            >
              <Box className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-xs uppercase tracking-widest">No assets detected for this sector.</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}