
"use client";

import { BranchSubForm } from '../branch-sub-form';

export function Step4_BranchForms({ fields, control, register, errors, watch, setValue, removeBranch, openMapPicker }: any) {
  return (
    <div className="space-y-6">
        {fields.map((field: any, index: number) => (
           <BranchSubForm 
                key={field.id}
                index={index}
                control={control}
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue}
                removeBranch={() => removeBranch(index)}
                openMapPicker={openMapPicker}
           />
        ))}
    </div>
  );
}
