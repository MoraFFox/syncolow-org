"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Manufacturer } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  manufacturers?: Manufacturer[];
}

export function ProductGrid({ products, onEdit, onDelete, manufacturers }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products found.
      </div>
    );
  }

  const getManufacturerName = (manufacturerId?: string) => {
    if (!manufacturerId || !manufacturers) return null;
    return manufacturers.find(m => m.id === manufacturerId)?.name;
  };

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
      {products.map((product) => {
        const manufacturerName = getManufacturerName(product.manufacturerId);
        
        return (
          <Card
            key={product.id}
            className={cn(product.isVariant && "bg-muted/50 ml-4")}
          >
            <CardContent className='p-4 flex gap-4'>
              <Image
                src={product.imageUrl || "https://placehold.co/100x100.png"}
                alt={product.name}
                width={80}
                height={80}
                className='rounded-md object-cover'
                data-ai-hint={product.hint}
              />
              <div className='flex-1 flex flex-col justify-between'>
                <div>
                  <p className='font-semibold'>
                    {product.name}{" "}
                    {product.variantName && `- ${product.variantName}`}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    $
                    {typeof product.price === "number"
                      ? product.price.toFixed(2)
                      : "0.00"}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {product.stock} in stock
                  </p>
                  
                  {(product.category || manufacturerName) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.category && (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          {product.category}
                        </span>
                      )}
                      {manufacturerName && (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                          {manufacturerName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className='mt-2 flex items-center justify-end space-x-2'>
                  <Button variant='outline' size='sm' asChild>
                    <Link href={`/products/${product.id}`}>View</Link>
                  </Button>

                  <Button
                    variant='secondary'
                    size='icon'
                    className='h-9 w-9'
                    onClick={() => onEdit(product)}
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='destructive'
                    size='icon'
                    className='h-9 w-9'
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
