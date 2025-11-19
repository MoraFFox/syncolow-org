
"use client";

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DeliveryArea } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'Area name is required.'),
  deliverySchedule: z.enum(['A', 'B']),
});

interface AreaFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<DeliveryArea, 'id'>) => void;
  item: DeliveryArea | null;
}

export function AreaFormDialog({ isOpen, onOpenChange, onSubmit, item }: AreaFormDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        deliverySchedule: 'A',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset(item);
      } else {
        reset({ name: '', deliverySchedule: 'A' });
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
          <DialogTitle>{item ? 'Edit' : 'Add'} Delivery Area</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details for this delivery area.' : 'Enter the details for a new delivery area.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Area Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
               <Controller
                name="deliverySchedule"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a schedule" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="A">Schedule A</SelectItem>
                            <SelectItem value="B">Schedule B</SelectItem>
                        </SelectContent>
                    </Select>
                )}
              />
              {errors.deliverySchedule && <p className="text-sm text-destructive">{errors.deliverySchedule.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{item ? 'Save Changes' : 'Add Area'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
