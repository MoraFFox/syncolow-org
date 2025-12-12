
"use client";

import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useForm, useFieldArray, Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch, FieldValues } from "react-hook-form";
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
import { PlusCircle } from 'lucide-react';
import { LocationPickerDialog } from '../[companyId]/_components/location-picker-dialog';
import type { Company, Branch, Barista } from "@/lib/types";
import { useCompanyStore } from '@/store/use-company-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BranchSubForm } from './branch-sub-form';
import { Step1_CompanyDetails } from './_wizard-steps/Step1_CompanyDetails';

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  position: z.string().optional(),
  phoneNumbers: z.array(z.object({ number: z.string().optional() })).optional(),
});

const branchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Branch name is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  location: z.string().nullable().optional(),
  warehouseLocation: z.string().optional().nullable(),
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
  baristas: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
    notes: z.string().optional(),
  })).optional().default([]),
  contacts: z.array(contactSchema).optional().default([]),
  warehouseContacts: z.array(contactSchema).optional().default([]),
  region: z.enum(['A', 'B', 'Custom']).optional().default('A'),
  area: z.string().optional(),
  performanceScore: z.number().optional().default(0),
  taxNumber: z.string().nullable().optional(),
  maintenanceLocation: z.enum(['inside_cairo', 'outside_cairo', 'sahel']).nullable().optional(),
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required."),
  taxNumber: z.string().nullable().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  location: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  contacts: z.array(contactSchema).optional(),
  branches: z.array(branchSchema).optional(),
  paymentMethod: z.enum(['transfer', 'check']).optional(),
  paymentDueType: z.enum(['immediate', 'days_after_order', 'monthly_date', 'bulk_schedule']).optional(),
  paymentDueDays: z.number().nullable().optional().or(z.nan().transform(() => null)),
  paymentDueDate: z.number().nullable().optional().or(z.nan().transform(() => null)),
  bulkPaymentSchedule: z.object({
    frequency: z.enum(['monthly', 'quarterly', 'semi-annually', 'annually', 'custom']).optional(),
    dayOfMonth: z.number().optional().or(z.nan().transform(() => undefined)),
    customDates: z.array(z.string()).optional(),
  }).optional(),
  maintenanceLocation: z.enum(['inside_cairo', 'outside_cairo', 'sahel']).nullable().optional(),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
});

export type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>, branches?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[] })[]) => Promise<any>;
  company?: Partial<Company & { branches?: Partial<Branch>[] }> | null;
  initialAccordionState?: 'companyDetails' | 'contacts' | 'branches';
}

import { ContactsSubForm } from './contacts-sub-form';


