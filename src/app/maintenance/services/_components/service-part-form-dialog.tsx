
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialogWrapper } from '@/components/maintenance/form-dialog-wrapper';
import { FormSection } from '@/components/maintenance/form-section';
import { Box, Wrench, AlertTriangle, Tag, DollarSign, Loader2, Save } from 'lucide-react';

export interface CatalogItem {
  id?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleFormSubmit = async (data: CatalogItem) => {
    setIsSubmitting(true);
    try {
      onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isService = itemType === 'service' && !isProblemMode;
  const isProblem = isProblemMode;
  const isPart = itemType === 'part' && !isProblemMode;

  const getTitle = () => {
    if (isProblem) return item ? 'Edit Problem' : 'Log New Problem';
    if (isService) return item ? 'Edit Service' : 'Add New Service';
    return item ? 'Edit Part' : 'Add New Part';
  };

  const getDescription = () => {
    if (isProblem) return "Define a common problem for quick selection.";
    if (isService) return "Configure a service offering and its base cost.";
    return "Add a spare part to the inventory catalog.";
  };

  const Footer = (
    <>
      <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting} className="min-w-[120px]">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {item ? 'Save Changes' : 'Add Item'}
          </>
        )}
      </Button>
    </>
  );

  return (
    <FormDialogWrapper
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description={getDescription()}
      footer={Footer}
      maxWidth="md"
    >
      <div className="space-y-6">
        <FormSection
          title={isProblem ? "Problem Details" : isService ? "Service Details" : "Part Details"}
          icon={isProblem ? AlertTriangle : isService ? Wrench : Box}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category / Group</Label>
              <div className="relative">
                <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="category" className="pl-9" {...register('category')} placeholder="e.g. Electrical, Plumbing" />
              </div>
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" {...register('name')} placeholder={isProblem ? "e.g. Leaking Faucet" : isService ? "e.g. AC Maintenance" : "e.g. Compressor"} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>
        </FormSection>

        {!isProblem && (
          <FormSection title="Pricing" icon={DollarSign}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={isService ? 'cost' : 'price'}>{isService ? 'Base Labor Cost (EGP)' : 'Unit Price (EGP)'}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold text-sm">EGP</span>
                  <Input
                    id={isService ? 'cost' : 'price'}
                    type="number"
                    step={isService ? 'any' : '0.01'}
                    className="pl-12"
                    {...register(isService ? 'cost' : 'price', { valueAsNumber: true })}
                  />
                </div>
                {(isService && errors.cost) && <p className="text-sm text-destructive">{errors.cost.message}</p>}
                {(isPart && errors.price) && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
            </div>
          </FormSection>
        )}
      </div>
    </FormDialogWrapper>
  );
}

