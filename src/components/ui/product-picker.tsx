
"use client";

import { useState, useEffect } from "react";
import { useProductsStore } from "@/store/use-products-store";
import { useManufacturerStore } from "@/store/use-manufacturer-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, Plus, Minus, Package, AlertTriangle } from "lucide-react";
import type { Product, OrderItem, Manufacturer } from "@/lib/types";

export interface ProductPickerProps {
  selectedProducts: OrderItem[];
  onSelectionChange: (newItems: OrderItem[]) => void;
}

export function ProductPicker({ selectedProducts, onSelectionChange }: ProductPickerProps) {
  const { products, loading: productsLoading } = useProductsStore();
  const { manufacturers, productsByManufacturer, loading: manufacturersLoading } = useManufacturerStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Effect to filter products based on search term
  useEffect(() => {
    if (!search.trim()) {
      setFilteredProducts(products);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower))
    );

    setFilteredProducts(filtered);
  }, [search, products]);

  // Find a manufacturer by ID
  const getManufacturer = (manufacturerId: string): Manufacturer | undefined => {
    return manufacturers.find((m) => m.id === manufacturerId);
  };

  // Check if a product is already selected
  const isProductSelected = (productId: string): boolean => {
    return selectedProducts.some((item) => item.productId === productId);
  };

  // Find a selected product by ID
  const getSelectedProduct = (productId: string): OrderItem | undefined => {
    return selectedProducts.find((item) => item.productId === productId);
  };

  // Add or update a product in the selection
  const handleSelectProduct = (product: Product) => {
    if (isProductSelected(product.id)) {
      // Product is already selected, increase its quantity
      const selectedItem = getSelectedProduct(product.id)!;
      const updatedItems = selectedProducts.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      onSelectionChange(updatedItems);
    } else {
      // Product is not selected, add it with quantity 1
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`, // Temporary ID for client-side state
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
      };
      onSelectionChange([...selectedProducts, newItem]);
    }
  };

  // Update quantity of a selected product
  const updateProductQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove the product if quantity is 0 or less
      const updatedItems = selectedProducts.filter((item) => item.productId !== productId);
      onSelectionChange(updatedItems);
    } else {
      // Update the quantity
      const updatedItems = selectedProducts.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      );
      onSelectionChange(updatedItems);
    }
  };

  // Get the display name of a product including variant info
  const getProductDisplayName = (product: Product): string => {
    return product.isVariant && product.variantName
      ? `${product.name} - ${product.variantName}`
      : product.name;
  };

  // Get stock status badge color
  const getStockStatusColor = (stock: number): string => {
    if (stock === 0) return "bg-red-100 text-red-800 hover:bg-red-200";
    if (stock < 10) return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    return "bg-green-100 text-green-800 hover:bg-green-200";
  };

  // Group products by manufacturer for display
  const groupProductsByManufacturer = (products: Product[]): Record<string, Product[]> => {
    return products.reduce((acc, product) => {
      const manufacturerId = product.manufacturerId || 'unassigned';
      if (!acc[manufacturerId]) {
        acc[manufacturerId] = [];
      }
      acc[manufacturerId].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  };

  if (productsLoading || manufacturersLoading) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading products...
      </Button>
    );
  }

  // Get the count of selected products
  const selectedCount = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);

  const groupedAndFilteredProducts = groupProductsByManufacturer(filteredProducts);
  const manufacturerOrder = [
    ...manufacturers.map(m => m.id),
    'unassigned'
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCount > 0 ? `${selectedCount} product${selectedCount > 1 ? "s" : ""} selected` : "Select products..."}
          <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>

            {manufacturerOrder.map(manufacturerId => {
              const manufacturer = getManufacturer(manufacturerId);
              const currentProducts = groupedAndFilteredProducts[manufacturerId];

              if (!currentProducts || currentProducts.length === 0) return null;

              const manufacturerName = manufacturer?.name || 'Unassigned';

              return (
                <CommandGroup
                  key={manufacturerId}
                  heading={
                    <div className="flex items-center gap-2">
                      {manufacturer?.icon && (
                        <span className="text-lg">{manufacturer.icon}</span>
                      )}
                      <span
                        className="font-medium"
                        style={{ color: manufacturer?.color || "inherit" }}
                      >
                        {manufacturerName}
                      </span>
                    </div>
                  }
                >
                  {currentProducts.map((product) => {
                    const selected = isProductSelected(product.id);
                    const selectedItem = getSelectedProduct(product.id);

                    return (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => handleSelectProduct(product)}
                        className={`flex flex-col items-start space-y-1 cursor-pointer ${selected ? "bg-accent" : ""
                          }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">{getProductDisplayName(product)}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {product.sku && <span>SKU: {product.sku}</span>}
                              <span className="text-xs">•</span>
                              <span>${product.price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={getStockStatusColor(product.stock)}
                            >
                              <Package className="mr-1 h-3 w-3" />
                              {product.stock}
                            </Badge>
                            {selected ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {selected && selectedItem && (
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateProductQuantity(product.id, selectedItem.quantity - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{selectedItem.quantity}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateProductQuantity(product.id, selectedItem.quantity + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>

                            {product.stock < selectedItem.quantity && (
                              <AlertTriangle className="h-3 w-3 text-amber-500 ml-1" />
                            )}
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            }
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
