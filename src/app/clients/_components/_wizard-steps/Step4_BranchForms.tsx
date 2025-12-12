"use client";

import type { Control, UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { BranchSubForm } from '../branch-sub-form';
import type { CompanyWizardFormData } from '../company-wizard-schemas';

interface Step4Props {
  fields: Array<{ id: string }>;
  control: Control<CompanyWizardFormData>;
  register: UseFormRegister<CompanyWizardFormData>;
  errors: FieldErrors<CompanyWizardFormData>;
  watch: UseFormWatch<CompanyWizardFormData>;
  setValue: UseFormSetValue<CompanyWizardFormData>;
  removeBranch: (index: number) => void;
  openMapPicker: (type: 'branch' | 'warehouse', index: number) => void;
}

export function Step4_BranchForms({ fields, control, register, errors, watch, setValue, removeBranch, openMapPicker }: Step4Props) {
  return (
    <div className="space-y-6">
      {fields.map((field: { id: string }, index: number) => (
        <BranchSubForm
          key={field.id}
          index={index}
          control={control as unknown as Control<FieldValues>}
          register={register as unknown as UseFormRegister<FieldValues>}
          errors={errors as FieldErrors<FieldValues>}
          watch={watch as unknown as UseFormWatch<FieldValues>}
          setValue={setValue as unknown as UseFormSetValue<FieldValues>}
          removeBranch={() => removeBranch(index)}
          openMapPicker={openMapPicker}
        />
      ))}
    </div>
  );
}
