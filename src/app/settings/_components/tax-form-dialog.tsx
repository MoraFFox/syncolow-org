
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tax } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'Tax name is required.'),
  rate: z.preprocess(
      (val) => parseFloat(String(val)),
      z.number().min(0, "Rate must be non-negative.")
  )
});

interface TaxFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Tax, 'id'>) => void;
  item: Tax | null;
}

export function TaxFormDialog({ isOpen, onOpenChange, onSubmit, item }: TaxFormDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset(item);
      } else {
        reset({ name: '', rate: 0 });
      }
    }
  }, [isOpen, item, reset]);

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Tax Rate</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details for this tax rate.' : 'Enter the details for a new tax rate.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tax Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate">Rate (%)</Label>
              <Input id="rate" type="number" step="0.01" {...register('rate')} />
              {errors.rate && <p className="text-sm text-destructive">{errors.rate.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{item ? 'Save Changes' : 'Add Tax'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
