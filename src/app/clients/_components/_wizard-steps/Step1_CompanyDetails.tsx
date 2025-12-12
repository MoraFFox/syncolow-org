"use client";

import type { FieldValues } from 'react-hook-form';
import { Controller, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, PlusCircle, Trash2 } from "lucide-react";
import { ContactsSubForm } from "../contacts-sub-form";
import type { CompanyFormProps } from '@/types/forms';
import type { FieldError } from 'react-hook-form';

/** Helper to safely get error message from FieldErrors */
function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as FieldError).message;
  }
  return undefined;
}

interface CustomDatesFieldProps {
  control: CompanyFormProps['control'];
  register: CompanyFormProps['register'];
}

function CustomDatesField({ control, register }: CustomDatesFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "bulkPaymentSchedule.customDates",
  });

  return (
    <div className='grid gap-2'>
      <Label>Custom Payment Dates (Recurring Annually)</Label>
      <p className='text-sm text-muted-foreground mb-2'>
        Add dates that repeat every year (MM-DD format)
      </p>
      {fields.map((field, index) => (
        <div key={field.id} className='flex items-center gap-2'>
          <Input
            placeholder='MM-DD (e.g., 01-15)'
            {...register(`bulkPaymentSchedule.customDates.${index}`)}
            maxLength={5}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => remove(index)}
            disabled={fields.length <= 1}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
          {index === fields.length - 1 && (
            <Button
              type='button'
              variant='outline'
              size='icon'
              onClick={() => append("")}
            >
              <PlusCircle className='h-4 w-4' />
            </Button>
          )}
        </div>
      ))}
      {fields.length === 0 && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => append("")}
        >
          <PlusCircle className='h-4 w-4 mr-2' />
          Add Date
        </Button>
      )}
      <p className='text-xs text-muted-foreground'>
        Example: 01-01 (Jan 1), 08-01 (Aug 1)
      </p>
    </div>
  );
}

