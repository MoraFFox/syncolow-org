
"use client";

import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function Step2_CompanyStructure({ control }: any) {
  return (
    <div className="space-y-4">
        <Controller
            name="hasBranches"
            control={control}
            render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label htmlFor="hasBranchesYes" className="p-4 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="yes" id="hasBranchesYes" />
                        Yes, it has branches
                    </Label>
                    <Label htmlFor="hasBranchesNo" className="p-4 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="no" id="hasBranchesNo" />
                        No, it's a single entity
                    </Label>
                </RadioGroup>
            )}
        />
    </div>
  );
}
