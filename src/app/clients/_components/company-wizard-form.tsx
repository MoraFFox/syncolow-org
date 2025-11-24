
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Loader2, MapPin } from 'lucide-react';
import type { Company, MaintenanceVisit, Barista, Contact } from '@/lib/types';
import { LocationPickerDialog } from '@/app/clients/[companyId]/_components/location-picker-dialog';
import { Progress } from '@/components/ui/progress';

import { Step1_CompanyDetails } from './_wizard-steps/Step1_CompanyDetails';
import { Step2_CompanyStructure } from './_wizard-steps/Step2_CompanyStructure';
import { Step3_BranchOrFinal } from './_wizard-steps/Step3_BranchOrFinal';
import { Step4_BranchForms } from './_wizard-steps/Step4_BranchForms';
import { useCompanyStore } from '@/store/use-company-store';

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  position: z.string().min(1, "Position is required."),
  phoneNumbers: z.array(z.object({ number: z.string().min(1, "Phone number cannot be empty.") })),
});

const baristaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone is required"),
  rating: z.number().min(1).max(5).default(3),
  notes: z.string().optional(),
});

const maintenancePartSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  price: z.preprocess(v => parseFloat(v as string), z.number().min(0)),
  paidByClient: z.boolean().default(false),
});

const maintenanceHistorySchema = z.object({
  date: z.date(),
  technicianName: z.string().min(1, "Technician name required"),
  visitType: z.enum(["customer_request", "periodic"]),
  maintenanceNotes: z.string().min(1, "Notes are required"),
  spareParts: z.array(maintenancePartSchema).optional(),
  baristaId: z.string().optional(),
  reportSignedBy: z.string().min(1, "Signature is required"),
});

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  email: z.string().email().optional().or(z.literal('')),
  location: z.string().min(1, "Location is required"),
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
  taxNumber: z.string().optional(),
  warehouseContacts: z.array(contactSchema).optional(),
  warehouseLocation: z.string().optional(),
  baristas: z.array(baristaSchema).optional(),
  maintenanceHistory: z.array(maintenanceHistorySchema).optional(),
  contacts: z.array(contactSchema).optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  area: z.string().optional(),
});

const companyWizardSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email().optional().or(z.literal('')),
  taxNumber: z.string().optional(),
  location: z.string().optional(),
  area: z.string().optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  contacts: z.array(contactSchema).optional(),
  hasBranches: z.enum(["yes", "no"]),
  branchCount: z.number().min(0).optional(),
  branches: z.array(branchSchema).optional(),
  // Fields for single entity
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
  warehouseContacts: z.array(contactSchema).optional(),
  warehouseLocation: z.string().optional(),
  // Payment Configuration
  paymentMethod: z.enum(['transfer', 'check']).default('transfer'),
  paymentDueType: z.enum(['immediate', 'days_after_order', 'monthly_date']).default('days_after_order'),
  paymentDueDays: z.number().min(1).max(365).optional(),
  paymentDueDate: z.number().min(1).max(31).optional(),
}).refine((data) => {
  if (data.paymentDueType === 'days_after_order' && !data.paymentDueDays) {
    return false;
  }
  if (data.paymentDueType === 'monthly_date' && !data.paymentDueDate) {
    return false;
  }
  return true;
}, {
  message: "Payment due days or date is required based on payment type",
  path: ['paymentDueDays'],
});

export type CompanyWizardFormData = z.infer<typeof companyWizardSchema>;

interface CompanyWizardFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const TOTAL_STEPS = 4;

