
"use client";
import { useState, useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search, ArrowLeft, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Category } from '@/lib/types';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import * as React from 'react';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Category, 'id'>) => void;
  item: Category | null;
}

function CategoryFormDialog({ isOpen, onOpenChange, onSubmit, item }: CategoryFormDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      if (item) {
        reset(item);
      } else {
        reset({ name: '' });
      }
    }
  }, [isOpen, item, reset]);

  const handleFormSubmit = (data: CategoryFormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{item ? 'Save Changes' : 'Add Category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function CategoriesPage() {
    const { categories, addCategory, updateCategory, deleteCategory } = useOrderStore();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Category | null>(null);

    const filteredCategories = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return categories;
        return categories.filter(category => category.name.toLowerCase().includes(searchLower));
    }, [categories, searchTerm]);

    const handleOpenForm = (item: Category | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<Category, 'id'>) => {
        if (editingItem) {
            await updateCategory(editingItem.id, data);
            toast({ title: 'Category Updated' });
        } else {
            await addCategory(data);
            toast({ title: 'Category Added' });
        }
    };

    const openDeleteDialog = (item: Category) => {
        setItemToDelete(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        await deleteCategory(itemToDelete.id);
        toast({ title: 'Category Deleted', variant: 'destructive' });
        setItemToDelete(null);
        setIsAlertOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Product Categories</h1>
                    <p className="text-muted-foreground">Organize your products by creating and managing categories.</p>
                </div>
            </div>
            
            <CategoryFormDialog 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
                item={editingItem}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{itemToDelete?.name}" category. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Manage Categories</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </div>
                     <div className="relative mt-2">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Search categories..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.map(category => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <DrillTarget kind="category" payload={{ id: category.id, name: category.name }} asChild>
                                            <Link href={`/products/categories/${category.id}`} className="hover:underline">
                                                {category.name}
                                            </Link>
                                        </DrillTarget>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/products/categories/${category.id}`}>
                                                <BarChart2 className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(category)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(category)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {filteredCategories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">No categories found.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