export function Step1_CompanyDetails(props: CompanyFormProps) {
  const {
    control,
    register,
    errors,
    openMapPicker,
    setValue,
    watch,
    isWizard = true,
    isEditMode = false,
  } = props;
  const watchRegion = watch("region");

  return (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div className='grid gap-2'>
          <Label htmlFor='name'>Company Name</Label>
          <Input
            id='name'
            {...register("name")}
            placeholder='e.g. The Coffee House'
          />
          {errors.name && (
            <p className='text-sm text-destructive'>{getErrorMessage(errors.name)}</p>
          )}
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' {...register("email")} />
            {errors.email && (
              <p className='text-sm text-destructive'>{getErrorMessage(errors.email)}</p>
            )}
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='taxNumber'>Tax Number</Label>
            <Input id='taxNumber' {...register("taxNumber")} />
            {errors.taxNumber && (
              <p className='text-sm text-destructive'>
                {getErrorMessage(errors.taxNumber)}
              </p>
            )}
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='area'>Area</Label>
            <Controller
              name='area'
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select area' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Stores'>Stores</SelectItem>
                    <SelectItem value='Maadi'>Maadi</SelectItem>
                    <SelectItem value='6th October'>6th October</SelectItem>
                    <SelectItem value='Misr Elgadida'>Misr Elgadida</SelectItem>
                    <SelectItem value='Tagamoa'>Tagamoa</SelectItem>
                    <SelectItem value='Down Town'>Down Town</SelectItem>
                    <SelectItem value='Rehab'>Rehab</SelectItem>
                    <SelectItem value='Heliopolis'>Heliopolis</SelectItem>
                    <SelectItem value='Nasr City'>Nasr City</SelectItem>
                    <SelectItem value='Zamalek'>Zamalek</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Delivery Schedule</Label>
            <Controller
              name='region'
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select schedule' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='A'>Schedule A</SelectItem>
                    <SelectItem value='B'>Schedule B</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        {(!watch("branches") || watch("branches")?.length === 0) && (
          <div className='grid gap-2'>
            <Label>Maintenance Location</Label>
            <Controller
              name='maintenanceLocation'
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select maintenance location' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='inside_cairo'>
                      Inside Cairo (500 EGP)
                    </SelectItem>
                    <SelectItem value='outside_cairo'>
                      Outside Cairo (1500 EGP)
                    </SelectItem>
                    <SelectItem value='sahel'>Sahel (4000 EGP)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
        {isEditMode &&
          (!watch("branches") || watch("branches")?.length === 0) && (
            <div className='grid gap-2'>
              <Label>Machine Ownership</Label>
              <div className='flex items-center space-x-2 mb-2'>
                <Controller
                  name='machineOwned'
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id='companyMachineOwned'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor='companyMachineOwned'>
                  Client Owns the Machine
                </Label>
              </div>
              {!watch("machineOwned") && (
                <>
                  <Controller
                    name='machineLeased'
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={(v) => field.onChange(v === "true")}
                        value={String(field.value)}
                        className='flex gap-4'
                      >
                        <Label className='p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer'>
                          <RadioGroupItem value='true' /> Leased
                        </Label>
                        <Label className='p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer'>
                          <RadioGroupItem value='false' /> Bought
                        </Label>
                      </RadioGroup>
                    )}
                  />
                  {watch("machineLeased") && (
                    <div className='grid gap-2 mt-2'>
                      <Label htmlFor='leaseMonthlyCost'>
                        Monthly Lease Cost (EGP)
                      </Label>
                      <Input
                        id='leaseMonthlyCost'
                        type='number'
                        min='0'
                        {...register("leaseMonthlyCost", {
                          valueAsNumber: true,
                        })}
                        placeholder='e.g. 1000'
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        <div className='grid gap-2'>
          <Label>Headquarters Location</Label>
          <Button
            type='button'
            variant='outline'
            onClick={() => openMapPicker?.("company")}
          >
            <MapPin className='mr-2 h-4 w-4' />
            {watch("location") ? "Change Location" : "Set Location on Map"}
          </Button>
          {watch("location") && (
            <p className='text-sm text-muted-foreground truncate'>
              {watch("location")}
            </p>
          )}
          {errors.location && (
            <p className='text-sm text-destructive'>
              {getErrorMessage(errors.location)}
            </p>
          )}
        </div>
      </div>
      {isWizard && (
        <>
          <Separator />
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-medium'>Payment Configuration</h3>
              <p className='text-sm text-muted-foreground'>
                Set payment terms for this company
              </p>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Payment Method</Label>
                <Controller
                  name='paymentMethod'
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select method' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='transfer'>Transfer</SelectItem>
                        <SelectItem value='check'>Check</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Payment Due</Label>
                <Controller
                  name='paymentDueType'
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='immediate'>
                          Immediate (same day)
                        </SelectItem>
                        <SelectItem value='days_after_order'>
                          After order
                        </SelectItem>
                        <SelectItem value='monthly_date'>
                          Monthly on specific date
                        </SelectItem>
                        <SelectItem value='bulk_schedule'>
                          Bulk payment schedule
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            {watch("paymentDueType") === "days_after_order" && (
              <div className='grid gap-2'>
                <Label htmlFor='paymentDueDays'>Days After Order</Label>
                <Input
                  id='paymentDueDays'
                  type='number'
                  min='1'
                  max='365'
                  {...register("paymentDueDays", { valueAsNumber: true })}
                  placeholder='e.g. 30'
                />
                {errors.paymentDueDays && (
                  <p className='text-sm text-destructive'>
                    {getErrorMessage(errors.paymentDueDays)}
                  </p>
                )}
              </div>
            )}
            {watch("paymentDueType") === "monthly_date" && (
              <div className='grid gap-2'>
                <Label htmlFor='paymentDueDate'>Day of Month (1-31)</Label>
                <Input
                  id='paymentDueDate'
                  type='number'
                  min='1'
                  max='31'
                  {...register("paymentDueDate", { valueAsNumber: true })}
                  placeholder='e.g. 15'
                />
                {errors.paymentDueDate && (
                  <p className='text-sm text-destructive'>
                    {getErrorMessage(errors.paymentDueDate)}
                  </p>
                )}
              </div>
            )}
            {watch("paymentDueType") === "bulk_schedule" && (
              <div className='space-y-4'>
                <div className='grid gap-2'>
                  <Label>Payment Frequency</Label>
                  <Controller
                    name='bulkPaymentSchedule.frequency'
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select frequency' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='monthly'>Monthly</SelectItem>
                          <SelectItem value='quarterly'>
                            Quarterly (every 3 months)
                          </SelectItem>
                          <SelectItem value='semi-annually'>
                            Semi-annually (every 6 months)
                          </SelectItem>
                          <SelectItem value='annually'>
                            Annually (once per year)
                          </SelectItem>
                          <SelectItem value='custom'>Custom dates</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {watch("bulkPaymentSchedule.frequency") !== "custom" &&
                  watch("bulkPaymentSchedule.frequency") && (
                    <div className='grid gap-2'>
                      <Label htmlFor='bulkPaymentDayOfMonth'>
                        Day of Month (1-31)
                      </Label>
                      <Input
                        id='bulkPaymentDayOfMonth'
                        type='number'
                        min='1'
                        max='31'
                        {...register("bulkPaymentSchedule.dayOfMonth", {
                          valueAsNumber: true,
                        })}
                        placeholder='e.g. 15'
                      />
                    </div>
                  )}
                {watch("bulkPaymentSchedule.frequency") === "custom" && (
                  <CustomDatesField control={control} register={register} />
                )}
              </div>
            )}
          </div>
          <Separator />
          <ContactsSubForm
            control={control}
            register={register}
            errors={errors}
            fieldNamePrefix='contacts'
            title='Company Contacts'
            description='Main contacts for the parent company.'
            setValue={setValue}
          />
        </>
      )}
    </div>
  );
}