export function CompanyWizardForm({ isOpen, onOpenChange }: CompanyWizardFormProps) {
    const [step, setStep] = useState(1);
    const { addCompanyAndRelatedData } = useCompanyStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<{ type: 'company' | 'branch' | 'warehouse' | 'singleWarehouse', index?: number } | null>(null);

    const { register, handleSubmit, control, watch, setValue, getValues, trigger, reset, formState: { errors } } = useForm<CompanyWizardFormData>({
        resolver: zodResolver(companyWizardSchema),
        defaultValues: { 
            hasBranches: 'no', 
            branches: [], 
            contacts: [], 
            region: 'A',
            paymentMethod: 'transfer',
            paymentDueType: 'days_after_order',
            paymentDueDays: 30,
        },
    });
    
    const { fields, replace, remove } = useFieldArray({ control, name: "branches" });

    const watchHasBranches = watch('hasBranches');
    const watchBranchCount = watch('branchCount');

    useEffect(() => {
        if (watchHasBranches === 'yes' && watchBranchCount && watchBranchCount > 0) {
            const currentBranches = getValues('branches') || [];
            if (currentBranches.length !== watchBranchCount) {
                const newBranches = Array.from({ length: watchBranchCount }, () => ({ 
                    name: '', email: '', location: '', machineOwned: false,
                    baristas: [], maintenanceHistory: [], contacts: [], warehouseContacts: [], warehouseLocation: '' 
                }));
                replace(newBranches);
            }
        } else if (watchHasBranches === 'no') {
            replace([]);
        }
    }, [watchHasBranches, watchBranchCount, replace, getValues]);

    const nextStep = async () => {
      let isValid = true;
      if (step === 1) isValid = await trigger(["name", "email", "contacts"]);
      if (step === 2) isValid = await trigger(["hasBranches"]);
      if (step === 3 && getValues('hasBranches') === 'yes') isValid = await trigger(["branchCount"]);
      
      if(isValid) setStep(s => s + 1);
    };
    const prevStep = () => setStep(s => s - 1);

    const onSubmit = async (data: CompanyWizardFormData) => {
        setIsSubmitting(true);
        const { name, email, taxNumber, location, area, region, contacts, branches, paymentMethod, paymentDueType, paymentDueDays, paymentDueDate, ...singleEntityData } = data;
        let finalBranches = branches;

        if (data.hasBranches === 'no') {
            finalBranches = [{
                name: name,
                email: email || '',
                location: location || 'N/A',
                machineOwned: singleEntityData.machineOwned,
                machineLeased: singleEntityData.machineLeased,
                taxNumber: taxNumber,
                baristas: [],
                maintenanceHistory: [],
                contacts: contacts,
                warehouseContacts: singleEntityData.warehouseContacts,
                warehouseLocation: singleEntityData.warehouseLocation,
                region: region,
                area: area,
            }];
        }
        
        const companyData: Partial<Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>> = {
            name: name,
            email: email,
            taxNumber: taxNumber,
            location: location,
            area: area,
            region: region || 'A',
            contacts: contacts || [],
            industry: 'Default',
            machineOwned: false,
            createdAt: new Date().toISOString(),
            paymentMethod: paymentMethod,
            paymentDueType: paymentDueType,
            paymentDueDays: paymentDueDays,
            paymentDueDate: paymentDueDate,
        };

        const branchesWithDetails = finalBranches?.map(b => ({
            ...b,
            maintenanceHistory: b.maintenanceHistory?.map(mh => ({...mh, date: mh.date.toISOString()})) as unknown as MaintenanceVisit[],
        }));
        
        try {
            await addCompanyAndRelatedData(companyData as any, branchesWithDetails as any);
            onOpenChange(false);
            setStep(1);
            reset();
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = (open: boolean) => {
        if (!open) {
            setStep(1);
            reset();
        }
        onOpenChange(open);
    }
    
    const openMapPicker = (type: 'company' | 'branch' | 'warehouse' | 'singleWarehouse', index?: number) => {
        setEditingAddress({ type, index });
        setIsMapOpen(true);
    };

    const handleConfirmLocation = (newAddress: string) => {
        if (editingAddress) {
            if (editingAddress.type === 'company') {
                setValue('location', newAddress, { shouldValidate: true, shouldDirty: true });
            } else if (editingAddress.type === 'branch' && editingAddress.index !== undefined) {
                setValue(`branches.${editingAddress.index}.location`, newAddress, { shouldValidate: true, shouldDirty: true });
            } else if (editingAddress.type === 'warehouse' && editingAddress.index !== undefined) {
                 setValue(`branches.${editingAddress.index}.warehouseLocation`, newAddress, { shouldValidate: true, shouldDirty: true });
            } else if (editingAddress.type === 'singleWarehouse') {
                setValue('warehouseLocation', newAddress, { shouldValidate: true, shouldDirty: true });
            }
        }
    };
    
    const getInitialAddressForMap = () => {
        if (!editingAddress) return '';
        if (editingAddress.type === 'company') return watch('location') || '';
        if (editingAddress.type === 'singleWarehouse') return watch('warehouseLocation') || '';
        if (editingAddress.index !== undefined) {
            if (editingAddress.type === 'branch') {
                return watch(`branches.${editingAddress.index}.location`);
            }
            if (editingAddress.type === 'warehouse') {
                 return watch(`branches.${editingAddress.index}.warehouseLocation`) || '';
            }
        }
        return '';
    }

    const totalSteps = watchHasBranches === 'yes' ? 4 : 3;
    const progressValue = (step / totalSteps) * 100;
    
    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1_CompanyDetails control={control} register={register} errors={errors} openMapPicker={openMapPicker} setValue={setValue} watch={watch}/>;
            case 2:
                return <Step2_CompanyStructure control={control} />;
            case 3:
                return <Step3_BranchOrFinal control={control} register={register} errors={errors} watch={watch} openMapPicker={openMapPicker} setValue={setValue} />;
            case 4:
                return <Step4_BranchForms fields={fields} control={control} register={register} errors={errors} watch={watch} setValue={setValue} removeBranch={remove} openMapPicker={openMapPicker} />;
            default: return null;
        }
    }
    
    const isFinalStep = step === totalSteps;

    return (
        <>
            <LocationPickerDialog 
                isOpen={isMapOpen}
                onOpenChange={setIsMapOpen}
                initialAddress={getInitialAddressForMap()}
                onConfirm={handleConfirmLocation}
            />
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 pb-0">
                         <DialogTitle>Step {step}: {
                             step === 1 ? 'Company Details' :
                             step === 2 ? 'Company Structure' :
                             step === 3 && watchHasBranches === 'yes' ? 'Branch Information' :
                             step === 3 && watchHasBranches === 'no' ? 'Final Details' : 'Enter Branch Details'
                         }</DialogTitle>
                        <DialogDescription>
                            { step === 1 ? "Enter the main information for the parent company." :
                              step === 2 ? "Does this company have separate branches or locations?" :
                              step === 3 && watchHasBranches === 'yes' ? "How many branches does this company have?" :
                              step === 3 && watchHasBranches === 'no' ? `Provide machine and warehouse details for ${getValues('name')}.` :
                              `Provide the details for each of the ${fields.length} branches.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Progress value={progressValue} className="mx-6 w-auto" />

                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {renderStep()}
                    </div>
                    

                    <DialogFooter className="px-6 pb-6 pt-3 border-t">
                        <div className="w-full flex justify-between items-center">
                            <Button variant="outline" onClick={prevStep} disabled={step === 1 || isSubmitting}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            
                            <div className="text-sm text-muted-foreground">
                                Step {step} of {totalSteps}
                            </div>

                            {isFinalStep ? (
                                <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit
                                </Button>
                            ) : (
                                <Button onClick={nextStep}>
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