function ProductFormContent({ company, onSubmit, onCancel, isEmbedded = false, initialAccordionState = 'companyDetails' }: Omit<CompanyFormProps, 'isOpen' | 'onOpenChange'> & { onCancel: () => void, isEmbedded?: boolean }) {
  const { fetchBranchesForCompany } = useCompanyStore();
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: 'onBlur',
    defaultValues: {
      branches: [],
      contacts: [],
      location: null,
      email: '',
      name: '',
      taxNumber: '',
      area: undefined,
      region: 'A',
    }
  });

  // Form errors are handled by react-hook-form's error display

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "branches",
  });

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<{ type: 'company' | 'branch' | 'warehouse' | 'singleWarehouse', index?: number } | null>(null);

  const watchBranches = watch('branches');

  useEffect(() => {
    const initializeForm = async () => {
      if (company) {
        const existingBranches = company.id ? await fetchBranchesForCompany(company.id) : [];

        const initialData: Partial<CompanyFormData> = {
          name: company.name,
          taxNumber: company.taxNumber,
          email: company.email,
          location: company.location,
          area: company.area,
          region: company.region,
          contacts: company.contacts || [],
          branches: existingBranches.map(b => ({
            ...b,
            area: b.area,
            contacts: b.contacts || [],
            location: b.location || null,
            baristas: b.baristas || [],
            warehouseContacts: b.warehouseContacts || [],
            region: b.region || 'A',
            performanceScore: b.performanceScore || 0,
            machineOwned: b.machineOwned || false,
            machineLeased: b.machineLeased,
            leaseMonthlyCost: b.leaseMonthlyCost,
          })),
          paymentMethod: company.paymentMethod,
          paymentDueType: company.paymentDueType,
          paymentDueDays: company.paymentDueDays,
          paymentDueDate: company.paymentDueDate,
          bulkPaymentSchedule: company.bulkPaymentSchedule ? {
            frequency: company.bulkPaymentSchedule.frequency,
            dayOfMonth: company.bulkPaymentSchedule.dayOfMonth,
            customDates: company.bulkPaymentSchedule.customDates || [],
          } : undefined,
          maintenanceLocation: company.maintenanceLocation,
          machineLeased: company.machineLeased,
        };

        reset(initialData);
        replace(initialData.branches || []);
      } else {
        // Try to restore from sessionStorage
        const savedData = sessionStorage.getItem('companyFormDraft');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          reset(parsedData);
          replace(parsedData.branches || []);
        } else {
          reset({
            name: '', taxNumber: '', email: '', location: null, area: undefined, region: 'A', contacts: [], branches: [],
          });
          replace([]);
        }
      }
    };
    initializeForm();
  }, [company, reset, replace, fetchBranchesForCompany]);

  // Auto-save to sessionStorage
  useEffect(() => {
    if (!company) {
      const subscription = watch((data) => {
        sessionStorage.setItem('companyFormDraft', JSON.stringify(data));
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, company]);

  const handleFormSubmit = async (data: CompanyFormData) => {
    try {
      const companyToSubmit: Partial<Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>> = {
        name: data.name,
        location: data.location === '' ? null : data.location,
        region: data.region || 'A',
        contacts: (data.contacts || []) as Company['contacts'],
        createdAt: company?.createdAt || new Date().toISOString(),
        industry: company?.industry || 'Unknown',
        machineOwned: company?.machineOwned || false,
      };

      if (data.taxNumber) companyToSubmit.taxNumber = data.taxNumber;
      if (data.email && data.email !== '') companyToSubmit.email = data.email;
      if (data.area) companyToSubmit.area = data.area;
      if (data.maintenanceLocation) companyToSubmit.maintenanceLocation = data.maintenanceLocation;
      if (data.machineLeased !== undefined) companyToSubmit.machineLeased = data.machineLeased;

      if (data.paymentMethod) companyToSubmit.paymentMethod = data.paymentMethod;
      if (data.paymentDueType) companyToSubmit.paymentDueType = data.paymentDueType;
      if (data.paymentDueDays !== undefined && data.paymentDueDays !== null) companyToSubmit.paymentDueDays = data.paymentDueDays;
      if (data.paymentDueDate !== undefined && data.paymentDueDate !== null && !isNaN(data.paymentDueDate)) companyToSubmit.paymentDueDate = data.paymentDueDate;
      if (data.bulkPaymentSchedule && data.bulkPaymentSchedule.frequency) {
        const schedule: Company['bulkPaymentSchedule'] = {
          frequency: data.bulkPaymentSchedule.frequency,
        };
        if (data.bulkPaymentSchedule.dayOfMonth !== undefined && data.bulkPaymentSchedule.dayOfMonth !== null && !isNaN(data.bulkPaymentSchedule.dayOfMonth)) {
          schedule.dayOfMonth = data.bulkPaymentSchedule.dayOfMonth;
        }
        if (data.bulkPaymentSchedule.customDates && data.bulkPaymentSchedule.customDates.length > 0) {
          schedule.customDates = data.bulkPaymentSchedule.customDates.filter(d => d && d.trim() !== '');
        }
        companyToSubmit.bulkPaymentSchedule = schedule;
      }

      const branchesToSubmit = data.branches?.map(b => ({
        ...b,
        location: b.location === '' ? null : b.location, // Ensure location is null for empty string
        performanceScore: b.performanceScore || 0, // Ensure performanceScore is defined
        region: b.region || 'A', // Ensure region is defined
        baristas: b.baristas?.map(barista => ({ ...barista, rating: barista.rating || 0 })) || [],
        contacts: b.contacts || [],
        warehouseContacts: b.warehouseContacts || [],
      }));

      await onSubmit(companyToSubmit as Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>, branchesToSubmit as (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[] })[]);

      // Clear draft on successful submission
      if (!company) {
        sessionStorage.removeItem('companyFormDraft');
      }

      if (!isEmbedded) {
        onCancel(); // Close dialog if not embedded
      }
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Failed to save company. Please try again.',
        variant: 'destructive',
      });
    }
  }

  const openMapPicker = (type: 'company' | 'branch' | 'warehouse' | 'singleWarehouse', index?: number) => {
    setEditingAddress({ type, index });
    setIsMapOpen(true);
  };

  const handleConfirmLocation = (newAddress: string) => {
    if (editingAddress) {
      if (editingAddress.type === 'company') {
        setValue('location', newAddress, { shouldDirty: true });
      } else if (editingAddress.type === 'branch' && editingAddress.index !== undefined) {
        setValue(`branches.${editingAddress.index}.location`, newAddress, { shouldDirty: true });
      } else if (editingAddress.type === 'warehouse' && editingAddress.index !== undefined) {
        setValue(`branches.${editingAddress.index}.warehouseLocation`, newAddress, { shouldDirty: true });
      }
    }
  };

  const getInitialAddress = () => {
    if (!editingAddress) return '';
    if (editingAddress.type === 'company') {
      return watch('location') ?? ''; // Use nullish coalescing
    }
    if (editingAddress.type === 'branch' && editingAddress.index !== undefined) {
      return watch(`branches.${editingAddress.index}.location`) ?? ''; // Use nullish coalescing
    }
    if (editingAddress.type === 'warehouse' && editingAddress.index !== undefined) {
      return watch(`branches.${editingAddress.index}.warehouseLocation`) ?? ''; // Use nullish coalescing
    }
    return '';
  }

  const formContent = (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Accordion type="multiple" defaultValue={[initialAccordionState]} className="w-full space-y-4">
        <AccordionItem value="companyDetails">
          <AccordionTrigger className="text-lg font-semibold">Company Details</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <Step1_CompanyDetails
              control={control as unknown as Control<FieldValues>}
              register={register as unknown as UseFormRegister<FieldValues>}
              errors={errors as FieldErrors<FieldValues>}
              openMapPicker={openMapPicker}
              setValue={setValue as unknown as UseFormSetValue<FieldValues>}
              isWizard={true}
              watch={watch as unknown as UseFormWatch<FieldValues>}
              isEditMode={!!company}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="contacts">
          <AccordionTrigger className="text-lg font-semibold">Contacts</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <ContactsSubForm control={control as any} register={register as any} errors={errors as any} fieldNamePrefix="contacts" setValue={setValue} title="Company Contacts" description="Main contacts for the parent company." />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="branches">
          <AccordionTrigger className="text-lg font-semibold">Branches</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {(watchBranches && watchBranches.length > 0) ? (
              fields.map((field, index) => (
                <BranchSubForm
                  key={field.id}
                  index={index}
                  register={register as any}
                  control={control as any}
                  errors={errors as any}
                  watch={watch as any}
                  setValue={setValue as any}
                  removeBranch={() => remove(index)}
                  openMapPicker={openMapPicker}
                />
              ))
            ) : company?.id ? (
              <p className="text-sm text-muted-foreground text-center py-4">This company has no branches. Add one below.</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Use this section to add one or more branches.</p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({ name: '', email: '', location: null, machineOwned: false, contacts: [], warehouseContacts: [], baristas: [], region: 'A', performanceScore: 0 } as any)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <DialogFooter className="mt-6">
        {Object.keys(errors).length > 0 && (
          <div className="mr-auto text-left max-w-md">
            <p className="text-sm font-medium text-destructive mb-1">
              Please fix the following errors:
            </p>
            <ul className="text-xs text-destructive space-y-0.5">
              {errors.name && <li>• Company name: {errors.name.message}</li>}
              {errors.email && <li>• Email: {errors.email.message}</li>}
              {errors.location && <li>• Location: {errors.location.message}</li>}
              {errors.branches && Array.isArray(errors.branches) && errors.branches.map((branchError, idx) => {
                if (!branchError) return null;
                const errorMessages = [];
                if (branchError.name?.message) errorMessages.push(branchError.name.message);
                if (branchError.location?.message) errorMessages.push(branchError.location.message);
                if (branchError.email?.message) errorMessages.push(branchError.email.message);
                if (branchError.leaseMonthlyCost?.message) errorMessages.push(`Lease Cost: ${branchError.leaseMonthlyCost.message}`);
                if (errorMessages.length === 0) errorMessages.push('has validation errors');
                return <li key={idx}>• Branch {idx + 1}: {errorMessages.join(', ')}</li>;
              })}
              {errors.contacts && <li>• Check contact details for errors</li>}
              {errors.contacts && <li>• Check contact details for errors</li>}
              {/* Show all other errors dynamically */}
              {Object.entries(errors).map(([key, error]) => {
                if (['name', 'email', 'location', 'branches', 'contacts'].includes(key)) return null;
                return (
                  <li key={key}>
                    • {key}: {(error as any)?.message || 'Invalid value'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (company ? 'Save Changes' : 'Save Company')}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      <LocationPickerDialog
        isOpen={isMapOpen}
        onOpenChange={setIsMapOpen}
        initialAddress={getInitialAddress()}
        onConfirm={handleConfirmLocation}
      />
      {isEmbedded ? (
        <div className="p-1">{formContent}</div>
      ) : (
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {company ? 'Update company details and manage its branches.' : 'Enter the details for the new company and its branches.'}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      )}
    </>
  );
}

export function CompanyForm({ isOpen, onOpenChange, onSubmit, company, initialAccordionState }: CompanyFormProps) {
  if (isOpen && !onOpenChange) {
    return <ProductFormContent company={company} onSubmit={onSubmit} onCancel={() => { }} isEmbedded={true} initialAccordionState={initialAccordionState} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <ProductFormContent company={company} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} initialAccordionState={initialAccordionState} />
    </Dialog>
  );
}
