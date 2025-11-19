
"use client";

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CatalogItem {
    category: string;
    name: string;
    cost?: number;
    price?: number;
}

const formSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  name: z.string().min(1, 'Name is required.'),
  cost: z.number().nonnegative('Cost must be a non-negative number.').optional(),
  price: z.number().nonnegative('Price must be a non-negative number.').optional(),
});

interface ServicePartFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: CatalogItem) => void;
  item: CatalogItem | null;
  itemType: 'service' | 'part';
  isProblemMode?: boolean;
}

export function ServicePartFormDialog({ isOpen, onOpenChange, onSubmit, item, itemType, isProblemMode = false }: ServicePartFormDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CatalogItem>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset(item);
      } else {
        reset({ category: '', name: '', cost: 0, price: 0 });
      }
    }
  }, [isOpen, item, reset]);

  const handleFormSubmit = (data: CatalogItem) => {
    onSubmit(data);
    onOpenChange(false);
  };
  
  const isService = itemType === 'service' && !isProblemMode;
  const isProblem = isProblemMode;
  const isPart = itemType === 'part' && !isProblemMode;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} {isProblem ? 'Problem' : isService ? 'Service' : 'Part'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details below.' : `Enter the details for the new ${isProblem ? 'problem' : isService ? 'service' : 'part'}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register('category')} />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            {!isProblem && (
              <div className="grid gap-2">
                <Label htmlFor={isService ? 'cost' : 'price'}>{isService ? 'Cost (EGP)' : 'Price ($)'}</Label>
                <Input
                  id={isService ? 'cost' : 'price'}
                  type="number"
                  step={isService ? 'any' : '0.01'}
                  {...register(isService ? 'cost' : 'price', { valueAsNumber: true })}
                />
                {(isService && errors.cost) && <p className="text-sm text-destructive">{errors.cost.message}</p>}
                {(isPart && errors.price) && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{item ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    