
"use client";
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { useRouter } from 'next/navigation';
import ManufacturerAnalytics from './_components/manufacturer-analytics';
import ProductAssignment from './_components/product-assignment';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

export default function ManufacturerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { manufacturers, productsByManufacturer, deleteManufacturer, deleteManufacturerAndProducts, loading, fetchManufacturersAndProducts } = useManufacturerStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteWithProductsDialogOpen, setIsDeleteWithProductsDialogOpen] = useState(false);

  useEffect(() => {
    // Always fetch on component mount if data isn't already loaded to ensure freshness.
    if (manufacturers.length === 0) {
      fetchManufacturersAndProducts();
    }
  }, [fetchManufacturersAndProducts, manufacturers.length]);

  const manufacturer = manufacturers.find(m => m.id === resolvedParams.id);

  const handleDeleteClick = (withProducts: boolean) => {
    if (withProducts) {
      setIsDeleteWithProductsDialogOpen(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteManufacturer(resolvedParams.id);
      router.push('/products/manufacturers');
      toast({ title: 'Manufacturer Deleted' });
    } catch (error) {
      console.error("Failed to delete manufacturer:", error);
      toast({ title: 'Error', description: 'Failed to delete manufacturer.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleConfirmDeleteWithProducts = async () => {
    try {
      await deleteManufacturerAndProducts(resolvedParams.id);
      router.push('/products/manufacturers');
      toast({ title: 'Manufacturer and Products Deleted' });
    } catch (error) {
      console.error("Failed to delete manufacturer and products:", error);
      toast({ title: 'Error', description: 'Failed to delete manufacturer and its products.', variant: 'destructive' });
    } finally {
      setIsDeleteWithProductsDialogOpen(false);
    }
  };

  if (loading || manufacturers.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-12 w-1/2 mb-6" />
        <Skeleton className="h-8 w-1/3 mb-6" />
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!manufacturer) {
    notFound();
  }

  const manufacturerProducts = productsByManufacturer[resolvedParams.id] || [];
  
  const handleEditClick = () => {
    router.push(`/products/manufacturers/${resolvedParams.id}/edit`);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{manufacturer.name}</h1>
          <p className="text-muted-foreground">{manufacturer.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClick}>Edit Manufacturer</Button>
          <Button variant="destructive" onClick={() => handleDeleteClick(false)}>Delete</Button>
          <Button variant="destructive" onClick={() => handleDeleteClick(true)}>Delete with Products</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manufacturer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            {manufacturer.icon && (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                  <Image 
                    src={manufacturer.icon} 
                    alt={`${manufacturer.name} icon`} 
                    width={64} 
                    height={64} 
                    className="object-contain"
                  />
                </div>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">{manufacturer.name}</h3>
              <p className="text-sm text-muted-foreground">{manufacturer.description}</p>
              {manufacturer.tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="mt-2 mr-2">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />
      
      <ManufacturerAnalytics manufacturer={manufacturer} products={manufacturerProducts} />
      
      <Separator className="my-6" />
      
      <ProductAssignment manufacturerId={manufacturer.id} />
      
      <Separator className="my-6" />

      <div>
        <h2 className="text-2xl font-bold mb-4">Products ({manufacturerProducts.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manufacturerProducts.map(product => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                <p className="text-sm">Price: ${product.price?.toFixed(2) || '0.00'}</p>
                <p className="text-sm">Stock: {product.stock || 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the manufacturer but keep its products (they will become unassigned). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete Manufacturer Only</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isDeleteWithProductsDialogOpen} onOpenChange={setIsDeleteWithProductsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. This will permanently delete the manufacturer AND all of its associated products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteWithProducts} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
