
"use client";

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Barista } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';

const baristaSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phoneNumber: z.string().min(1, "Phone number is required."),
  rating: z.number().min(1).max(5),
  notes: z.string().optional(),
});

type BaristaFormData = z.infer<typeof baristaSchema>;

interface BaristaFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (data: Omit<BaristaFormData, 'notes'> & { notes?: string }) => void;
    barista?: Barista | null;
}

export function BaristaForm({ isOpen, onOpenChange, onSubmit, barista }: BaristaFormProps) {
    const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<BaristaFormData>({
        resolver: zodResolver(baristaSchema),
        defaultValues: {
            rating: 3,
            name: '',
            phoneNumber: '',
            notes: ''
        }
    });
    
    const [ratingValue, setRatingValue] = useState(3);
    const watchedRating = watch('rating');

    useEffect(() => {
        setRatingValue(watchedRating);
    }, [watchedRating]);

    useEffect(() => {
        if (isOpen && barista) {
            reset(barista);
        } else if (isOpen) {
            reset({
                rating: 3,
                name: '',
                phoneNumber: '',
                notes: ''
            });
        }
    }, [barista, isOpen, reset]);


    const handleFormSubmit = (data: BaristaFormData) => {
        onSubmit(data);
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{barista ? 'Edit Barista' : 'Add New Barista'}</DialogTitle>
                    <DialogDescription>
                        {barista ? "Update the barista's details." : "Enter the details for the new barista."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Barista Name</Label>
                            <Input id="name" {...register("name")} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input id="phoneNumber" {...register("phoneNumber")} />
                            {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rating">Rating ({ratingValue})</Label>
                            <Controller
                                name="rating"
                                control={control}
                                render={({ field }) => (
                                     <Slider
                                        id="rating"
                                        min={1}
                                        max={5}
                                        step={1}
                                        value={[field.value]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                    />
                                )}
                            />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" {...register("notes")} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{barista ? 'Save Changes' : 'Add Barista'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
