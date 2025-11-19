
"use client";

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { MaintenanceVisit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Accordion } from '@/components/ui/accordion';

import { VisitDetailsSection } from './_form-sections/VisitDetailsSection';
import { ProblemDiagnosisSection } from './_form-sections/ProblemDiagnosisSection';
import { ServicesAndPartsSection } from './_form-sections/ServicesAndPartsSection';
import { TechnicianDelaySection } from './_form-sections/TechnicianDelaySection';
import { NonResolutionSection } from './_form-sections/NonResolutionSection';
import { FollowUpScheduleSection } from './_form-sections/FollowUpScheduleSection';
import { ProblemReasonSelector } from './_components/ProblemReasonSelector';
import { SparePartSelector } from './_components/SparePartSelector';

const sparePartSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    quantity: z.number(),
    price: z.number().optional(),
    paidBy: z.enum(['Client', 'Company'])
});

const maintenanceServiceSchema = z.object({
  name: z.string().min(1, "Service name is required."),
  cost: z.number().min(0, "Cost must be non-negative."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  paidBy: z.enum(['Client', 'Company']),
});

export const visitOutcomeSchema = z.object({
  actualArrivalDate: z.date().optional().nullable(),
  scheduledDate: z.string().optional(),
  delayDays: z.number().optional(),
  delayReason: z.string().optional(),
  isSignificantDelay: z.boolean().optional(),
  resolutionDate: z.date().optional().nullable(),
  technicianName: z.string().min(1, "Technician name is required."),
  baristaRecommendations: z.string().optional(),
  overallReport: z.string().optional(),
  problemOccurred: z.boolean().default(false),
  problemReasons: z.array(z.object({ reason: z.string() })).optional(),
  resolutionStatus: z.enum(['solved', 'partial', 'not_solved', 'waiting_parts']).optional(),
  nonResolutionReason: z.string().optional(),
  partialResolutionNotes: z.string().optional(),
  partsChanged: z.boolean().default(false),
  spareParts: z.array(sparePartSchema).optional(),
  services: z.array(maintenanceServiceSchema).optional(),
  laborCost: z.number().optional(),
  reportSignedBy: z.string().optional(),
  supervisorWitness: z.string().optional(),
});

export type VisitOutcomeFormData = z.infer<typeof visitOutcomeSchema>;

interface MaintenanceVisitOutcomeFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    visit: MaintenanceVisit | null;
    onFormSubmit: (visitId: string, data: Partial<MaintenanceVisit>) => void;
}

