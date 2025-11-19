'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { ManufacturerCard } from './_components/manufacturer-card';
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

export default function ManufacturersPage() {
  const { manufacturers, loading, error, fetchManufacturersAndProducts, deleteManufacturer } = useManufacturerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [manufacturerToDelete, setManufacturerToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchManufacturersAndProducts();
  }, [fetchManufacturersAndProducts]);

  const handleDeleteClick = (id: string) => {
    setManufacturerToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (manufacturerToDelete) {
      try {
        await deleteManufacturer(manufacturerToDelete);
      } catch (error) {
        console.error("Failed to delete manufacturer:", error);
      } finally {
        setIsDeleteDialogOpen(false);
        setManufacturerToDelete(null);
      }
    }
  };

  const filteredManufacturers = manufacturers.filter(manufacturer => 
    manufacturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manufacturer.description && manufacturer.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manufacturers</h1>
            <p className="text-muted-foreground mt-2">
              Loading manufacturers...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manufacturers</h1>
            <p className="text-muted-foreground mt-2">
              Error loading manufacturers
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button
              className="mt-4"
              onClick={() => fetchManufacturersAndProducts()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manufacturers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your product manufacturers and brands
          </p>
        </div>
        <Link href="/products/manufacturers/add">
          <Button>Add Manufacturer</Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search manufacturers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredManufacturers.map((manufacturer) => (
          <ManufacturerCard 
            key={manufacturer.id} 
            manufacturer={manufacturer} 
            onDelete={handleDeleteClick} 
          />
        ))}
      </div>

      {filteredManufacturers.length === 0 && (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'No manufacturers match your search.' : 'No manufacturers found. Create your first manufacturer to get started.'}
            </p>
            {!searchTerm && (
              <Link href="/products/manufacturers/add">
                <Button className="mt-4">Add Manufacturer</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the manufacturer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setManufacturerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
