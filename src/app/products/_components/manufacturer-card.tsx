"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Manufacturer, Product } from "@/lib/types";
import { Package, DollarSign } from "lucide-react";
import { DrillTarget } from '@/components/drilldown/drill-target';

import Image from "next/image";

interface ManufacturerCardProps {
  manufacturer: Manufacturer;
  products: Product[];
  onClick: () => void;
}

export function ManufacturerCard({ manufacturer, products, onClick }: ManufacturerCardProps) {
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  return (
    <div onClick={onClick} className="h-full">
      <Card 
        className="hover:bg-muted/50 transition-colors cursor-pointer h-full"
      >
        <CardHeader className="pb-2 flex flex-row items-center gap-4 space-y-0">
          {manufacturer.icon ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-white shrink-0">
                <Image
                  src={manufacturer.icon}
                  alt={manufacturer.name}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">{manufacturer.name.charAt(0)}</span>
            </div>
          )}
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
            <CardTitle className="text-lg font-bold truncate cursor-pointer hover:underline">
              {manufacturer.name}
            </CardTitle>
          </DrillTarget>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </span>
              <span className="font-medium text-foreground">{products.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Stock
              </span>
              <span className="font-medium text-foreground">{totalStock}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Stock Value
              </span>
              <span className="font-medium text-foreground">${totalValue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
