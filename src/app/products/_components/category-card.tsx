"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, Product } from "@/lib/types";
import { Package, DollarSign } from "lucide-react";
import { DrillTarget } from '@/components/drilldown/drill-target';


interface CategoryCardProps {
  category: Category;
  products: Product[];
  onClick: () => void;
}

export function CategoryCard({ category, products, onClick }: CategoryCardProps) {
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  return (
    <div onClick={onClick} className="h-full">
      <Card 
        className="hover:bg-muted/50 transition-colors cursor-pointer h-full"
      >
        <CardHeader className="pb-2">
          <DrillTarget 
            kind="category" 
            payload={{ 
              id: category.id, 
              name: category.name,
              productCount: products.length 
            }} 
            asChild
          >
            <CardTitle className="text-lg font-bold cursor-pointer hover:underline">
              {category.name}
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
