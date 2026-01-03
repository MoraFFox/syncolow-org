"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Product, Manufacturer } from "@/lib/types";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  manufacturers?: Manufacturer[];
}

export function ProductGrid({ products, onEdit, onDelete, manufacturers }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-xl border border-dashed"
      >
        <p className="text-lg font-medium">No products inventory found.</p>
        <p className="text-sm">Try adjusting your filters or add new stock.</p>
      </motion.div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6'>
      <AnimatePresence mode="popLayout">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            manufacturers={manufacturers}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
