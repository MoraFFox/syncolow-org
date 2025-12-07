"use client";

import type { Control, UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { BranchSubForm } from '../branch-sub-form';
import type { CompanyFormProps } from '@/types/forms';

interface Step4Props {
  fields: Array<{ id: string }>;
  control: Control<CompanyFormProps>;
  register: UseFormRegister<CompanyFormProps>;
  errors: FieldErrors<CompanyFormProps>;
  watch: UseFormWatch<CompanyFormProps>;
  setValue: UseFormSetValue<CompanyFormProps>;
  removeBranch: (index: number) => void;
  openMapPicker: (type: string) => void;
}

export function Step4_BranchForms({ fields, control, register, errors, watch, setValue, removeBranch, openMapPicker }: Step4Props) {
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
