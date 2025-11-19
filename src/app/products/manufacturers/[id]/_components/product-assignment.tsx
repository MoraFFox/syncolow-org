
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { Product } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
 SelectValue
} from '@/components/ui/select';
import ProgressBar from '@/components/ui/progress-bar';
import { useToast } from '@/hooks/use-toast';
import PriceRangeFilter from '@/components/ui/price-range-filter';
import StockLevelFilter from '@/components/ui/stock-level-filter';
import DateRangeFilter from '@/components/ui/date-range-filter';

interface ProductAssignmentProps {
  manufacturerId: string;
}

const ProductAssignment: React.FC<ProductAssignmentProps> = ({ manufacturerId }) => {
  const { productsByManufacturer, updateProductManufacturer, updateMultipleProductManufacturers } = useManufacturerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAssigning, setIsAssigning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, failed: 0 });
  const { toast } = useToast();
  
  // Advanced filtering state
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [selectedStockLevels, setSelectedStockLevels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Advanced selection state
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Get all products that are not assigned to any manufacturer
  const unassignedProducts = Object.values(productsByManufacturer).flat().filter(
    product => !product.manufacturerId || product.manufacturerId === ''
  );

  // Extract unique categories from products
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    unassignedProducts.forEach(product => {
      if (product.category && product.category.trim() !== '') {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort();
  }, [unassignedProducts]);

  // Filter products based on search term and category
 const filteredProducts = useMemo(() => {
    let result = unassignedProducts;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        product =>
          product.name.toLowerCase().includes(term) ||
          (product.description && product.description.toLowerCase().includes(term)) ||
          (product.sku && product.sku.toLowerCase().includes(term))
      );
    }
    
    // Apply price range filter
    if (minPrice > 0 || maxPrice < 1000) {
      result = result.filter(
        product =>
          product.price !== undefined &&
          product.price >= minPrice &&
          product.price <= maxPrice
      );
    }
    
    // Apply stock level filter
    if (selectedStockLevels.length > 0) {
      result = result.filter(product => {
        if (selectedStockLevels.includes('in-stock') && (product.stock || 0) > 10) {
          return true;
        }
        if (selectedStockLevels.includes('low-stock') && (product.stock || 0) > 0 && (product.stock || 0) <= 10) {
          return true;
        }
        if (selectedStockLevels.includes('out-of-stock') && (product.stock || 0) === 0) {
          return true;
        }
        return false;
      });
    }
    
    // Apply date range filter (for product creation/modification date)
    // Note: This assumes products have a 'createdAt' field - adjust as needed
    if (startDate || endDate) {
      result = result.filter(product => {
        // If product has createdAt date, use it for filtering
        if (product.createdAt) {
          const productDate = new Date(product.createdAt);
          if (startDate && productDate < startDate) return false;
          if (endDate && productDate > endDate) return false;
          return true;
        }
        // If no createdAt field, include the product
        return true;
      });
    }
    
    return result;
 }, [searchTerm, selectedCategory, minPrice, maxPrice, selectedStockLevels, startDate, endDate, unassignedProducts]);

 const handleSelectProduct = (productId: string, index: number) => {
   // If shift key is pressed, perform range selection
   if (lastSelectedIndex !== null) {
     const startIndex = Math.min(lastSelectedIndex, index);
     const endIndex = Math.max(lastSelectedIndex, index);
     
     // Get the IDs of products in the range
     const rangeProductIds = filteredProducts
       .slice(startIndex, endIndex + 1)
       .map(product => product.id);
     
     // Check if all products in range are currently selected
     const allSelected = rangeProductIds.every(id => selectedProducts.includes(id));
     
     // If all are selected, remove them all; otherwise, add them all
     if (allSelected) {
       setSelectedProducts(prev => prev.filter(id => !rangeProductIds.includes(id)));
     } else {
       setSelectedProducts(prev => {
         // Remove any IDs in the range that are already selected, then add all range IDs
         const filteredPrev = prev.filter(id => !rangeProductIds.includes(id));
         return [...filteredPrev, ...rangeProductIds];
       });
     }
   } else {
     // Normal single selection
     setSelectedProducts(prev =>
       prev.includes(productId)
         ? prev.filter(id => id !== productId)
         : [...prev, productId]
     );
   }
   
   // Update the last selected index
   setLastSelectedIndex(index);
 };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
 };

  const handleAssignProducts = async () => {
    if (selectedProducts.length === 0) return;
    
    setIsAssigning(true);
    setProgress({ completed: 0, total: selectedProducts.length, failed: 0 });
    
    try {
      // Use the new batch function with progress tracking
      await updateMultipleProductManufacturers(
        selectedProducts,
        manufacturerId,
        (progressData) => {
          setProgress(progressData);
        }
      );
      
      // Show success toast
      toast({
        title: 'Products assigned successfully',
        description: `${selectedProducts.length} products have been assigned to the manufacturer.`,
      });
      
      // Clear selection after successful assignment
      setSelectedProducts([]);
    } catch (error) {
      console.error('Error assigning products:', error);
      
      // Show error toast
      toast({
        title: 'Error assigning products',
        description: 'There was an error assigning the products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Products to Manufacturer</CardTitle>
        <CardDescription>
          Select products that belong to this manufacturer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            {allCategories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              onClick={handleAssignProducts}
              disabled={selectedProducts.length === 0 || isAssigning}
            >
              {isAssigning ? 'Assigning...' : `Assign Selected (${selectedProducts.length})`}
            </Button>
          </div>

          {/* Advanced Filters Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Advanced Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Reset all filters
                  setMinPrice(0);
                  setMaxPrice(1000);
                  setSelectedStockLevels([]);
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PriceRangeFilter
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceChange={(min, max) => {
                  setMinPrice(min);
                  setMaxPrice(max);
                }}
              />
              
              <StockLevelFilter
                selectedLevels={selectedStockLevels}
                onLevelChange={(level, checked) => {
                  if (checked) {
                    setSelectedStockLevels([...selectedStockLevels, level]);
                  } else {
                    setSelectedStockLevels(selectedStockLevels.filter(l => l !== level));
                  }
                }}
              />
              
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>
          </div>

          <div className="flex items-center py-2">
            <Checkbox
              id="select-all"
              checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
              onCheckedChange={() => handleSelectAll()}
              className="mr-2"
            />
            <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select All
            </label>
            <span className="ml-2 text-sm text-muted-foreground">
              {filteredProducts.length} products available
            </span>
          </div>

          {/* Progress bar when assignment is in progress */}
          {isAssigning && (
            <div className="mb-4">
              <ProgressBar
                value={progress.completed}
                max={progress.total}
                statusMessage={`Assigning products... ${progress.completed} of ${progress.total} completed`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`border rounded-lg p-4 flex items-start space-x-3 transition-colors ${
                  selectedProducts.includes(product.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <Checkbox
                  id={`product-${product.id}`}
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => handleSelectProduct(product.id, index)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`product-${product.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {product.name}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {product.description || 'No description'}
                  </p>
                  <div className="flex items-center mt-2 space-x-2">
                    {product.category && (
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                    {product.sku && (
                      <Badge variant="outline" className="text-xs">
                        SKU: {product.sku}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      ${product.price?.toFixed(2) || '0.00'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || selectedCategory !== 'all'
                ? 'No products match your filters.'
                : 'No unassigned products available.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductAssignment;
