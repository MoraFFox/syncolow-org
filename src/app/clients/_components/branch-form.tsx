
"use client";

import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { MapPin } from 'lucide-react';
import { LocationPickerDialog } from '../[companyId]/_components/location-picker-dialog';
import type { Branch, Company, Contact } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactsSubForm } from './company-form';

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  position: z.string().min(1, "Position is required."),
  phoneNumbers: z.array(z.object({ number: z.string().min(1, "Phone number cannot be empty.") })),
});

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  location: z.string().nullable(),
  warehouseLocation: z.string().optional().nullable(),
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  contacts: z.array(contactSchema).optional(),
  warehouseContacts: z.array(contactSchema).optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  area: z.string().optional(),
  taxNumber: z.string().optional(),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface BranchFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Partial<Company>) => Promise<void>;
  branch: Partial<Company> | null;
}

export function BranchForm({ isOpen, onOpenChange, onSubmit, branch }: BranchFormProps) {
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      location: null,
      warehouseLocation: '',
      machineOwned: false,
      machineLeased: false,
      contacts: [],
      warehouseContacts: [],
      region: 'A',
      area: '',
      taxNumber: '',
    }
  });

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<'location' | 'warehouse' | null>(null);

  useEffect(() => {
    if (branch) {
      reset({
        name: branch.name || '',
        email: branch.email || '',
        location: branch.location || null,
        warehouseLocation: branch.warehouseLocation || '',
        machineOwned: branch.machineOwned || false,
        machineLeased: branch.machineLeased || false,
        contacts: branch.contacts || [],
        warehouseContacts: branch.warehouseContacts || [],
        region: branch.region || 'A',
        area: branch.area || '',
        taxNumber: branch.taxNumber || '',
      });
    }
  }, [branch, reset]);

  const handleFormSubmit: SubmitHandler<BranchFormData> = async (data) => {
    try {
      const branchData: Partial<Company> = {
        name: data.name,
        location: data.location,
        machineOwned: data.machineOwned,
        region: data.region || 'A',
        contacts: data.contacts || [],
        email: data.email || undefined,
        area: data.area || undefined,
        taxNumber: data.taxNumber || undefined,
        warehouseLocation: data.warehouseLocation,
        machineLeased: data.machineLeased,
        warehouseContacts: data.warehouseContacts,
      };

      await onSubmit(branchData);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Failed to save branch. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openMapPicker = (type: 'location' | 'warehouse') => {
    setEditingAddress(type);
    setIsMapOpen(true);
  };

  const handleConfirmLocation = (newAddress: string) => {
    if (editingAddress === 'location') {
      setValue('location', newAddress, { shouldDirty: true });
    } else if (editingAddress === 'warehouse') {
      setValue('warehouseLocation', newAddress, { shouldDirty: true });
    }
  };

  const getInitialAddress = () => {
    if (editingAddress === 'location') return watch('location') ?? '';
    if (editingAddress === 'warehouse') return watch('warehouseLocation') ?? '';
    return '';
  };

  return (
    <>
      <LocationPickerDialog
        isOpen={isMapOpen}
        onOpenChange={setIsMapOpen}
        initialAddress={getInitialAddress()}
        onConfirm={handleConfirmLocation}
      />
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch details and contacts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Branch Name *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label>Tax Number</Label>
                <Input {...register('taxNumber')} />
              </div>

              <div className="grid gap-2">
                <Label>Region</Label>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Region A</SelectItem>
                        <SelectItem value="B">Region B</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label>Area</Label>
                <Input {...register('area')} />
              </div>

              <div className="grid gap-2">
                <Label>Branch Location *</Label>
                <div className="flex gap-2">
                  <Input {...register('location')} readOnly />
                  <Button type="button" variant="outline" onClick={() => openMapPicker('location')}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label>Warehouse Location</Label>
                <div className="flex gap-2">
                  <Input {...register('warehouseLocation')} readOnly />
                  <Button type="button" variant="outline" onClick={() => openMapPicker('warehouse')}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Controller
                    name="machineOwned"
                    control={control}
                    render={({ field }) => (
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <Label>Machine Owned</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Controller
                    name="machineLeased"
                    control={control}
                    render={({ field }) => (
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <Label>Machine Leased</Label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <ContactsSubForm
                  control={control as any}
                  register={register as any}
                  errors={errors as any}
                  fieldNamePrefix="contacts"
                  setValue={setValue as any}
                  title="Branch Contacts"
                  description="Contacts for this branch."
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <ContactsSubForm
                  control={control as any}
                  register={register as any}
                  errors={errors as any}
                  fieldNamePrefix="warehouseContacts"
                  setValue={setValue as any}
                  title="Warehouse Contacts"
                  description="Contacts for the warehouse."
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              {Object.keys(errors).length > 0 && (
                <div className="mr-auto text-left max-w-md">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Please fix the following errors:
                  </p>
                  <ul className="text-xs text-destructive space-y-0.5">
                    {errors.name && <li>• Branch name: {errors.name.message}</li>}
                    {errors.email && <li>• Email: {errors.email.message}</li>}
                    {errors.location && <li>• Location: {errors.location.message}</li>}
                  </ul>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
