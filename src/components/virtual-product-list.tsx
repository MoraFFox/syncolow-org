"use client"

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { Product } from '@/lib/types';

interface VirtualProductListProps {
  products: Product[];
  renderProduct: (product: Product) => React.ReactNode;
  estimateSize?: number;
}

export function VirtualProductList({ 
  products, 
  renderProduct,
  estimateSize = 100 
}: VirtualProductListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderProduct(products[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
