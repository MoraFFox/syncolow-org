"use client";

import { Manufacturer, Product } from "@/lib/types";
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Building2, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ManufacturerCardProps {
  manufacturer: Manufacturer;
  products: Product[];
  onClick: () => void;
}

export function ManufacturerCard({ manufacturer, products, onClick }: ManufacturerCardProps) {
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  // Calculate distinct categories for this manufacturer
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <DrillTarget
      kind="manufacturer"
      payload={{
        id: manufacturer.id,
        name: manufacturer.name,
        icon: manufacturer.icon,
        productCount: products.length
      }}
      asChild
    >
      <motion.div
        whileHover={{ y: -4 }}
        onClick={onClick}
        className="cursor-pointer h-full"
      >
        <Card className="h-full border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col">
          {/* Brand Header */}
          <div className="p-6 pb-4 bg-muted/20 border-b border-border/40 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform duration-300">
                {manufacturer.icon ? (
                  <Image
                    src={manufacturer.icon}
                    alt={manufacturer.name}
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground/60" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{manufacturer.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                    {products.length} Items
                  </Badge>
                  {categories.length > 0 && (
                    <span className="text-xs text-muted-foreground">in {categories.length} Categories</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics & Content */}
          <div className="p-6 pt-4 flex-1 flex flex-col gap-4">
            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col p-2 rounded-lg bg-muted/20 border border-border/20">
                <span className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Stock Vol</span>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono font-bold">{totalStock}</span>
                </div>
              </div>
              <div className="flex flex-col p-2 rounded-lg bg-muted/20 border border-border/20">
                <span className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Avg Price</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-mono font-bold">
                    ${products.length > 0
                      ? (products.reduce((acc, p) => acc + p.price, 0) / products.length).toFixed(0)
                      : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Products Teaser */}
            <div className="mt-auto">
              <span className="text-xs text-muted-foreground font-medium mb-2 block">Top Products</span>
              <div className="space-y-1.5">
                {products.slice(0, 3).map(p => (
                  <div key={p.id} className="text-xs truncate flex items-center gap-2 text-foreground/80 hover:text-primary">
                    <div className="w-1 h-1 rounded-full bg-primary/40" />
                    {p.name}
                  </div>
                ))}
                {products.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-3">
                    + {products.length - 3} more
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View Action Footer */}
          <div className="p-3 bg-muted/10 border-t border-border/40 flex justify-end">
            <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
              View Portfolio <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Card>
      </motion.div>
    </DrillTarget>
  );
}
