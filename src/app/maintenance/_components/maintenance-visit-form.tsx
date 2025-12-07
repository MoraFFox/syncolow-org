
"use client";

import { useForm } from 'react-hook-form';
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
import { useState } from 'react';
import { format, isValid } from 'date-fns';
import { Accordion } from '@/components/ui/accordion';
import { useMaintenanceFormState } from '@/hooks/use-maintenance-form-state';
import { useSelectorDialogs } from '@/hooks/use-selector-dialogs';
import { parseDateSafely } from '@/lib/date-utils';

import { VisitDetailsSection } from './_form-sections/VisitDetailsSection';
import { ProblemDiagnosisSection } from './_form-sections/ProblemDiagnosisSection';
import { ServicesAndPartsSection } from './_form-sections/ServicesAndPartsSection';
import { TechnicianDelaySection } from './_form-sections/TechnicianDelaySection';
import { NonResolutionSection } from './_form-sections/NonResolutionSection';
import { FollowUpScheduleSection } from './_form-sections/FollowUpScheduleSection';
import { ProblemReasonSelector } from './_components/ProblemReasonSelector';
import { SparePartSelector } from './_components/SparePartSelector';

import { visitOutcomeSchema, VisitOutcomeFormData } from './maintenance-schemas';

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

    const {
        isReasonSelectorOpen,
        openReasonSelector,
        closeReasonSelector,
        isPartSelectorOpen,
        openPartSelector,
        closePartSelector,
        partSelectorCallback,
    } = useSelectorDialogs();

    useMaintenanceFormState(visit, isOpen, reset);

    const onSubmit = async (data: VisitOutcomeFormData) => {
        if (!visit) return;
        setIsSaving(true);
        try {
            const submissionData: Partial<MaintenanceVisit> = {
                ...data,
                problemReason: data.problemReasons?.map((r) => r.reason),
            };
            onFormSubmit(visit.id, submissionData);
            setIsSaving(false);
            onOpenChange(false);
        } catch (error) {
            toast({
                title: "Submission Error",
                description: "Failed to save data. Please try again.",
                variant: "destructive",
            });
            setIsSaving(false);
        }
    };

    const clientName = visit ? (companies.find((c) => c.id === visit.branchId)?.name || 'N/A') : 'N/A';
    const visitDate = parseDateSafely(visit?.date);

    return (
        <>
            <ProblemReasonSelector
                isOpen={isReasonSelectorOpen}
                onOpenChange={closeReasonSelector}
                selectedReasons={watch("problemReasons")?.map((r) => r.reason) || []}
                onSelect={(reason) => {
                    const currentReasons = watch("problemReasons")?.map((r) => r.reason) || [];
                    if (!currentReasons.includes(reason)) {
                        setValue('problemReasons', [...(watch("problemReasons") || []), { reason }]);
                    }
                }}
            />

            <SparePartSelector
                isOpen={isPartSelectorOpen}
                onOpenChange={closePartSelector}
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
                                        onOpenReasonSelector={openReasonSelector}
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
