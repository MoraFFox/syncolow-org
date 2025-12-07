"use client";

import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin } from 'lucide-react';
import { ContactsSubForm } from '../contacts-sub-form';
import type { CompanyFormProps } from '@/types/forms';

interface Step3Props {
  control: Control<CompanyFormProps>;
  register: UseFormRegister<CompanyFormProps>;
  errors: FieldErrors<CompanyFormProps>;
  watch: UseFormWatch<CompanyFormProps>;
  openMapPicker: (type: string) => void;
  setValue: UseFormSetValue<CompanyFormProps>;
}

export function Step3_BranchOrFinal({ control, register, errors, watch, openMapPicker, setValue }: Step3Props) {
  const watchHasBranches = watch('hasBranches');
  const watchMachineOwned = watch('machineOwned');
  const companyName = watch('companyName');

  if (watchHasBranches === 'yes') {
    return (
      <div className="space-y-4">
        <div className="grid gap-2">
            <Label htmlFor="branchCount">Number of Branches</Label>
            <Input id="branchCount" type="number" {...register("branchCount", { valueAsNumber: true, min: 1 })} min="1"/>
            {errors.branchCount && <p className="text-sm text-destructive">{errors.branchCount.message}</p>}
        </div>
      </div>
    );
  }

  // If no branches, this is the final step
  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Machine Ownership</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center space-x-2 mb-4">
                 <Controller name="machineOwned" control={control} render={({ field }) => <Switch id="machineOwned" checked={field.value} onCheckedChange={field.onChange} />} />
                 <Label htmlFor="machineOwned">Client Owns the Machine</Label>
             </div>
             {!watchMachineOwned && (
               <div className="grid gap-2">
                 <Label>Machine Status (Owned by SynergyFlow)</Label>
                 <Controller name="machineLeased" control={control} render={({ field }) => (
                   <RadioGroup onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)} className="flex gap-4">
                     <Label htmlFor="machineLeased" className="p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                       <RadioGroupItem value="true" id="machineLeased" /> Leased
                     </Label>
                     <Label htmlFor="machineBought" className="p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                       <RadioGroupItem value="false" id="machineBought" /> Bought
                     </Label>
                   </RadioGroup>
                 )}/>
               </div>
             )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
           <CardTitle>Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid gap-2">
                 <Label>Warehouse Location</Label>
                 <div className="relative">
                     <Input {...register("warehouseLocation")} placeholder="Type address or click icon" className="pr-10"/>
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => openMapPicker('singleWarehouse')}> <MapPin className="h-4 w-4" /> </Button>
                 </div>
             </div>
             <ContactsSubForm control={control} register={register} errors={errors} fieldNamePrefix="warehouseContacts" title="Warehouse Contacts" description="Contacts for the warehouse or logistics." setValue={setValue}/>
          </CardContent>
        </Card>
   </div>
  );
}
