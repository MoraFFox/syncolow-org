"use client";

import { useFieldArray, Control, UseFormRegister, FieldErrors, UseFormSetValue, Controller } from "react-hook-form";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { PhoneNumberInput } from '@/components/ui/phone-input';
import { Combobox } from '@/components/ui/combo-box';

const POSITION_OPTIONS = [
  { label: 'Operation Manager', value: 'Operation Manager' },
  { label: 'Branch Manager', value: 'Branch Manager' },
  { label: 'Chief', value: 'Chief' },
  { label: 'Sales Manager', value: 'Sales Manager' },
  { label: 'Owner', value: 'Owner' },
  { label: 'Barista', value: 'Barista' },
];

export function PhoneNumbersSubForm({ control, register, contactFieldNamePrefix }: {
  control: Control<any>, register: UseFormRegister<any>, errors: FieldErrors<any>, contactFieldNamePrefix: string
}) {
  const { fields, append, remove } = useFieldArray({ control, name: `${contactFieldNamePrefix}.phoneNumbers` as any });
  
  return (
    <div className="space-y-2">
        <Label>Phone Numbers</Label>
        {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
                <PhoneNumberInput {...register(`${contactFieldNamePrefix}.phoneNumbers.${index}.number` as any)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-4 w-4"/>
                </Button>
            </div>
        ))}
         <Button type="button" variant="outline" size="sm" onClick={() => append({ number: '' } as any)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Phone
        </Button>
    </div>
  )
}

export function ContactsSubForm({ control, register, errors, setValue, fieldNamePrefix, title, description }: {
  control: Control<any>, register: UseFormRegister<any>, errors: FieldErrors<any>, setValue: UseFormSetValue<any>, fieldNamePrefix: string, title: string, description: string
}) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldNamePrefix as any });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
           <Button type="button" variant="secondary" size="sm" onClick={() => append({ name: '', position: '', phoneNumbers: [{ number: '' }] } as any)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
          </Button>
      </div>
      {fields.map((field, index) => (
        <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-muted/30">
           <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-6 w-6">
              <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>Name</Label>
                <Input {...register(`${fieldNamePrefix}.${index}.name` as any)} />
            </div>
             <div className="grid gap-2">
                <Label>Position</Label>
                <div className="flex gap-2">
                     <Input {...register(`${fieldNamePrefix}.${index}.position` as any)} placeholder="Type custom position..." />
                     <Controller
                        name={`${fieldNamePrefix}.${index}.position` as any}
                        control={control}
                        render={({ field: controllerField }) => (
                            <Combobox
                                options={POSITION_OPTIONS}
                                value={controllerField.value}
                                onChange={(value) => setValue(`${fieldNamePrefix}.${index}.position` as any, value as any, { shouldValidate: true, shouldDirty: true })}
                                placeholder="Or select..."
                                searchPlaceholder="Search..."
                                emptyText="No matching position."
                            />
                        )}
                    />
                </div>
            </div>
          </div>
           <PhoneNumbersSubForm control={control} register={register} errors={errors} contactFieldNamePrefix={`${fieldNamePrefix}.${index}`} />
        </div>
      ))}
    </div>
  )
}
