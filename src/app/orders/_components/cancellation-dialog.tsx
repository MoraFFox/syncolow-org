
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, CancellationReason } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EditableCombobox } from '@/components/ui/editable-combo-box';
import { useMaintenanceStore } from '@/store/use-maintenance-store';

const cancellationSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required."),
  notes: z.string().optional(),
});

type CancellationFormData = z.infer<typeof cancellationSchema>;

interface CancellationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: Order | null;
  onSubmit: (reason: string, notes?: string) => Promise<void>;
}

export function CancellationDialog({ isOpen, onOpenChange, order, onSubmit }: CancellationDialogProps) {
  const { cancellationReasons, addCancellationReason } = useMaintenanceStore();
  const { control, handleSubmit, reset, watch } = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
  });

  const reasonValue = watch('reason');

  useEffect(() => {
    if (!isOpen) {
      reset({ reason: '', notes: '' });
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: CancellationFormData) => {
    const isNewReason = !cancellationReasons.some(r => r.reason.toLowerCase() === data.reason.toLowerCase());
    
    if (isNewReason) {
        await addCancellationReason(data.reason);
    }
    
    await onSubmit(data.reason, data.notes);
  };
  
  const reasonOptions = cancellationReasons.map(r => ({ label: r.reason, value: r.reason }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order #{order?.id.slice(0, 7)}</DialogTitle>
          <DialogDescription>
            Please provide a reason for cancelling this order. This helps with analytics.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Cancellation</Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                    <EditableCombobox
                        options={reasonOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select or type a reason..."
                        searchPlaceholder="Search reasons..."
                        emptyText="No matching reason. Type to create a new one."
                    />
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="notes"
                    placeholder="Add any extra details here..."
                    {...field}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button type="submit">Confirm Cancellation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