export function MaintenanceVisitOutcomeForm({ isOpen, onOpenChange, visit, onFormSubmit }: MaintenanceVisitOutcomeFormProps) {
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isReasonSelectorOpen, setIsReasonSelectorOpen] = useState(false);
    const [isPartSelectorOpen, setIsPartSelectorOpen] = useState(false);
    const [partSelectorCallback, setPartSelectorCallback] = useState<(part: { name: string; price: number }) => void>(() => () => {});

    const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<VisitOutcomeFormData>({
        resolver: zodResolver(visitOutcomeSchema),
        defaultValues: {
            problemOccurred: false,
            partsChanged: false,
            resolutionStatus: undefined,
            delayDays: 0,
            problemReasons: [],
            spareParts: [],
            services: [],
        }
    });

    const watchProblemOccurred = watch('problemOccurred');

    const resetForm = useCallback(() => {
        reset({
            actualArrivalDate: null,
            scheduledDate: '',
            delayDays: 0,
            delayReason: '',
            isSignificantDelay: false,
            resolutionDate: null,
            technicianName: '',
            baristaRecommendations: '',
            overallReport: '',
            problemOccurred: false,
            problemReasons: [],
            resolutionStatus: undefined,
            nonResolutionReason: '',
            partialResolutionNotes: '',
            partsChanged: false,
            spareParts: [],
            services: [],
            reportSignedBy: '',
            supervisorWitness: '',
        });
    }, [reset]);

    useEffect(() => {
        if (isOpen && visit) {
            const actualArrivalDateValue = visit.actualArrivalDate && (typeof visit.actualArrivalDate === 'string' ? parseISO(visit.actualArrivalDate) : visit.actualArrivalDate);
            const resolutionDateValue = visit.resolutionDate && (typeof visit.resolutionDate === 'string' ? parseISO(visit.resolutionDate) : visit.resolutionDate);
            
            reset({
                actualArrivalDate: actualArrivalDateValue && isValid(actualArrivalDateValue) ? actualArrivalDateValue : null,
                scheduledDate: visit.scheduledDate ? (typeof visit.scheduledDate === 'string' ? visit.scheduledDate : visit.scheduledDate.toISOString()) : (visit.date ? (typeof visit.date === 'string' ? visit.date : visit.date.toISOString()) : ''),
                delayDays: visit.delayDays || 0,
                delayReason: visit.delayReason || '',
                isSignificantDelay: visit.isSignificantDelay || false,
                resolutionDate: resolutionDateValue && isValid(resolutionDateValue) ? resolutionDateValue : null,
                technicianName: visit.technicianName,
                baristaRecommendations: visit.baristaRecommendations,
                overallReport: visit.overallReport,
                problemOccurred: visit.problemOccurred,
                problemReasons: visit.problemReason?.map(r => ({ reason: r })) || [],
                resolutionStatus: visit.resolutionStatus,
                nonResolutionReason: visit.nonResolutionReason || '',
                partialResolutionNotes: '',
                partsChanged: !!visit.spareParts && visit.spareParts.length > 0,
                spareParts: visit.spareParts?.map(p => ({...p, paidBy: p.paidBy || 'Client'})) || [],
                services: visit.services?.map(s => ({...s, paidBy: s.paidBy || 'Company'})) || [],
                reportSignedBy: visit.reportSignedBy || '',
                supervisorWitness: '',
            });
        } else if (!isOpen) {
            resetForm();
        }
    }, [visit, isOpen, reset, resetForm]);

    const onSubmit = async (data: VisitOutcomeFormData) => {
        if (!visit) return;
        setIsSaving(true);
        try {
            // Auto-derive problemSolved from resolutionStatus
            const problemSolved = data.resolutionStatus === 'solved';
            
            const submissionData: Partial<MaintenanceVisit> = {
                ...data,
                problemReason: data.problemReasons?.map(r => r.reason),
            };
            onFormSubmit(visit.id, submissionData);
            setIsSaving(false);
            onOpenChange(false);
        } catch (error) {
            console.error("Error during submission:", error);
            toast({
                title: "Submission Error",
                description: "Failed to save data. Please try again.",
                variant: "destructive",
            });
            setIsSaving(false);
        }
    };

    const clientName = visit ? (companies.find(c => c.id === visit.branchId)?.name || 'N/A') : 'N/A';
    
    const visitDate = visit?.date ? (typeof visit.date === 'string' ? parseISO(visit.date) : visit.date) : null;

    const openPartSelector = (onSelectCallback: (part: { name: string; price: number }) => void) => {
        setPartSelectorCallback(() => onSelectCallback);
        setIsPartSelectorOpen(true);
    };

    return (
        <>
            <ProblemReasonSelector
                isOpen={isReasonSelectorOpen}
                onOpenChange={setIsReasonSelectorOpen}
                selectedReasons={watch("problemReasons")?.map(r => r.reason) || []}
                onSelect={(reason) => {
                    const currentReasons = watch("problemReasons")?.map(r => r.reason) || [];
                    if (!currentReasons.includes(reason)) {
                        setValue('problemReasons', [...(watch("problemReasons") || []), {reason}]);
                    }
                }}
            />

            <SparePartSelector
                isOpen={isPartSelectorOpen}
                onOpenChange={setIsPartSelectorOpen}
                onSelect={partSelectorCallback}
            />

            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[90vh] md:max-w-4xl flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle>Log Visit Outcome for {clientName}</DialogTitle>
                        <DialogDescription>Scheduled for {visitDate && isValid(visitDate) ? format(visitDate, 'PPP') : 'N/A'}.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                        <form id="visit-outcome-form" onSubmit={handleSubmit(onSubmit)}>
                             <div className="space-y-6">
                                <Accordion type="multiple" defaultValue={['details', 'delay', 'diagnosis']} className="w-full space-y-4">
                                    <VisitDetailsSection control={control} register={register} errors={errors} />
                                    
                                    <TechnicianDelaySection
                                        control={control}
                                        watch={watch}
                                        setValue={setValue}
                                    />
                                    
                                    <ProblemDiagnosisSection
                                        control={control}
                                        watch={watch}
                                        setValue={setValue}
                                        onOpenReasonSelector={() => setIsReasonSelectorOpen(true)}
                                    />
                                    
                                    {watchProblemOccurred && (
                                        <ServicesAndPartsSection
                                            control={control}
                                            register={register}
                                            setValue={setValue}
                                            onOpenPartSelector={openPartSelector}
                                        />
                                    )}
                                    
                                    <NonResolutionSection
                                        control={control}
                                        watch={watch}
                                        setValue={setValue}
                                    />
                                    
                                    <FollowUpScheduleSection
                                        control={control}
                                        watch={watch}
                                        visit={visit}
                                    />
                                </Accordion>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t">
                       <div className="w-full flex justify-end">
                            <Button type="submit" form="visit-outcome-form" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Record
                            </Button>
                       </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
